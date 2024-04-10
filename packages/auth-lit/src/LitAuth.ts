import { AuthStateLoadingAttrs, SnowballAuth } from '@snowballtools/auth'
import { SnowballError } from '@snowballtools/types'
import { Address } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import { BaseProvider, LitAuthClient } from '@lit-protocol/lit-auth-client'
import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers'
import { AuthMethod, IRelayPKP, SessionSigsMap } from '@lit-protocol/types'

import { getSessionSigs } from './helpers'

export type LitAuthState = AuthStateLoadingAttrs &
  (
    | { name: 'init' }
    | { name: 'authenticated'; authMethod: AuthMethod; pkps: IRelayPKP[] }
    | {
        name: 'wallet-ready'
        authMethod: AuthMethod
        pkps: IRelayPKP[]
        pkpWallet: PKPEthersWallet
      }
  )

export type ConfigOptions = {
  litRpcUrl?: string
  litNetwork?: string
  litReplayApiKey: string
}

export abstract class SnowballLitAuth extends SnowballAuth<PKPEthersWallet, LitAuthState> {
  override _state: LitAuthState = { name: 'init' }

  protected litRpcUrl?: string
  protected litNodeClient: LitNodeClient
  protected litAuthClient: LitAuthClient
  protected sessionSigs: SessionSigsMap | undefined

  protected abstract _getProvider(): BaseProvider

  constructor(opts: ConfigOptions & { chain: SnowballChain }) {
    super(opts.chain)

    if (!opts.litReplayApiKey) {
      throw new SnowballError(
        'missing.litReplayApiKey',
        `[${this.constructor.name}] Missing litReplayApiKey`,
      )
    }

    this.litRpcUrl = opts.litRpcUrl

    this.litNodeClient = new LitNodeClient({
      litNetwork: opts.litNetwork || 'cayenne',
      debug: true,
    })

    this.litAuthClient = new LitAuthClient({
      rpcUrl: this.litRpcUrl,
      litRelayConfig: {
        relayApiKey: opts.litReplayApiKey,
      },
      litNodeClient: this.litNodeClient,
    })
  }

  async getEthersWallet() {
    if (this._state.name === 'wallet-ready') {
      return this._state.pkpWallet
    }

    const makeError = SnowballError.builder(
      `${this.constructor.name}.getEthersWallet`,
      'Error getting Ethers wallet',
    )

    if (this._state.name !== 'authenticated') {
      return this.setError(makeError(0, 'Not authenticated'))
    }

    const pkpPubKey = this._state.pkps[0]?.publicKey
    if (!pkpPubKey) {
      return this.setError(makeError(1, 'No PKPs found'))
    }

    try {
      this.sessionSigs = await getSessionSigs({
        auth: this._state.authMethod,
        chain: this.chain,
        provider: this._getProvider(),
        pkpPublicKey: pkpPubKey,
      })
    } catch (err) {
      return this.setError(makeError(2, err))
    }

    try {
      this.setLoading('createWallet', 'Creating Ethers wallet')
      var wallet = new PKPEthersWallet({
        controllerSessionSigs: this.sessionSigs,
        pkpPubKey,
        rpc: 'https://rpc.cayenne.litprotocol.com',
      })
      await wallet.init()
    } catch (error) {
      return this.setError(makeError(3, error))
    }

    this.setState({
      name: 'wallet-ready',
      authMethod: this._state.authMethod,
      pkps: this._state.pkps,
      pkpWallet: wallet,
    })

    this.clearLoading()

    return wallet
  }

  async getEthersWalletAddress() {
    const wallet = await this.getEthersWallet()
    return (await wallet.getAddress()) as Address
  }

  reset() {
    this.setState({ name: 'init' })
  }
}
