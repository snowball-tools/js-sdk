import { SnowballAuth } from '@snowballtools/auth'
import { MakeAuthOptions } from '@snowballtools/js-sdk'
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
    | { name: 'init' }
    | { name: 'waiting-for-otp'; otp_uuid: string }
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
    return (makeOpts: MakeAuthOptions, prevState: any) => {
      const instance = new this({ ...opts, ...makeOpts })
      // State is consistent across evm chains
      // TODO: Handle prevState for different chains (e.g. solana)
      prevState && (instance._state = prevState)
      return instance
    }
  }

  constructor(public opts: EmbeddedConfigOptions & MakeAuthOptions) {
    super(opts.rpcClient, opts.chain)
    this.log('init')
    this._state = { name: 'init' }
  }

  async sendOtp(args: { email: string }) {
    this.setLoading('emb:sendOtp', 'Sending OTP')
    const res = await this._rpcClient.sendOtp({ auth: { type: 'email', value: args.email } })
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
    const res = await this._rpcClient.verifyOtp({
      uuid: this.state.otp_uuid,
      code: args.code,
    })
    if (!res.ok) return this.setErr(res)

    this.setState({ name: 'authenticated-no-passkey', user: res.value.user })

    if (!res.value.user.wallets.length) {
      return res
    }

    const wallet = await this.getWallet()

    if (!wallet) {
      this.log('Unable to create wallet')
      return res
    }

    this.setState({
      name: 'wallet-ready',
      user: res.value.user,
      wallet,
    })
    return res
  }

  async login() {
    this.setLoading('emb:getAuthConfig', 'Retrieving auth config')
    const config = await this._rpcClient.getAuthConfig({})
    if (!config.ok) return this.setErr(config)

    this.setLoading('emb:login:passkey', 'Logging in')
    const assertion = await err.catch(
      'assertion_failed',
      'e4862734',
      assertLogin({ challenge: config.value.loginChallenge }),
    )
    if (!assertion.ok) return this.setErr(assertion)

    this.setLoading('emb:login:rpc', 'Logging in')
    const login = await this._rpcClient.loginPasskey({ assertion: assertion.value })
    if (!login.ok) return this.setErr(login)

    this.setState({ name: 'authenticated-no-passkey', user: login.value.user })
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
    const config = await this._rpcClient.getAuthConfig({})
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
    const connect = await this._rpcClient.pu_connectPasskey({
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
    if (this.state.name !== 'authenticated-no-passkey') {
      return this.setError(
        new SnowballError('EmbeddedAuth.getWallet', `Invalid state: ${this.state.name}`),
      )
    }
    this.setLoading('emb:getWalletConfig', 'Retrieving wallet')
    const [config, walletConfig] = await Promise.all([
      this._rpcClient.getAuthConfig({}),
      this._rpcClient.pu_getWalletConfig({}),
    ])
    if (!config.ok) return this.rejectErr(config)
    if (!walletConfig.ok) return this.rejectErr(walletConfig)

    this.setLoading('emb:getWalletClient', 'Retrieving wallet')
    const provider = walletConfig.value.provider
    const wallet = await getWalletClient({
      rpId: config.value.turnkey.rpId,
      chain: this.chain,
      baseUrl: config.value.turnkey.apiBaseUrl,
      credentialIds: this.state.user.passkeys.map((passkey) => passkey.credentialId),
      organizationId: walletConfig.value.organizationId,
      walletAddress: this.state.user.wallets[0]!.accounts[0]!.address,
      transport: http(
        provider.type === 'key-a'
          ? this.chain.alchemyRpcUrls(provider.value)[0]
          : provider.type === 'url'
            ? provider.value
            : '',
      ),
    })
    this.setState({ name: 'wallet-ready', user: this.state.user, wallet })
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

  reset() {
    this.setState({ name: 'init' })
  }

  getSessionExpirationTime(): number {
    return this._rpcClient.getSessionExpirationTime()
  }
}
