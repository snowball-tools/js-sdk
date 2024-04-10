import { SnowballAuth, SnowballSmartWallet } from '@snowballtools/auth'
import { Address } from '@snowballtools/types'
import { SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import { makePubSub } from './pubsub'

type Ret<Fn extends (...args: any[]) => any> = Awaited<ReturnType<Fn>>

export type SnowballOptions<
  Auth extends SnowballAuth<any, any>,
  SmartWallet extends SnowballSmartWallet,
> = {
  // apiKey: string // TODO
  chain: SnowballChain
  makeAuth: (chain: SnowballChain) => Auth
  makeSmartWallet: (
    chain: SnowballChain,
    wallet: Ret<Auth['getEthersWallet']>,
  ) => SmartWallet | Promise<SmartWallet>
}

export class Snowball<
  Auth extends SnowballAuth<any, any>,
  SmartWallet extends SnowballSmartWallet,
> {
  private chainEntries = new Map<
    number,
    { chain: SnowballChain; auth: Auth; smartWallet?: SmartWallet }
  >()
  private currentChainId!: number

  private pubsub = makePubSub()

  static Chain = SnowballChain

  // Builder for type inference
  static withAuth<A extends SnowballAuth<any, any>>(makeAuth: (chain: SnowballChain) => A) {
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
          wallet: Ret<A['getEthersWallet']>,
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

  constructor(private opts: SnowballOptions<Auth, SmartWallet>) {
    this.switchChain(this.opts.chain)
  }

  get chain() {
    return this.chainEntries.get(this.currentChainId)!.chain
  }

  get auth() {
    return this.chainEntries.get(this.currentChainId)!.auth
  }

  get smartWallet() {
    return this.chainEntries.get(this.currentChainId)!.smartWallet
  }

  async switchChain(chain: SnowballChain) {
    if (this.chainEntries.has(chain.chainId)) {
      this.currentChainId = chain.chainId
      return
    }
    try {
      const auth = this.opts.makeAuth(chain)
      auth.onStateChange = () => this.pubsub.publish()

      this.chainEntries.set(chain.chainId, { auth, chain })
      this.currentChainId = chain.chainId
      // await this.getSmartWallet()
    } catch (error) {
      return Promise.reject(SnowballError.make('chain.switch', 'Error switching chain', error))
    }
  }

  async getSmartWallet(): Promise<SmartWallet> {
    const entry = this.chainEntries.get(this.currentChainId)!
    if (!entry.smartWallet) {
      entry.smartWallet = await this.opts.makeSmartWallet(
        entry.chain,
        await this.auth.getEthersWallet(),
      )
    }
    return entry.smartWallet
  }

  async getSmartWalletAddress(): Promise<Address> {
    return (await this.getSmartWallet()).getAddress()
  }

  subscribe(callback: () => void) {
    return this.pubsub.subscribe(callback)
  }
}
