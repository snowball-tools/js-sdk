import { ErrResult } from '@snowballtools/types'
import { OkResult } from '@snowballtools/types'
import { ExtendedJSON, makePubSub } from '@snowballtools/utils/src'

import { EmbeddedAuthBase, EmbeddedConfigOptions, EmbeddedWalletClientParams } from './EmbeddedAuthBase'
import { IframeWallet } from './IframeWallet'
import { MakeAuthOptions } from './Snowball'
import { IframeInput, IframeOutput, err, ok } from './rpc-client'

export class EmbeddedIframeAuth extends EmbeddedAuthBase<IframeWallet> {
  static className = 'EmbeddedAuthIframe' as const
  override readonly className = 'EmbeddedAuthIframe' as const

  _iframe?: IframeApi

  static configure(opts: EmbeddedConfigOptions) {
    return (makeOpts: MakeAuthOptions, prev?: EmbeddedIframeAuth) => {
      const instance = new this(makeOpts, opts)
      if (prev && makeOpts.chain.vmType === prev?.chain.vmType) {
        // Share auth state
        instance._state = prev._state

        // Create new wallet client with new chain
        if (prev.state.name === 'wallet-ready' && prev._wallet) {
          const params = {
            ...prev._wallet.params,
            chain: makeOpts.chain,
          }
          const client = instance.makeWalletClient(params)
          instance._wallet = { client, params }
        }
      }
      return instance
    }
  }

  async login() {
    this.setLoading('emb:getAuthConfig', 'Retrieving auth config')
    const config = await this.rpc.getAuthConfig({})
    if (!config.ok) return this.setErr(config)

    this.setLoading('emb:login:iframe', 'Logging in')
    const iframe = this.getIframe(config.value.iframeWalletUrl)
    const loginRes = await iframe.login()
    if (!loginRes.ok) return this.setErr(loginRes)

    // this.setState({ ...this.state, user: login.value.user })

    await this.getWallet()

    return ok({})
  }

  makeWalletClient(params: EmbeddedWalletClientParams) {
    // const httpClient = new TurnkeyClient(
    //   {
    //     baseUrl: params.baseUrl, // "https://api.turnkey.com",
    //   },
    //   new WebauthnStamper({
    //     rpId: params.rpId,
    //     allowCredentials: params.credentialIds.map((credentialId) => ({
    //       id: base64UrlDecode(credentialId),
    //       type: 'public-key',
    //     })),
    //   }),
    // )

    // // Create the Viem custom account
    // const turnkeyAccount = createAccountSync({
    //   client: httpClient,
    //   organizationId: params.organizationId,
    //   signWith: params.walletAddress,
    // })

    // const wallet = createWalletClient({
    //   account: turnkeyAccount,
    //   chain: params.chain.toViemChain(),
    //   transport: http(params.transportUrl),
    // })
    // return wallet
    return {} as any
  }

  async assertLogin() {
    // Not needed for iframe auth
    return {} as any
  }

  async attestPasskey() {
    // Not needed for iframe auth
    return {} as any
  }

  getIframe(url: string) {
    return (this._iframe ||= IframeApi.make(url))
  }
}

class IframeApi {
  private iframe: HTMLIFrameElement
  pubsub = makePubSub<[IframeOutput]>()
  constructor(public url: string) {
    this.iframe = document.createElement('iframe')
    this.iframe.src = url
    this.iframe.style.display = 'none'
    document.body.appendChild(this.iframe)
    window.addEventListener('message', (e) => {
      const msg = ExtendedJSON.parse(e.data)
      this.pubsub.publish(msg)
    })
  }

  async login() {
    this.send({ type: 'get-session' })
    return this.receive(['auth', 'no-session'])
  }

  private send(msg: IframeInput) {
    if (!this.iframe.contentWindow) {
      throw new Error('Iframe contentWindow not available')
    }
    this.iframe.contentWindow!.postMessage(ExtendedJSON.stringify(msg), this.url)
  }

  private receive<T extends IframeOutput['type']>(
    types: T[],
    opts = { timeout: 30 },
  ): Promise<OkResult<Filter<IframeOutput, { type: T }>> | ErrResult<'iframe_timeout'>> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        unsub()
        resolve(err('iframe_timeout', 'e57134495'))
      }, opts.timeout * 1000)

      const unsub = this.pubsub.subscribe((msg) => {
        if (types.includes(msg.type as any)) {
          clearTimeout(timeoutId)
          unsub()
          resolve(msg as any)
        }
      })
    })
  }
}

type Filter<T, U> = T extends U ? T : never
