import { ErrResult, err } from '@snowballtools/types'
import { Address, ApiClient, SnowballError } from '@snowballtools/types'
import { type SnowballChain, logBase } from '@snowballtools/utils'

import { SnowballState, StateLoadingAttrs } from './SnowballState'

export abstract class SnowballAuth<Wallet, State extends {} & StateLoadingAttrs = {}> {
  static className: string
  abstract readonly className: string

  protected _chain: SnowballChain
  protected _state: SnowballState<State>
  onStateChange?: (state: State) => void

  protected rpc: ApiClient

  constructor(options: {
    rpc: ApiClient
    chain: SnowballChain
    onStateChange?: (state: State) => void
  }) {
    // Hack to initialize this.className before anything else
    ;(this as any).className = (this.constructor as any).className
    this._chain = options.chain
    this.rpc = options.rpc
    this.onStateChange = options.onStateChange
    this._state = this.initAuthState()
  }

  abstract initAuthState(): SnowballState<State>

  /** Attempts to load an existing user session, if one exists. */
  abstract initUserSession(): Promise<void>
  abstract logout(): Promise<void>

  protected async getUser() {
    if (!this.rpc.hasValidSession()) return null
    const res = await this.rpc.pu_whoami({})
    if (!res.ok) {
      this.log('Failed to fetch user session', res)
      return null
    }
    return res.value
  }

  abstract getWallet(): Promise<Wallet>
  abstract getWalletAddresses(): Promise<Address[]>

  async getWalletAddress(): Promise<Address | null> {
    return (await this.getWalletAddresses())[0] || null
  }

  abstract get wallet(): Wallet | null

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
  get state() {
    return this._state.value
  }

  protected setState(newState: State) {
    this._state.set(newState)
  }

  protected setLoading(code: string, message: string) {
    this._state.setLoading(code, message)
  }

  protected clearLoading() {
    this._state.clearLoading()
  }

  protected setError(cause: SnowballError) {
    return this._state.setError(cause)
  }

  protected setErr<T extends ErrResult<any, any>>(error: T) {
    return this._state.setErr(error)
  }

  protected rejectErr<T extends ErrResult<any, any>>(error: T) {
    return this._state.rejectErr(error)
  }

  protected clearError() {
    this._state.clearError()
  }

  private _logger: any
  protected log(...args: any[]) {
    if (!this._logger) {
      this._logger = logBase.extend(this.className)
    }
    this._logger(...args)
  }
}
