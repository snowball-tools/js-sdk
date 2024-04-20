import { SnowballError } from '@snowballtools/types'
import { Address } from '@snowballtools/types'
import type { SnowballChain } from '@snowballtools/utils'

import debug from 'debug'

export type AuthStateLoadingAttrs = {
  /** A string describing the currently loading step, if any. */
  loading?: { code: string; message: string }
  /** Error details for attempting to transition from this state to the next one. */
  error?: SnowballError
}

export abstract class SnowballAuth<Wallet, State extends {} & AuthStateLoadingAttrs = {}> {
  static className: string
  abstract readonly className: string

  protected _state = {}
  onStateChange?: (state: State) => void

  constructor(protected _chain: SnowballChain) {
    // Hack to initialize this.className before anything else
    ;(this as any).className = (this.constructor as any).className
  }

  abstract getEthersWallet(): Promise<Wallet>
  abstract getEthersWalletAddress(): Promise<Address>

  /**
   * Returns the expiration time of the current session in seconds.
   * If the session has already expired, this function MUST return 0.
   */
  abstract getSessionExpirationTime(): number

  get chain() {
    return this._chain
  }

  //
  // State Management
  //
  /** This SHOULD be overridden by subclasses for type awareness */
  get state() {
    return this._state
  }

  protected setState(newState: State) {
    this._state = newState
    this.onStateChange?.(newState)
  }

  protected setLoading(code: string, message: string) {
    this.log(code, message)
    this.setState({ ...this._state, loading: { code, message } } as State)
  }

  protected clearLoading() {
    this.setState({ ...this._state, loading: undefined } as State)
  }

  protected setError(error: SnowballError) {
    this.log(error)
    this.setState({ ...this._state, error, loading: undefined } as State)
    return Promise.reject(error)
  }

  protected clearError() {
    this.setState({ ...this._state, error: undefined } as State)
  }

  private _logger: any
  protected log(...args: any[]) {
    if (!this._logger) {
      this._logger = debug(`snowball:${this.className}`)
    }
    this._logger(...args)
  }
}
