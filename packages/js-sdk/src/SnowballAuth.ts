import { ErrResult, err } from '@snowballtools/types'
import { Address, ApiClient, SnowballError } from '@snowballtools/types'
import type { SnowballChain } from '@snowballtools/utils'

import debug from 'debug'

import { ApiValues, makeRpcClient } from './rpc-client'

type User = ApiValues['pu_whoami']

export type AuthStateLoadingAttrs = {
  /** A string describing the currently loading step, if any. */
  loading?: { code: string; message: string }
  /** Error details for attempting to transition from this state to the next one. */
  error?: ErrResult<any, any>
}

export abstract class SnowballAuth<Wallet, State extends {} & AuthStateLoadingAttrs = {}> {
  static className: string
  abstract readonly className: string

  protected _chain: SnowballChain
  protected _state = {}
  onStateChange?: (state: State) => void

  protected rpc: ApiClient

  constructor(options: { rpc: ApiClient; chain: SnowballChain }) {
    // Hack to initialize this.className before anything else
    ;(this as any).className = (this.constructor as any).className
    this._chain = options.chain
    this.rpc = options.rpc
  }

  /** Attempts to load an existing user session, if one exists. */
  abstract initUserSession(): void

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

  protected setError(cause: SnowballError) {
    const error = err(cause.name, 'e-Auth.setError', { meta: { cause } })
    this.log(error)
    this.setState({ ...this._state, error, loading: undefined } as State)
    return Promise.reject(error)
  }

  protected setErr<T extends ErrResult<any, any>>(error: T) {
    this.log(error)
    this.setState({ ...this._state, error: error as any, loading: undefined } as State)
    return error
  }

  protected rejectErr<T extends ErrResult<any, any>>(error: T) {
    this.log(error)
    this.setState({ ...this._state, error: error as any, loading: undefined } as State)
    return Promise.reject(new SnowballError(error.reason, error.code))
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
