import { Address } from '@snowballtools/types'
import type { SnowballChain } from '@snowballtools/utils'

export abstract class SnowballAuth<Wallet, State = {}> {
  onStateChange?: (state: State) => void

  constructor(protected _chain: SnowballChain) {}

  abstract getEthersWallet(): Promise<Wallet>
  abstract getEthersWalletAddress(): Promise<Address>

  get chain() {
    return this._chain
  }
}
