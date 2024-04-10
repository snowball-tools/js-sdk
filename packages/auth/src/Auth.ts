import { SnowballError } from '@snowballtools/types'
import { Address } from '@snowballtools/types'
import type { SnowballChain } from '@snowballtools/utils'

export type AuthStateLoadingAttrs = {
  /** A string describing the currently loading step, if any. */
  loading?: { code: string; message: string }
  /** Error details for attempting to transition from this state to the next one. */
  error?: SnowballError
}

export abstract class SnowballAuth<Wallet, State extends {} & AuthStateLoadingAttrs = {}> {
  /* This SHOULD be overridden by subclasses */
  protected _state = {}
  onStateChange?: (state: State) => void

  constructor(protected _chain: SnowballChain) {}

  abstract getEthersWallet(): Promise<Wallet>
  abstract getEthersWalletAddress(): Promise<Address>

  get chain() {
    return this._chain
  }

  //
  // State Management
  //
  get state() {
    return this._state
  }

  protected setState(newState: State) {
    this._state = newState
    this.onStateChange?.(newState)
  }

  protected setLoading(code: string, message: string) {
    this.setState({ ...this._state, loading: { code, message } } as State)
  }

  protected clearLoading() {
    this.setState({ ...this._state, loading: undefined } as State)
  }

  protected setError(error: SnowballError) {
    this.setState({ ...this._state, error, loading: undefined } as State)
    return Promise.reject(error)
  }

  protected clearError() {
    this.setState({ ...this._state, error: undefined } as State)
  }
}
