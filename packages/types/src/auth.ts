export type AuthProviderName = 'lit' | 'turnkey'

export class SnowballError extends Error {
  static builder(name: string, message: string) {
    return (index: number, details: any) => {
      name = `${name}.${index}`
      return new SnowballError(message, name, details)
    }
  }

  constructor(
    message: string,
    public name: string,
    public details?: any,
  ) {
    super(`[Snowball]${message}`)
  }
}

export interface AuthProviderInfo {
  name: AuthProviderName
  apiKeys: { [key: string]: string }
  configs?: { [key: string]: string }
}
