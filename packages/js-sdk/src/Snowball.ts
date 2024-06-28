import { Address } from '@snowballtools/types'
import { SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import { SnowballSmartWallet } from './SmartWallet'
import { SnowballAuth } from './SnowballAuth'
import { makePubSub } from './pubsub'

type Ret<Fn extends (...args: any[]) => any> = Awaited<ReturnType<Fn>>

export type SnowballOptions<Auths extends AuthTypes, SmartWallet extends SnowballSmartWallet> = {
  chain: SnowballChain
  apiKey: string
  apiUrl?: string
  makeAuth: MakeAuthMap<Auths>
  makeSmartWallet: (
    chain: SnowballChain,
    wallet: Ret<Auths[keyof Auths]['getWallet']>,
  ) => SmartWallet | Promise<SmartWallet>
}

export type SnowballInitStatus =
  | { name: 'loading' }
  | { name: 'error'; error: Error }
  | { name: 'ready' }

export type MakeAuthOptions = {
  chain: SnowballChain
  apiKey: string
  apiUrl?: string
}

type AuthTypes = Record<string, SnowballAuth<any, any>>

type MakeAuthMap<T extends AuthTypes> = {
  [K in keyof T]: (opts: MakeAuthOptions, prevState?: any) => T[K]
}

type CreateOpts = {
  apiKey: string
  apiUrl?: string
  initialChain: SnowballChain
}

export class Snowball<Auths extends AuthTypes, SmartWallet extends SnowballSmartWallet> {
  #apiKey: string
  apiUrl?: string
  private chainEntries = new Map<
    number,
    { chain: SnowballChain; auths: Auths; smartWallets: Record<string, SmartWallet> }
  >()
  private currentChainId!: number

  private pubsub = makePubSub()

  static Chain = SnowballChain

  // Builder for type inference
  static withAuth<A extends AuthTypes>(makeAuth: MakeAuthMap<A>) {
    return {
      create({ initialChain, ...opts }: CreateOpts) {
        return new Snowball<A, never>({
          ...opts,
          chain: initialChain,
          makeAuth,
          makeSmartWallet: async () => {
            throw new SnowballError('missing.smartWallet', 'No SmartWallet provided')
          },
        })
      },
      withSmartWallet<SW extends SnowballSmartWallet>(
        makeSmartWallet: (
          chain: SnowballChain,
          wallet: Ret<A[keyof A]['getWallet']>,
        ) => Promise<SW> | SW,
      ) {
        return {
          create({ initialChain, ...opts }: CreateOpts) {
            return new Snowball<A, SW>({
              ...opts,
              chain: initialChain,
              makeAuth,
              makeSmartWallet,
            })
          },
        }
      },
    }
  }

  constructor(private opts: SnowballOptions<Auths, SmartWallet>) {
    this.#apiKey = opts.apiKey
    this.apiUrl = opts.apiUrl
    this.switchChain(this.opts.chain)
  }

  get chain() {
    return this._getCurrentChainEntry().chain
  }

  get auth() {
    return this._getCurrentChainEntry().auths
  }

  get smartWallet() {
    return this._getCurrentChainEntry().smartWallets
  }

  private _getCurrentChainEntry() {
    const entry = this.chainEntries.get(this.currentChainId)
    if (!entry) {
      throw new SnowballError(
        'missing.chain',
        'Chain not initialized (did Snowball.withAuth() throw an error?)',
      )
    }
    return entry
  }

  /**
   * Returns an auth with an active session.
   *
   * If multiple auths have active sessions, the one with the most distance expiration time is returned.
   */
  get session(): Auths[keyof Auths] | null {
    const validSessions = ([...Object.values(this.auth)] as any as SnowballAuth<unknown>[])
      .filter((auth) => auth.getSessionExpirationTime())
      .sort((a, b) => {
        // Sort from most distance expiration time to least
        return b.getSessionExpirationTime() - a.getSessionExpirationTime()
      })
    return (validSessions[0] as Auths[keyof Auths]) || null
  }

  switchChain(chain: SnowballChain) {
    if (!this.chainEntries.has(chain.chainId)) {
      try {
        let current = this.chainEntries.get(this.currentChainId)
        let auths: Auths = {} as Auths
        for (let [authName, makeAuth] of objectEntries(this.opts.makeAuth)) {
          const makeOpts = { chain, apiKey: this.#apiKey, apiUrl: this.apiUrl }
          const auth = makeAuth(makeOpts, current?.auths[authName]?.state)
          auth.onStateChange = () => this.pubsub.publish()
          auths[authName as keyof Auths] = auth
        }
        this.chainEntries.set(chain.chainId, { auths, chain, smartWallets: {} })
      } catch (error) {
        return Promise.reject(SnowballError.make('chain.switch', 'Error switching chain', error))
      }
    }
    this.currentChainId = chain.chainId
    this.pubsub.publish()
  }

  async getSmartWallet(authName: keyof Auths): Promise<SmartWallet> {
    const entry = this._getCurrentChainEntry()
    let wallet = entry.smartWallets[authName as string]
    if (!wallet) {
      wallet = entry.smartWallets[authName as string] = await this.opts.makeSmartWallet(
        entry.chain,
        await entry.auths[authName]!.getWallet(),
      )
    }
    return wallet
  }

  async getSmartWalletAddress(authName: keyof Auths): Promise<Address> {
    return (await this.getSmartWallet(authName)).getAddress()
  }

  subscribe(callback: () => void) {
    return this.pubsub.subscribe(callback)
  }
}

// Fix type
const objectEntries = Object.entries as <T>(obj: T) => [keyof T, T[keyof T]][]
