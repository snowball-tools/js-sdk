import { AuthProviderInfo, AuthProviderName } from '@snowballtools/types'

// TODO: Not sure if this is actually used
export const AuthProviders: Record<AuthProviderName, AuthProviderInfo> = {
  lit: {
    name: 'lit',
    apiKeys: {},
  },
  turnkey: {
    name: 'turnkey',
    apiKeys: {},
  },
}
