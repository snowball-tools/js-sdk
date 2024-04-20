import { SnowballAuth, SnowballSmartWallet } from '@snowballtools/auth'
import { Address } from '@snowballtools/types'
import { SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import { makePubSub } from './pubsub'

type Ret<Fn extends (...args: any[]) => any> = Awaited<ReturnType<Fn>>

export type SnowballOptions<Auths extends AuthTypes, SmartWallet extends SnowballSmartWallet> = {
  // apiKey: string // TODO
  chain: SnowballChain
  makeAuth: MakeAuthMap<Auths>
  makeSmartWallet: (
    chain: SnowballChain,
    wallet: Ret<Auths[keyof Auths]['getEthersWallet']>,
  ) => SmartWallet | Promise<SmartWallet>
}

export type SnowballInitStatus =
  | { name: 'loading' }
  | { name: 'error'; error: Error }
  | { name: 'ready' }

type AuthTypes = Record<string, SnowballAuth<any, any>>

type MakeAuthMap<T extends AuthTypes> = { [K in keyof T]: (chain: SnowballChain) => T[K] }

export class Snowball<Auths extends AuthTypes, SmartWallet extends SnowballSmartWallet> {
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
      create(opts: { initialChain: SnowballChain }) {
        return new Snowball<A, never>({
          chain: opts.initialChain,
          makeAuth,
          makeSmartWallet: async () => {
            throw new SnowballError('missing.smartWallet', 'No SmartWallet provided')
          },
        })
      },
      withSmartWallet<SW extends SnowballSmartWallet>(
        makeSmartWallet: (
          chain: SnowballChain,
          wallet: Ret<A[keyof A]['getEthersWallet']>,
        ) => Promise<SW> | SW,
      ) {
        return {
          create(opts: { initialChain: SnowballChain }) {
            return new Snowball<A, SW>({
              chain: opts.initialChain,
              makeAuth,
              makeSmartWallet,
            })
          },
        }
      },
    }
  }

  constructor(private opts: SnowballOptions<Auths, SmartWallet>) {
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
    if (this.chainEntries.has(chain.chainId)) {
      this.currentChainId = chain.chainId
      return
    }
    try {
      let auths: Auths = {} as Auths
      for (let [authName, makeAuth] of Object.entries(this.opts.makeAuth)) {
        const auth = makeAuth(chain)
        auth.onStateChange = () => this.pubsub.publish()
        auths[authName as keyof Auths] = auth
      }

      this.chainEntries.set(chain.chainId, { auths, chain, smartWallets: {} })
      this.currentChainId = chain.chainId
    } catch (error) {
      return Promise.reject(SnowballError.make('chain.switch', 'Error switching chain', error))
    }
  }

  async getSmartWallet(authName: keyof Auths): Promise<SmartWallet> {
    const entry = this._getCurrentChainEntry()
    let wallet = entry.smartWallets[authName as string]
    if (!wallet) {
      wallet = entry.smartWallets[authName as string] = await this.opts.makeSmartWallet(
        entry.chain,
        await entry.auths[authName]!.getEthersWallet(),
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
