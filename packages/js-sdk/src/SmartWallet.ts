import { Address } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

export interface SnowballSmartWallet {
  chain: SnowballChain
  getAddress(): Promise<Address>
}
