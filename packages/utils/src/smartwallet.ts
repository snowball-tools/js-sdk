export enum SmartWalletProvider {
  alchemy = 'alchemy',
}

export enum AlchemySmartWalletProviderKey {
  ethereumGoerli = 'alchemyKey-goerli',
  ethereumGoerli_gasPolicyId = 'alchemyKey-goerli-gasPolicyId',
  ethereumSepolia = 'alchemyKey-sepolia',
  ethereumSepolia_gasPolicyId = 'alchemyKey-sepolia-gasPolicyId',
  baseMainnet = 'alchemyKey-baseMainnet',
  baseMainnet_gasPolicyId = 'alchemyKey-baseMainnet-gasPolicyId',
  baseGoerli = 'alchemyKey-baseGoerli',
  baseGoerli_gasPolicyId = 'alchemyKey-baseGoerli-gasPolicyId',
}

export const SmartWalletProviders = {
  alchemy: {
    name: SmartWalletProvider.alchemy,
    apiKeys: {},
  },
}
