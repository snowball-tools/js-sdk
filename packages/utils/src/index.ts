import debug from './debug'

export { DEFAULT_EXP } from './constants'
export { SnowballChain } from './SnowballChain'
export * from './passkey-helpers'

export const logBase = debug('snowball')
export type Debugger = debug.Debugger
