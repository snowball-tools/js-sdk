import { SnowballPasskeyAuth } from '@snowballtools/auth'
import type { Chain } from '@snowballtools/types'
import { SnowballError } from '@snowballtools/types'
import { Address } from '@snowballtools/types'
import { DEFAULT_EXP, SnowballChain } from '@snowballtools/utils'

import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers'
import { ProviderType } from '@lit-protocol/constants'
import { LitAuthClient, WebAuthnProvider } from '@lit-protocol/lit-auth-client'
import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers'
import type {
  AuthCallbackParams,
  AuthMethod,
  IRelayPollStatusResponse,
  SessionSigsMap,
} from '@lit-protocol/types'

type ConfigOptions = {
  litReplayApiKey: string
  litNetwork?: string
}

export class LitPasskeyAuth extends SnowballPasskeyAuth<PKPEthersWallet, AuthMethod> {
  litAuthClient: LitAuthClient
  webAuthnProvider: WebAuthnProvider
  litNodeClient: LitNodeClient

  private _pkpPublicKey: string | undefined
  private sessionSig: SessionSigsMap | undefined

  static configure(opts: ConfigOptions) {
    return (chain: SnowballChain) => new LitPasskeyAuth({ ...opts, chain })
  }

  constructor(opts: ConfigOptions & { chain: Chain }) {
    super(opts.chain)

    if (!opts.litReplayApiKey) {
      throw new SnowballError('[LitPasskey] Missing litReplayApiKey', 'missing.litReplayApiKey')
    }

    this.litAuthClient = new LitAuthClient({
      litRelayConfig: {
        relayApiKey: opts.litReplayApiKey,
      },
    })

    this.litAuthClient.initProvider(ProviderType.WebAuthn)

    this.webAuthnProvider = this.litAuthClient.getProvider(
      ProviderType.WebAuthn,
    ) as WebAuthnProvider

    this.litNodeClient = new LitNodeClient({
      litNetwork: opts.litNetwork || 'cayenne',
      debug: true,
    })
  }

  async register(username: string) {
    if (this._state.name !== 'init') {
      console.warn(`[Snowball] no-op: register() while in state '${this._state.name}'`)
      return
    }

    const makeError = SnowballError.builder('LitPasskey.register', 'Error registering passkey')

    try {
      this.setLoading('Registering passkey')
      var options = await this.webAuthnProvider.register(username)
    } catch (err) {
      return this.setError(makeError(0, err))
    }

    try {
      this.setLoading('Verifying and minting PKP')
      var txHash = await this.webAuthnProvider.verifyAndMintPKPThroughRelayer(options)
    } catch (err) {
      return this.setError(makeError(1, err))
    }

    try {
      this.setLoading('Waiting for registration status')
      var response: IRelayPollStatusResponse =
        await this.webAuthnProvider.relay.pollRequestUntilTerminalState(txHash)
    } catch (err) {
      return this.setError(makeError(2, err))
    }

    console.log('REGISTERED?', {
      pkpEthAddress: response.pkpEthAddress,
      pkpPublicKey: response.pkpPublicKey,
    })

    if (response.pkpPublicKey === undefined) {
      return this.setError(makeError(3, response))
    }

    this.setLoading(null)
    this._pkpPublicKey = response.pkpPublicKey
  }

  async authenticate(): Promise<void> {
    if (this._state.name !== 'init') {
      console.warn(`[Snowball] no-op: authenticate() while in state '${this._state.name}'`)
      return
    }
    try {
      this.setLoading('Authenticating passkey')
      this.setState({
        name: 'authenticated',
        authMethod: await this.webAuthnProvider.authenticate(),
      })
    } catch (error) {
      return this.setError(
        new SnowballError('LitPasskey.authenticate', 'Error authenticating passkey', error),
      )
    }
  }

  async getEthersWallet() {
    if (this._state.name === 'wallet-ready') {
      return this._state.pkpWallet
    }

    const makeError = SnowballError.builder(
      'LitPasskey.getEthersWallet',
      'Error getting Ethers wallet',
    )

    if (this._state.name !== 'authenticated') {
      return this.setError(makeError(0, 'Not authenticated'))
    }

    if (this.sessionSig === undefined) {
      try {
        this.sessionSig = await this.getSessionSigs(
          'LitPasskey.getEthersWallet',
          this._state.authMethod,
        )
      } catch (err) {
        return this.setError(makeError(1, err))
      }
    }

    const pkpPublicKey = await this.getPkpPublicKey(
      'LitPasskey.getEthersWallet',
      this._state.authMethod,
    )

    try {
      this.setLoading('Creating Ethers wallet')
      var wallet = new PKPEthersWallet({
        controllerSessionSigs: this.sessionSig,
        pkpPubKey: pkpPublicKey,
        rpc: 'https://chain-rpc.litprotocol.com/http',
      })
      await wallet.init()
    } catch (error) {
      return this.setError(makeError(2, error))
    }

    this.setState({
      name: 'wallet-ready',
      authMethod: this._state.authMethod,
      pkpWallet: wallet,
    })

    return wallet
  }

  async getEthersWalletAddress() {
    const wallet = await this.getEthersWallet()
    return (await wallet.getAddress()) as Address
  }

  private async getPkpPublicKey(prefix: string, auth: AuthMethod): Promise<string> {
    if (!this._pkpPublicKey) {
      const makeError = SnowballError.builder(`${prefix}.fetchPkps`, 'Error fetching PKPs')
      try {
        this.setLoading('Fetching PKPs')
        var pkps = await this.webAuthnProvider.fetchPKPsThroughRelayer(auth)
      } catch (error) {
        return this.setError(makeError(0, error))
      }

      this._pkpPublicKey = pkps[0]?.publicKey

      if (this._pkpPublicKey === undefined) {
        return this.setError(makeError(1, 'No PKP public key found'))
      }
    }

    return this._pkpPublicKey
  }

  private async getSessionSigs(
    prefix: string,
    auth: AuthMethod,
    switchChain: boolean = false,
  ): Promise<SessionSigsMap> {
    const makeError = SnowballError.builder(
      `${prefix}.getSessionSigs`,
      'Error fetching session sigs',
    )

    const pkpPublicKey = await this.getPkpPublicKey(`${prefix}.getSessionSigs`, auth)

    try {
      this.setLoading('Getting session sigs')
      await this.litNodeClient.connect()

      const authNeededCallback = async (params: AuthCallbackParams) => {
        const resp = await this.litNodeClient.signSessionKey({
          statement: params.statement,
          authMethods: [auth],
          pkpPublicKey,
          expiration: params.expiration,
          resources: params.resources,
          chainId: this.chain.chainId,
        })
        return resp.authSig
      }

      this.sessionSig = await this.litNodeClient.getSessionSigs({
        expiration: DEFAULT_EXP,
        chain: this.chain.name,
        resourceAbilityRequests: [
          {
            resource: new LitActionResource('*'),
            ability: LitAbility.PKPSigning,
          },
        ],
        switchChain,
        authNeededCallback: authNeededCallback,
      })
    } catch (error) {
      return this.setError(makeError(0, error))
    }

    if (!this.sessionSig) {
      return this.setError(makeError(1, 'No session sig found'))
    }

    return this.sessionSig
  }
}
