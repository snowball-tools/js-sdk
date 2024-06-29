import { MakeAuthOptions, SnowballAuth } from '@snowballtools/js-sdk'
import { ErrsOf, err, ok } from '@snowballtools/types'
import { ApiValues } from '@snowballtools/types'
import { SnowballError } from '@snowballtools/types'

import { Chain, LocalAccount, Transport, WalletClient, http } from 'viem'

import { assertLogin, getWalletClient, turnkeyAttestPasskey } from './helpers'

type User = ApiValues['pu_whoami']

export type EmbeddedAuthMethod = 'email'

export type EmbeddedAuthMethodConfig = {
  email: boolean
}

export type EmbeddedAuthState = AuthStateLoadingAttrs &
  (
    | { name: 'initializing'; user?: User }
    | { name: 'no-session'; user?: User }
    | { name: 'waiting-for-otp'; otp_uuid: string; user?: User }
    | { name: 'authenticated-no-passkey'; user: User }
    | { name: 'wallet-ready'; user: User; wallet: Wallet }
  )

type AuthStateLoadingAttrs = {
  /** A string describing the currently loading step, if any. */
  loading?: { code: string; message: string }
  /** Error details for attempting to transition from this state to the next one. */
  error?: ErrsOf<EmbeddedAuth['sendOtp' | 'verifyOtp' | 'login' | 'createPasskey']>
}

export type EmbeddedConfigOptions = {
  auth: Partial<EmbeddedAuthMethodConfig>
}

interface Wallet extends WalletClient<Transport, Chain, LocalAccount> {}

export class EmbeddedAuth extends SnowballAuth<Wallet, EmbeddedAuthState> {
  static className = 'EmbeddedAuth' as const
  override readonly className = 'EmbeddedAuth' as const

  override get state() {
    return this._state as EmbeddedAuthState
  }

  static configure(opts: EmbeddedConfigOptions) {
    return (makeOpts: MakeAuthOptions, prev?: EmbeddedAuth) => {
      const instance = new this({ ...makeOpts, rpc: prev?.rpc }, opts)
      if (prev) {
        // State is consistent across evm chains
        // TODO: Handle prev for different chains (e.g. solana)
        instance._state = prev._state
      }
      return instance
    }
  }

  static readonly STORAGE_KEY = 'sb_eth_auth'

  constructor(
    makeOpts: MakeAuthOptions,
    private opts: EmbeddedConfigOptions,
  ) {
    // TODO: Handle different chains for storageKey (e.g. solana)
    super({ ...makeOpts, storageKey: EmbeddedAuth.STORAGE_KEY })
    this.log('init')
    this._state = { name: 'initializing' }
  }

  async initUserSession() {
    if (this.state.name !== 'initializing' || this.state.loading) return

    this.setLoading('emb:initUserSession', 'Initializing user session')
    const user = await this.getUser()
    if (!user) return this.setState({ name: 'no-session' })

    if (user.wallets.length) {
      this.setLoading('emb:initWallet', 'Initializing wallet')
      this.setState({ name: 'initializing', user })
      await this.getWallet()
    } else {
      // [ASSUMPTION]: If user has no wallets, then they must not have a passkey
      this.setState({ name: 'authenticated-no-passkey', user })
    }
  }

  async sendOtp(args: { email: string }) {
    this.setLoading('emb:sendOtp', 'Sending OTP')
    const res = await this.rpc.sendOtp({ auth: { type: 'email', value: args.email } })
    if (!res.ok) return this.setErr(res)
    this.setState({ name: 'waiting-for-otp', otp_uuid: res.value.uuid })
    return res
  }

  async verifyOtp(args: { code: string }) {
    if (this.state.name !== 'waiting-for-otp') {
      return this.setErr(
        err('invalid_state', 'e5725223', { meta: { expected_state: 'waiting-for-otp' } }),
      )
    }
    this.setLoading('emb:verifyOtp', 'Verifying OTP')
    const res = await this.rpc.verifyOtp({
      uuid: this.state.otp_uuid,
      code: args.code,
    })
    if (!res.ok) return this.setErr(res)

    if (!res.value.user.wallets.length) {
      this.setState({ name: 'authenticated-no-passkey', user: res.value.user })
      return res
    }

    this.setState({ ...this.state, user: res.value.user })
    const wallet = await this.getWallet()

    if (!wallet) {
      this.log('Unable to create wallet')
      return res
    }
    return res
  }

  async login() {
    this.setLoading('emb:getAuthConfig', 'Retrieving auth config')
    const config = await this.rpc.getAuthConfig({})
    if (!config.ok) return this.setErr(config)

    this.setLoading('emb:login:passkey', 'Logging in')
    const assertion = await err.catch(
      'assertion_failed',
      'e4862734',
      assertLogin({ challenge: config.value.loginChallenge }),
    )
    if (!assertion.ok) return this.setErr(assertion)

    this.setLoading('emb:login:rpc', 'Logging in')
    const login = await this.rpc.loginPasskey({ assertion: assertion.value })
    if (!login.ok) return this.setErr(login)

    this.setState({ ...this.state, user: login.value.user })

    // [ASSUMPTION]: If passkey auth worked, then user must have a wallet
    await this.getWallet()

    return ok({})
  }

  async createPasskey({ name }: { name?: string }) {
    if (this.state.name !== 'authenticated-no-passkey') {
      return this.setErr(
        err('invalid_state', 'e6229558', { meta: { expected_state: 'authenticated' } }),
      )
    }

    const email = this.state.user.authMethods.find((m) => m.type === 'email')?.value
    if (!email) return this.setErr(err('email_not_found', 'e574623491'))

    this.setLoading('emb:getAuthConfig', 'Retrieving auth config')
    const config = await this.rpc.getAuthConfig({})
    if (!config.ok) return this.setErr(config)

    this.setLoading('emb:attest', 'Attesting passkey')
    const turnkey = config.value.turnkey
    const attest = await err.catch(
      'attest_failed',
      'e519443',
      turnkeyAttestPasskey({
        rpId: turnkey.rpId,
        name: name ? `${name} - ${email}` : email,
        orgId: turnkey.orgId,
        apiBaseUrl: turnkey.apiBaseUrl,
      }),
    )
    if (!attest.ok) return this.setErr(attest)

    this.setLoading('emb:connectPasskey', 'Creating new user')
    const connect = await this.rpc.pu_connectPasskey({
      challenge: attest.value.credential.encodedChallenge,
      attestation: attest.value.credential.attestation,
    })
    if (!connect.ok) return this.setErr(connect)

    this.setState({ name: 'authenticated-no-passkey', user: connect.value.user })
    await this.getWallet()

    return ok({})
  }

  async getWallet() {
    if (this.state.name === 'wallet-ready') {
      return this.state.wallet
    }
    if (!('user' in this.state) || !this.state.user) {
      return this.setError(
        new SnowballError('EmbeddedAuth.getWallet', `Invalid state: ${this.state.name}`),
      )
    }
    const user = this.state.user

    this.setLoading('emb:getWalletConfig', 'Retrieving wallet')
    const [config, walletConfig] = await Promise.all([
      this.rpc.getAuthConfig({}),
      this.rpc.pu_getWalletConfig({}),
    ])
    if (!config.ok) return this.rejectErr(config)
    if (!walletConfig.ok) return this.rejectErr(walletConfig)

    this.setLoading('emb:getWalletClient', 'Retrieving wallet')
    const provider = walletConfig.value.provider
    const wallet = await getWalletClient({
      rpId: config.value.turnkey.rpId,
      chain: this.chain,
      baseUrl: config.value.turnkey.apiBaseUrl,
      credentialIds: user.passkeys.map((passkey) => passkey.credentialId),
      organizationId: walletConfig.value.organizationId,
      walletAddress: user.wallets[0]!.accounts[0]!.address,
      transport: http(
        provider.type === 'key-a'
          ? this.chain.alchemyRpcUrls(provider.value)[0]
          : provider.type === 'url'
            ? provider.value
            : '',
      ),
    })
    this.setState({ name: 'wallet-ready', user, wallet })
    return wallet
  }

  get wallet() {
    return this.state.name === 'wallet-ready' ? this.state.wallet : null
  }

  async getWalletAddresses() {
    if (this.state.name !== 'wallet-ready') {
      return []
    }
    return this.state.user.wallets[0]!.accounts.map((a) => a.address)
  }

  get user() {
    return 'user' in this.state ? this.state.user : null
  }

  logout() {
    this.setState({ name: 'no-session' })
    this.rpc.logout()
  }

  getSessionExpirationTime(): number {
    return this.rpc.getSessionExpirationTime()
  }
}
