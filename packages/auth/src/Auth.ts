import type { Chain } from '@snowballtools/types'
import { Address } from '@snowballtools/types'

export abstract class SnowballAuth<Wallet, State = {}> {
  onStateChange?: (state: State) => void

  constructor(protected _chain: Chain) {}

  abstract getEthersWallet(): Promise<Wallet>
  abstract getEthersWalletAddress(): Promise<Address>

  get chain() {
    return this._chain
  }
}
