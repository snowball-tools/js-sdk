import { ErrResult, SnowballError, err } from '@snowballtools/types'

import debug from 'debug'

export type StateLoadingAttrs = {
  /** A string describing the currently loading step, if any. */
  loading?: { code: string; message: string }
  /** Error details for attempting to transition from this state to the next one. */
  error?: ErrResult<any, any>
}

export class SnowballState<T> {
  constructor(
    public value: T,
    private options: { debugLabel: string; onStateChange?: (newState: T) => void },
  ) {}

  set(newState: T) {
    this.value = newState
    this.options.onStateChange?.(newState)
  }

  setLoading(code: string, message: string) {
    this.log(code, message)
    this.set({ ...this.value, loading: { code, message } })
  }

  clearLoading() {
    this.set({ ...this.value, loading: undefined })
  }

  setError(cause: SnowballError) {
    const error = err(cause.name, 'e-Auth.setError', { meta: { cause } })
    this.log(error)
    this.set({ ...this.value, error, loading: undefined })
    return Promise.reject(error)
  }

  setErr<T extends ErrResult<any, any>>(error: T) {
    this.log(error)
    this.set({ ...this.value, error: error as any, loading: undefined })
    return error
  }

  rejectErr<T extends ErrResult<any, any>>(error: T) {
    this.log(error)
    this.set({ ...this.value, error: error as any, loading: undefined })
    return Promise.reject(new SnowballError(error.reason, error.code))
  }

  clearError() {
    this.set({ ...this.value, error: undefined })
  }

  private _logger: any
  protected log(...args: any[]) {
    if (!this._logger) {
      this._logger = debug(`snowball:${this.options.debugLabel}`)
    }
    this._logger(...args)
  }
}
