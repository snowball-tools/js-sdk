import { MakeAuthOptions } from '@snowballtools/js-sdk'

import { TurnkeyClient, getWebAuthnAssertion } from '@turnkey/http'
import { Turnkey, WebauthnStamper } from '@turnkey/sdk-browser'
import { createAccountSync } from '@turnkey/viem'
import { createWalletClient } from 'viem'

import {
  AttestParams,
  EmbeddedAuthBase,
  EmbeddedConfigOptions,
  LoginParams,
  LoginPayload,
  WalletClientParams,
} from './EmbeddedAuthBase'
import { base64UrlDecode, renderTimestamp } from './helpers'

export class EmbeddedAuth extends EmbeddedAuthBase {
  static className = 'EmbeddedAuth' as const
  override readonly className = 'EmbeddedAuth' as const

  static configure(opts: EmbeddedConfigOptions) {
    return (makeOpts: MakeAuthOptions, prev?: EmbeddedAuth) => {
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

  makeWalletClient(params: WalletClientParams) {
    const httpClient = new TurnkeyClient(
      {
        baseUrl: params.baseUrl, // "https://api.turnkey.com",
      },
      new WebauthnStamper({
        rpId: params.rpId,
        allowCredentials: params.credentialIds.map((credentialId) => ({
          id: base64UrlDecode(credentialId),
          type: 'public-key',
        })),
      }),
    )

    // Create the Viem custom account
    const turnkeyAccount = createAccountSync({
      client: httpClient,
      organizationId: params.organizationId,
      signWith: params.walletAddress,
    })

    const wallet = createWalletClient({
      account: turnkeyAccount,
      chain: params.chain.toViemChain(),
      transport: params.transport,
    })
    return wallet
  }

  async assertLogin({ challenge }: LoginParams) {
    return JSON.parse(await getWebAuthnAssertion(challenge)) as LoginPayload
  }

  async attestPasskey(params: AttestParams) {
    const turnkey = new Turnkey({
      rpId: params.rpId,
      apiBaseUrl: params.apiBaseUrl,
      defaultOrganizationId: params.orgId,
      serverSignUrl: params.serverSignUrl,
    })
    const passkeyClient = turnkey.passkeyClient()

    const credential = await passkeyClient.createUserPasskey({
      publicKey: {
        user: {
          name: params.name,
          displayName: `${params.name} (${renderTimestamp()})`,
        },
      },
    })

    return { credential }
  }
}
