import { AuthStateLoadingAttrs, SnowballAuth } from '@snowballtools/auth'
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
}
const RECORD_VERSION = 1

export type LitAuthState = AuthStateLoadingAttrs &
  (
    | { name: 'init' }
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
  override get state() {
    return this._state as LitAuthState
  }

  protected litRpcUrl?: string
  protected litNetwork: LIT_NETWORKS_KEYS
  protected litNodeClient: LitNodeClient
  protected litAuthClient: LitAuthClient
  protected sessionExpSeconds: number
  protected sessionSigsRecord: SessionSigsRecord | undefined

  protected abstract _getProvider(): BaseProvider

  constructor(opts: LitConfigOptions & MakeAuthOptions) {
    super(opts.rpcClient, opts.chain)

    this.log('init')

    this.sessionExpSeconds = opts.sessionExpirationInSeconds || ONE_DAY_SECONDS

    this._state = { name: 'init' }

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

    this._loadSessionSigs()
  }

  async getWallet() {
    if (this.wallet) {
      return this.wallet
    }

    const makeError = SnowballError.builder(
      `${this.constructor.name}.getWallet`,
      'Error getting Ethers wallet',
    )

    if (this.state.name !== 'authenticated') {
      return this.setError(makeError(0, 'Not authenticated'))
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
      }
      this._saveSessionSigs()
    } catch (err) {
      return this.setError(makeError(2, err))
    }

    try {
      this.setLoading('createWallet', 'Creating Ethers wallet')
      var wallet = new PKPEthersWallet({
        controllerSessionSigs: this.sessionSigsRecord.sessionSigs,
        pkpPubKey,
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
      authMethod: this.state.authMethod,
      pkps: this.state.pkps,
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

  reset() {
    this.setState({ name: 'init' })
  }

  getSessionExpirationTime() {
    return this.sessionSigsRecord?.expiresAt || 0
  }

  private _loadSessionSigs() {
    // Attempt to load a previous session
    if (!globalThis.localStorage) {
      this.log('localStorage not available')
      return
    }
    try {
      const record: SessionSigsRecord = JSON.parse(
        localStorage.getItem(`${this.className}:sessionSigs`) || 'null',
      )
      if (!record) {
        this.log('No session found')
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
        localStorage.removeItem(`${this.className}:sessionSigs`)
      } else {
        this.log('Loaded session', record.expiresAt)
      }
    } catch (err) {
      console.error(`[${this.className}] Error loading session:`, err)
      localStorage.removeItem(`${this.className}:sessionSigs`)
    }
  }

  private _saveSessionSigs() {
    if (!globalThis.localStorage || !this.sessionSigsRecord) return
    try {
      localStorage.setItem(`${this.className}:sessionSigs`, JSON.stringify(this.sessionSigsRecord))
      this.log('Saved session', this.sessionSigsRecord.expiresAt)
    } catch (err) {
      console.error(`[${this.className}] Error saving session:`, err)
    }
  }
}
