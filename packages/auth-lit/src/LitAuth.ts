import { SnowballAuth, SnowballState, StateLoadingAttrs } from '@snowballtools/js-sdk'
import { SnowballError } from '@snowballtools/types'
import { Address } from '@snowballtools/types'

import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers'
import { AuthMethod, IRelayPKP, LIT_NETWORKS_KEYS, SessionSigsMap } from '@lit-protocol/types'

import { MakeAuthOptions } from '../../js-sdk/src'
import { getSessionSigs } from './helpers'
import { BaseProvider, LitAuthClient } from './lit-auth-client'

const ONE_DAY_SECONDS = 60 * 60 * 24

type SessionSigsRecord = {
  version: number
  expiresAt: number
  sessionSigs: SessionSigsMap
  pkpPublicKey: string
}
const RECORD_VERSION = 2

export type LitAuthState = StateLoadingAttrs &
  (
    | { name: 'init' }
    | { name: 'no-session' }
    | { name: 'authenticated'; authMethod: AuthMethod; pkps: IRelayPKP[] }
    | {
        name: 'wallet-ready'
        /** Only present after a fresh signin */
        authMethod?: AuthMethod
        /** Can only be present if `authMethod` is present */
        pkps?: IRelayPKP[]
        pkpWallet: PKPEthersWallet
      }
  )

export type LitConfigOptions = {
  litRpcUrl?: string
  litNetwork?: LIT_NETWORKS_KEYS
  litRelayApiKey: string
  sessionExpirationInSeconds?: number
}

export abstract class SnowballLitAuth extends SnowballAuth<PKPEthersWallet, LitAuthState> {
  protected litRpcUrl?: string
  protected litNetwork: LIT_NETWORKS_KEYS
  protected litNodeClient: LitNodeClient
  protected litAuthClient: LitAuthClient
  protected sessionExpSeconds: number
  protected sessionSigsRecord: SessionSigsRecord | null | undefined

  protected abstract _getProvider(): BaseProvider

  private inInit = false

  static readonly STORAGE_KEY = 'sb_eth_auth_lit'

  constructor(makeOpts: MakeAuthOptions, opts: LitConfigOptions) {
    // TODO: Handle different chains for storageKey (e.g. solana)
    super({ ...makeOpts })

    this.log('init')

    this.sessionExpSeconds = opts.sessionExpirationInSeconds || ONE_DAY_SECONDS

    if (!opts.litRelayApiKey) {
      throw new SnowballError(
        'missing.litReplayApiKey',
        `[${this.constructor.name}] Missing litReplayApiKey`,
      )
    }

    this.litNetwork = opts.litNetwork || 'cayenne'
    this.litRpcUrl = opts.litRpcUrl || `https://rpc.${this.litNetwork}.litprotocol.com`

    this.litNodeClient = new LitNodeClient({
      litNetwork: this.litNetwork,
      debug: true,
    })

    this.litAuthClient = new LitAuthClient({
      rpcUrl: this.litRpcUrl,
      litRelayConfig: {
        relayApiKey: opts.litRelayApiKey,
      },
      litNodeClient: this.litNodeClient,
    })
  }

  initAuthState() {
    return new SnowballState(
      { name: 'init' },
      { debugLabel: 'lit-auth-state', onStateChange: this.onStateChange },
    )
  }

  async initUserSession() {
    if (this.state.name !== 'init' || this.state.loading) return

    this.inInit = true
    try {
      this.setLoading('lit:initUserSession', 'Initializing user session')
      this._loadSessionSigs()
      await this.getWallet()
    } catch (err) {
      this.setState({ name: 'no-session' })
    } finally {
      this.inInit = false
      this.clearLoading()
    }
  }

  async getWallet() {
    if (this.wallet) {
      return this.wallet
    }

    const makeError = SnowballError.builder(
      `${this.constructor.name}.getWallet`,
      'Error getting Ethers wallet',
    )

    try {
      await this.litNodeClient.connect()
    } catch (err) {
      return this.setError(makeError(10, err))
    }

    if (!this.sessionSigsRecord || this.getSessionExpirationTime() < Date.now() - 1000 * 60 * 2) {
      if (this.state.name !== 'authenticated') {
        return this.setError(makeError(0, 'Must be authenticated to get wallet from fresh state'))
      }

      const pkpPubKey = this.state.pkps[0]?.publicKey
      if (!pkpPubKey) {
        return this.setError(makeError(1, 'No PKPs found'))
      }

      try {
        const expireDate = new Date(Date.now() + 1000 * this.sessionExpSeconds)

        this.sessionSigsRecord = {
          version: RECORD_VERSION,
          expiresAt: expireDate.getTime(),
          sessionSigs: await getSessionSigs({
            auth: this.state.authMethod,
            chain: this.chain,
            provider: this._getProvider(),
            pkpPublicKey: pkpPubKey,
            expiration: expireDate.toISOString(),
            litNodeClient: this.litNodeClient,
          }),
          pkpPublicKey: pkpPubKey,
        }
        this._saveSessionSigs()
      } catch (err) {
        return this.setError(makeError(2, err))
      }
    }

    try {
      this.setLoading('createWallet', 'Creating Ethers wallet')
      var wallet = new PKPEthersWallet({
        controllerSessionSigs: this.sessionSigsRecord.sessionSigs,
        pkpPubKey: this.sessionSigsRecord.pkpPublicKey,
        litNodeClient: this.litNodeClient,
        // rpc: 'https://rpc.cayenne.litprotocol.com',
        // rpc: this.litRpcUrl,
      })
      await wallet.init()
    } catch (error) {
      return this.setError(makeError(3, error))
    }

    this.setState({
      name: 'wallet-ready',
      authMethod: 'authMethod' in this.state ? this.state.authMethod : undefined,
      pkps: 'pkps' in this.state ? this.state.pkps : undefined,
      pkpWallet: wallet,
    })

    this.clearLoading()

    return wallet
  }

  get wallet() {
    return this.state.name === 'wallet-ready' ? this.state.pkpWallet : null
  }

  async getWalletAddresses() {
    const wallet = await this.getWallet()
    return [(await wallet.getAddress()) as Address]
  }

  async logout() {
    this.setState({ name: 'no-session' })
    this.sessionSigsRecord = null
    this._saveSessionSigs()
    this.rpc.logout()
  }

  getSessionExpirationTime() {
    const exp = this.sessionSigsRecord?.expiresAt || 0
    if (Date.now() > exp && this.sessionSigsRecord) {
      this.sessionSigsRecord = null
      this._saveSessionSigs()
    }
    return Date.now() > exp ? 0 : exp
  }

  private _loadSessionSigs() {
    // Attempt to load a previous session
    if (!globalThis.localStorage) {
      this.log('localStorage not available')
      return
    }
    try {
      const record: SessionSigsRecord = JSON.parse(
        localStorage.getItem(this.sessionSigsKey) || 'null',
      )
      if (!record) {
        this.log('No session found', this.sessionSigsKey)
        return
      }

      let softError = ''
      if (record.version !== RECORD_VERSION) {
        softError = 'Session version mismatch'
      } else if (record.expiresAt > Date.now()) {
        this.sessionSigsRecord = record
      } else {
        softError = 'Session expired'
      }

      if (softError) {
        this.log(softError, record)
        localStorage.removeItem(this.sessionSigsKey)
      } else {
        this.log('Loaded session', record.expiresAt)
      }
    } catch (err) {
      console.error(`[${this.className}] Error loading session:`, err)
      localStorage.removeItem(this.sessionSigsKey)
    }
  }

  private _saveSessionSigs() {
    if (!globalThis.localStorage || this.sessionSigsRecord === undefined) return
    try {
      if (this.sessionSigsRecord === null) {
        localStorage.removeItem(this.sessionSigsKey)
        this.log('Removed session')
      } else {
        localStorage.setItem(this.sessionSigsKey, JSON.stringify(this.sessionSigsRecord))
        this.log('Saved session', this.sessionSigsRecord.expiresAt)
      }
    } catch (err) {
      console.error(`[${this.className}] Error saving session:`, err)
    }
  }

  protected get sessionSigsKey() {
    return `${this.className}:sessionSigs`
  }

  protected setError(cause: SnowballError) {
    if (!this.inInit) {
      return this._state.setError(cause)
    }
    return undefined as never
  }
}
