// Import specific files for better tree shaking
import type WebAuthnProvider from '@lit-protocol/lit-auth-client/src/lib/providers/WebAuthnProvider'

export { BaseProvider } from '@lit-protocol/lit-auth-client/src/lib/providers/BaseProvider'
export { LitAuthClient } from '@lit-protocol/lit-auth-client/src/lib/lit-auth-client'
export { getProviderFromUrl, isSignInRedirect } from '@lit-protocol/lit-auth-client/src/lib/utils'

export { WebAuthnProvider }
