import { Address, SnowballError } from '@snowballtools/types'

import { Network } from 'alchemy-sdk'
import {
  type Chain as ViemChain,
  goerli as viem_goerli,
  mainnet as viem_mainnet,
  sepolia as viem_sepolia,
} from 'viem/chains'

const CHAINS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    type: 'ERC1155',
    enabled: false,
    rpcUrls: ['https://eth-mainnet.alchemyapi.io/v2/'],
    blockExplorerUrls: ['https://etherscan.io'],
    vmType: 'EVM',
    testNetwork: false,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address,
  },
  goerli: {
    chainId: 5,
    name: 'Goerli',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: ['https://eth-goerli.g.alchemy.com/v2/'],
    blockExplorerUrls: ['https://goerli.etherscan.io'],
    type: 'ERC1155',
    enabled: true,
    vmType: 'EVM',
    testNetwork: true,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address,
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    type: 'ERC1155',
    enabled: true,
    vmType: 'EVM',
    testNetwork: true,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address,
  },
  mantle: {
    chainId: 5000,
    name: 'Mantle',
    symbol: 'MNT',
    decimals: 18,
    type: 'ERC1155',
    enabled: false,
    rpcUrls: ['https://explorer.mantle.xyz/api/eth-rpc'],
    blockExplorerUrls: ['https://explorer.mantle.xyz/'],
    vmType: 'EVM',
    testNetwork: false,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
  },
  mantle_testnet: {
    chainId: 5001,
    name: 'Mantle Testnet',
    symbol: 'MNT',
    decimals: 18,
    type: 'ERC1155',
    enabled: false,
    rpcUrls: [
      'https://rpc.ankr.com/mantle_testnet/1a2aec0bfde1e926c21f0f91e0c90d35ec85093c8bbb9435137067b0f6e36056',
    ],
    blockExplorerUrls: ['https://explorer.testnet.mantle.xyz/'],
    vmType: 'EVM',
    testNetwork: true,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrls: ['https://polygon-rpc.com'],
    blockExplorerUrls: ['https://explorer.matic.network'],
    type: 'ERC1155',
    enabled: false,
    vmType: 'EVM',
    testNetwork: false,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
  },
  mumbai: {
    chainId: 80001,
    name: 'Mumbai',
    symbol: 'MATIC',
    decimals: 18,
    rpcUrls: ['https://rpc-mumbai.maticvigil.com/v1/'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com'],
    type: 'ERC1155',
    enabled: false,
    vmType: 'EVM',
    testNetwork: true,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    symbol: 'AETH',
    decimals: 18,
    type: 'ERC1155',
    enabled: false,
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    blockExplorerUrls: ['https://arbiscan.io/'],
    vmType: 'EVM',
    testNetwork: false,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: ['https://mainnet.optimism.io'],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    type: 'ERC1155',
    enabled: false,
    vmType: 'EVM',
    testNetwork: false,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
  },
  celo: {
    chainId: 42220,
    name: 'Celo',
    symbol: 'CELO',
    decimals: 18,
    rpcUrls: ['https://forno.celo.org'],
    blockExplorerUrls: ['https://explorer.celo.org'],
    type: 'ERC1155',
    enabled: false,
    vmType: 'EVM',
    testNetwork: false,
    factoryAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
    entryPointAddress: '0x3c752E964f94A6e45c9547e86C70D3d9b86D3b17' as Address,
  },
  base: {
    chainId: 8453,
    name: 'Base',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: ['https://base-mainnet.g.alchemy.com/v2/'],
    blockExplorerUrls: ['https://basescan.org'],
    type: 'ERC1155',
    enabled: true,
    vmType: 'EVM',
    testNetwork: false,
    factoryAddress: '0x74fcF00553D3699d845B616D5A9BF5256C984299' as Address,
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address,
  },
  base_goerli: {
    chainId: 84531,
    name: 'Base Goerli',
    symbol: 'ETH',
    decimals: 18,
    rpcUrls: ['https://base-goerli.g.alchemy.com/v2/'],
    blockExplorerUrls: ['https://goerli.basescan.org'],
    type: 'ERC1155',
    enabled: true,
    vmType: 'EVM',
    testNetwork: true,
    factoryAddress: '0x74fcF00553D3699d845B616D5A9BF5256C984299' as Address,
    entryPointAddress: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' as Address,
  },
}

export class SnowballChain {
  static ethereum = new SnowballChain(CHAINS.ethereum)
  static goerli = new SnowballChain(CHAINS.goerli)
  static sepolia = new SnowballChain(CHAINS.sepolia)
  static mantle = new SnowballChain(CHAINS.mantle)
  static mantle_testnet = new SnowballChain(CHAINS.mantle_testnet)
  static polygon = new SnowballChain(CHAINS.polygon)
  static mumbai = new SnowballChain(CHAINS.mumbai)
  static arbitrum = new SnowballChain(CHAINS.arbitrum)
  static optimism = new SnowballChain(CHAINS.optimism)
  static celo = new SnowballChain(CHAINS.celo)
  static base = new SnowballChain(CHAINS.base)
  static base_goerli = new SnowballChain(CHAINS.base_goerli)

  static toViemMap = new Map<number, ViemChain>([
    [SnowballChain.ethereum.chainId, viem_mainnet],
    [SnowballChain.goerli.chainId, viem_goerli],
    [SnowballChain.sepolia.chainId, viem_sepolia],
  ])

  static toAlchemyNetworkMap = new Map<number, Network>([
    [SnowballChain.ethereum.chainId, Network.ETH_MAINNET],
    [SnowballChain.goerli.chainId, Network.ETH_GOERLI],
    [SnowballChain.sepolia.chainId, Network.ETH_SEPOLIA],
  ])

  // Filled in below
  static byChainId = new Map<number, SnowballChain>()

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

  constructor(data: {
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
  }) {
    this.chainId = data.chainId
    this.name = data.name
    this.symbol = data.symbol
    this.decimals = data.decimals
    this.type = data.type
    this.enabled = data.enabled
    this.rpcUrls = data.rpcUrls
    this.blockExplorerUrls = data.blockExplorerUrls
    this.vmType = data.vmType
    this.testNetwork = data.testNetwork
    this.factoryAddress = data.factoryAddress
    this.entryPointAddress = data.entryPointAddress
  }

  alchemyRpcUrls(apiKey: string): string[] {
    // Normalize URLs to prevent mistakes
    return this.rpcUrls.map((rpcUrl) => `${rpcUrl.replace(/\/$/, '')}/${apiKey}`)
  }

  toViemChain(): ViemChain {
    const chain = SnowballChain.toViemMap.get(this.chainId)
    if (!chain) {
      throw new SnowballError(
        `Unsupported chain: ${this.name} (${this.chainId})`,
        'UNSUPPORTED_VIEM_CHAIN',
      )
    }
    return chain
  }

  toAlchemyNetwork(): Network {
    const network = SnowballChain.toAlchemyNetworkMap.get(this.chainId)
    if (!network) {
      throw new SnowballError(
        `Unsupported chain: ${this.name} (${this.chainId})`,
        'UNSUPPORTED_ALCHEMY_NETWORK',
      )
    }
    return network
  }
}

for (const chain of Object.values(CHAINS)) {
  SnowballChain.byChainId.set(chain.chainId, new SnowballChain(chain))
}
