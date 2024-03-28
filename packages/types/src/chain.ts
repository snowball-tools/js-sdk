import { Address } from './prims'

export interface Chain {
  chainId: number
  name: string
  symbol: string
  decimals: number
  type: string
  enabled: boolean
  rpcUrls: string[]
  blockExplorerUrls: string[]
  vmType: string
  testNetwork: boolean
  factoryAddress: Address
  entryPointAddress: Address
}
