import { SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import { ProviderType } from '@lit-protocol/constants'
import GoogleProvider from '@lit-protocol/lit-auth-client/src/lib/providers/GoogleProvider'

import { MakeAuthOptions } from '../../js-sdk/src'
import { LitConfigOptions } from './LitAuth'
import { LitOAuth } from './LitOAuth'
import { clearRedirectUrlParams, mintPKP } from './helpers'
import { getProviderFromUrl, isSignInRedirect } from './lit-auth-client'

export class LitGoogleAuth extends LitOAuth {
  static className = 'LitGoogleAuth' as const
  override readonly className = 'LitGoogleAuth' as const

  private _provider?: GoogleProvider

  static configure(opts: LitConfigOptions) {
    return (makeOpts: MakeAuthOptions) => new this({ ...opts, ...makeOpts })
  }

  /**
   * Begin the "sign in with Google" OAuth flow
   * * @param redirectUri - Redirect uri to check against. Provide if the url you're expecting may be different from the current page
   */
  async startOAuthRedirect(redirectUri: string = window.location.href): Promise<void> {
    await this.getProvider(redirectUri).signIn()
  }

  /**
   * Returns true if the current page is a Google OAuth redirect
   * @param redirectUri - Redirect uri to check against. Provide if the url you're expecting may be different from the current page
   */
  canHandleOAuthRedirectBack(redirectUri = window.location.href): boolean {
    return isSignInRedirect(redirectUri) && getProviderFromUrl() === 'google'
  }

  /**
   * Complete the "sign in with Google" OAuth flow
   * @param redirectUri - Redirect uri to check against. Provide if the url you're expecting may be different from the current page
   */
  async handleOAuthRedirectBack(redirectUri = window.location.href): Promise<boolean> {
    if (!this.canHandleOAuthRedirectBack(redirectUri)) {
      // Not a google oauth redirect
      return false
    }
    const makeError = SnowballError.builder('LitGoogle.getWallet', 'Error handling redirect')

    const provider = this.getProvider(redirectUri)

    try {
      this.setLoading('handleRedirect.authenticate', 'Signing in with Google')
      var authMethod = await provider.authenticate()
      if (!authMethod) {
        return this.setError(makeError(0, 'No auth method returned'))
      }
    } catch (err) {
      return this.setError(makeError(1, err))
    }

    try {
      this.setLoading('fetchPKPs', 'Fetching associated PKPs')
      const pkps = await provider.fetchPKPsThroughRelayer(authMethod)
      this.setState({ name: 'authenticated', authMethod, pkps })
    } catch (err) {
      return this.setError(makeError(2, err))
    }

    //
    // Create an ethers wallet for this auth method
    //
    clearRedirectUrlParams()
    try {
      this.setLoading('mintPKP', 'Fetching associated PKPs')
      await mintPKP(provider, authMethod)
    } catch (err) {
      return this.setError(makeError(2, err))
    }

    this.clearLoading()

    return true
  }

  getProvider(redirectUri: string) {
    return (this._provider ||= this.litAuthClient.initProvider<GoogleProvider>(
      ProviderType.Google,
      { redirectUri },
    ))
  }

  protected _getProvider() {
    return this.getProvider('') // redirectUri doesn't matter here
  }
}
