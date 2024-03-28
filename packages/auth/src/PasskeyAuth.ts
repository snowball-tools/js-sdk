import { SnowballError } from '@snowballtools/types'

import { SnowballAuth } from './Auth'

type LoadingStates = {
  /** A string describing the currently loading step, if any. */
  loading?: string
  /** Error details for attempting to transition from this state to the next one. */
  error?: SnowballError
}

export type PasskeysAuthState<AuthMethod, Wallet> = LoadingStates &
  (
    | { name: 'init'; authMethod?: undefined; pkpWallet?: undefined }
    | { name: 'authenticated'; authMethod: AuthMethod; pkpWallet?: undefined }
    | { name: 'wallet-ready'; authMethod: AuthMethod; pkpWallet: Wallet }
  )

export abstract class SnowballPasskeyAuth<Wallet, AuthMethod> extends SnowballAuth<
  Wallet,
  PasskeysAuthState<AuthMethod, Wallet>
> {
  protected _state: PasskeysAuthState<AuthMethod, Wallet> = { name: 'init' }

  abstract register(username: string): Promise<void>
  abstract authenticate(): Promise<void>

  get state() {
    return this._state
  }

  reset() {
    this.setState({ name: 'init' })
  }

  protected setState(newState: PasskeysAuthState<AuthMethod, Wallet>) {
    this._state = newState
    this.onStateChange?.(newState)
  }

  protected setLoading(loading: string | null) {
    this.setState({ ...this._state, loading: loading || undefined })
  }

  protected setError(error: SnowballError) {
    this.setState({ ...this._state, error, loading: undefined })
    return Promise.reject()
  }
}
