import { AuthProvider } from '@snowballtools/utils'

export interface AuthProviderInfo {
  name: AuthProvider
  apiKeys: { [key: string]: string }
  configs?: { [key: string]: string }
}
