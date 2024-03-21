import { SmartWalletProvider } from '@snowballtools/utils'

export interface SmartWalletProviderInfo {
  name: SmartWalletProvider
  apiKeys: { [key: string]: string }
  configs?: { [key: string]: string }
}
