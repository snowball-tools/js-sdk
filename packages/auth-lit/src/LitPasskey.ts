import { SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import { ProviderType } from '@lit-protocol/constants'
import type { IRelayPollStatusResponse } from '@lit-protocol/types'

import { MakeAuthOptions } from '../../js-sdk/src'
import { LitConfigOptions, SnowballLitAuth } from './LitAuth'
import { WebAuthnProvider } from './lit-auth-client'

// TODO: https://web.dev/articles/webauthn-exclude-credentials

export class LitPasskeyAuth extends SnowballLitAuth {
  static className = 'LitPasskeyAuth' as const
  override readonly className = 'LitPasskeyAuth' as const

  provider: WebAuthnProvider

  static configure(opts: LitConfigOptions) {
    return (makeOpts: MakeAuthOptions) => new this({ ...opts, ...makeOpts })
  }

  constructor(opts: LitConfigOptions & MakeAuthOptions) {
    super(opts)
    this.provider = this.litAuthClient.initProvider(ProviderType.WebAuthn)
  }

  async register(username: string) {
    if (this.state.name !== 'init') {
      this.log(`no-op: register() while in state '${this.state.name}'`)
      return
    }

    const makeError = SnowballError.builder('LitPasskey.register', 'Error registering passkey')

    try {
      this.setLoading('passkey.register', 'Registering passkey')
      var options = await this.provider.register(username)
    } catch (err) {
      return this.setError(makeError(0, err))
    }

    try {
      this.setLoading('mintPKP', 'Verifying and minting PKP')
      var txHash = await this.provider.verifyAndMintPKPThroughRelayer(options)
    } catch (err) {
      return this.setError(makeError(1, err))
    }

    try {
      this.setLoading('waitingForRequest', 'Waiting for registration status')
      var response: IRelayPollStatusResponse =
        await this.provider.relay.pollRequestUntilTerminalState(txHash)
    } catch (err) {
      return this.setError(makeError(2, err))
    }

    if (response.status !== 'Succeeded') {
      return this.setError(makeError(3, response))
    }

    if (!response.pkpPublicKey) {
      return this.setError(makeError(4, response))
    }

    this.clearLoading()
  }

  async authenticate(): Promise<void> {
    if (this.state.name !== 'init') {
      this.log(`no-op: authenticate() while in state '${this.state.name}'`)
      return
    }
    try {
      this.setLoading('passkey.authenticate', 'Authenticating passkey')
      var authMethod = await this.provider.authenticate()
    } catch (error) {
      return this.setError(
        SnowballError.make('LitPasskey.authenticate', 'Error authenticating passkey', error),
      )
    }

    try {
      this.setLoading('fetchPKPs', 'Fetching PKPs')
      this.setState({
        name: 'authenticated',
        authMethod,
        pkps: await this.provider.fetchPKPsThroughRelayer(authMethod),
      })
    } catch (error) {
      return this.setError(
        SnowballError.make('LitPasskey.authenticate', 'Error fetching PKPs', error),
      )
    }
  }

  protected _getProvider() {
    return this.provider
  }
}
