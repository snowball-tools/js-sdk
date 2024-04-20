import { SnowballLitAuth } from './LitAuth'

export abstract class LitOAuth extends SnowballLitAuth {
  abstract startOAuthRedirect(redirectUri?: string): Promise<void>
  abstract handleOAuthRedirectBack(redirectUri?: string): Promise<boolean>
  abstract canHandleOAuthRedirectBack(redirectUri?: string): boolean
}
