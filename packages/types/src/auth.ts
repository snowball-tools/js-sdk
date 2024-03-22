export type AuthProviderName = 'lit' | 'turnkey'

export interface AuthProviderInfo {
  name: AuthProviderName
  apiKeys: { [key: string]: string }
  configs?: { [key: string]: string }
}
