import { AuthStateLoadingAttrs, SnowballAuth } from './Auth'

export type PasskeysAuthState<AuthMethod, Wallet> = AuthStateLoadingAttrs &
  (
    | { name: 'init'; authMethod?: undefined; pkpWallet?: undefined }
    | { name: 'authenticated'; authMethod: AuthMethod; pkpWallet?: undefined }
    | { name: 'wallet-ready'; authMethod: AuthMethod; pkpWallet: Wallet }
  )

export abstract class SnowballPasskeyAuth<Wallet, AuthMethod> extends SnowballAuth<
  Wallet,
  PasskeysAuthState<AuthMethod, Wallet>
> {
  override _state: PasskeysAuthState<AuthMethod, Wallet> = { name: 'init' }

  abstract register(username: string): Promise<void>
  abstract authenticate(): Promise<void>

  reset() {
    this.setState({ name: 'init' })
  }
}
