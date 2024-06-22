import { ApiRpcs } from './api'

export type { SmartWalletApiKeys } from './smartwallet'
export type { Address, Hash, Hex } from './prims'

export * from './api'
export * from './result'

export { SnowballError } from './error'

export type ApiClient = ApiRpcs & {
  readonly apiUrl: string
  readonly hasValidSession: () => boolean
  /** Returns 0 if session not present */
  readonly getSessionExpirationTime: () => number
}
