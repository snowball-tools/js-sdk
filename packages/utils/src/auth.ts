export enum AuthProvider {
  lit = 'lit',
  turnkey = 'turnkey',
}

export const AuthProviders = {
  lit: {
    name: AuthProvider.lit,
    apiKeys: {},
  },
  turnkey: {
    name: AuthProvider.turnkey,
    apiKeys: {},
  },
}
