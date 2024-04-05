import { SnowballAuth, SnowballSmartWallet } from '@snowballtools/auth'
import { Address } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

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
  private currentChainId: number

  static Chain = SnowballChain

  // Builder for type inference
  static withAuth<A extends SnowballAuth<any, any>>(makeAuth: (chain: SnowballChain) => A) {
    return {
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
    const chain = this.opts.chain

    this.chainEntries.set(chain.chainId, {
      auth: this.opts.makeAuth(chain),
      chain,
    })
    this.currentChainId = chain.chainId
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
      this.chainEntries.set(chain.chainId, {
        auth: this.opts.makeAuth(chain),
        chain,
      })
      this.currentChainId = chain.chainId
      await this.getSmartWallet()
    } catch (error) {
      return Promise.reject(`changeChain failed ${error}`)
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
}
