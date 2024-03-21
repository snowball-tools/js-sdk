import { Auth } from '@snowballtools/auth'
import { LitPasskey } from '@snowballtools/auth-lit'
import { TurkeyPasskey } from '@snowballtools/auth-turnkey'
import { AlchemySmartWallet, type SmartWallet } from '@snowballtools/smartwallet'
import type { AuthProviderInfo, Chain, SmartWalletProviderInfo } from '@snowballtools/types'
import { AuthProvider, SmartWalletProvider, alchemyAPIKey, viemChain } from '@snowballtools/utils'

import { AlchemyProvider } from '@alchemy/aa-alchemy'
import {
  type Address,
  type Hex,
  type SignTypedDataParams,
  type SmartAccountSigner,
  type UserOperationReceipt,
  type UserOperationResponse,
} from '@alchemy/aa-core'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers'
import type { TypedDataField } from 'ethers'
import type { Hash } from 'viem'

export class Snowball {
  private apiKey: string

  private chain: Chain

  private authProviderInfo: AuthProviderInfo

  private smartWalletProviderInfo: SmartWalletProviderInfo

  private auth: Auth

  private _smartWallet: SmartWallet | undefined

  constructor(
    apiKey: string,
    chain: Chain,
    authProviderInfo: AuthProviderInfo,
    smartWalletProviderInfo: SmartWalletProviderInfo,
  ) {
    this.apiKey = apiKey
    this.chain = chain
    this.authProviderInfo = authProviderInfo
    this.smartWalletProviderInfo = smartWalletProviderInfo

    this.auth = this.initAuth()
  }

  private initAuth(): Auth {
    switch (this.authProviderInfo.name) {
      case AuthProvider.turnkey:
        return new TurkeyPasskey(this.chain, this.authProviderInfo)
      default:
      case AuthProvider.lit:
        return new LitPasskey(this.chain, this.authProviderInfo)
    }
  }

  private async initSmartWallet(): Promise<SmartWallet> {
    if (this.smartWalletProviderInfo.name === SmartWalletProvider.alchemy) {
      const provider = new AlchemyProvider({
        chain: viemChain(this.chain),
        apiKey: alchemyAPIKey(this.chain, this.smartWalletProviderInfo.apiKeys),
        entryPointAddress: this.chain.entryPointAddress,
      })

      if (this.auth instanceof LitPasskey) {
        const pkpWallet = await (this.auth as LitPasskey).getEthersWallet()

        const signer: SmartAccountSigner = {
          signerType: 'PKP',
          inner: pkpWallet,
          signMessage: async (msg: Hex | Uint8Array | string) =>
            (await pkpWallet.signMessage(msg)) as Address,
          getAddress: async () => (await pkpWallet.getAddress()) as Address,
          signTypedData: async (params: SignTypedDataParams) => {
            const types: Record<string, TypedDataField[]> = {
              [params.primaryType]: params.types['x']!.map(
                (value) =>
                  ({
                    name: value.name,
                    type: value.type,
                  }) as TypedDataField,
              ),
            }

            return (await pkpWallet._signTypedData(
              params.domain ? params.domain : {},
              types,
              params.message,
            )) as Address
          },
        }

        return new AlchemySmartWallet(this.chain, this.smartWalletProviderInfo, provider, signer)
      }
      throw new Error('Unsupported auth provider')
    } else {
      throw new Error('Unsupported smart wallet provider')
    }
  }

  async register(username: string): Promise<void> {
    try {
      return await this.auth.register(username)
    } catch (error) {
      return Promise.reject(`register failed ${error}`)
    }
  }

  async authenticate(): Promise<void> {
    try {
      await this.auth.authenticate()
      this._smartWallet = await this.initSmartWallet()

      return void (await Promise.resolve())
    } catch (error) {
      return Promise.reject(`authenticate failed ${error}`)
    }
  }

  async getEthersWallet(): Promise<PKPEthersWallet> {
    try {
      return await this.auth.getEthersWallet()
    } catch (error) {
      return Promise.reject(`getEthersWallet failed ${error}`)
    }
  }

  async switchChain(chain: Chain) {
    try {
      this.chain = chain
      const smartWallet = await this.smartWallet()
      smartWallet.switchChain(chain)
    } catch (error) {
      return Promise.reject(`changeChain failed ${error}`)
    }
  }

  async getAddress(): Promise<Address> {
    try {
      const smartWallet = await this.smartWallet()
      return await smartWallet.getAddress()
    } catch (error) {
      return Promise.reject(`getAddress failed ${error}`)
    }
  }

  async sendUserOperation(
    target: Address,
    data: Hex,
    value?: bigint,
  ): Promise<{
    hash: string
  }> {
    try {
      const smartWallet = await this.smartWallet()
      return await smartWallet.sendUserOperation(target, data, value)
    } catch (error) {
      return Promise.reject(`sendUserOperation failed ${error}`)
    }
  }

  async sendSponsoredUserOperation(
    target: Address,
    data: Hex,
    value?: bigint,
  ): Promise<{
    hash: string
  }> {
    try {
      const smartWallet = await this.smartWallet()
      return await smartWallet.sendSponsoredUserOperation(target, data, value)
    } catch (error) {
      return Promise.reject(`sendSponsoredUserOperation failed ${error}`)
    }
  }

  async waitForUserOperationTransaction(hash: Hash): Promise<Hash> {
    try {
      const smartWallet = await this.smartWallet()
      return await smartWallet.waitForUserOperationTransaction(hash)
    } catch (error) {
      return Promise.reject(`waitForUserOperationTransaction failed ${error}`)
    }
  }

  async getUserOperationByHash(hash: Hash): Promise<UserOperationResponse | null> {
    try {
      const smartWallet = await this.smartWallet()
      return await smartWallet.getUserOperationByHash(hash)
    } catch (error) {
      return Promise.reject(`getUserOperationByHash failed ${error}`)
    }
  }

  async getUserOperationReceipt(hash: Hash): Promise<UserOperationReceipt | null> {
    try {
      const smartWallet = await this.smartWallet()
      return await smartWallet.getUserOperationReceipt(hash)
    } catch (error) {
      return Promise.reject(`getUserOperationReceipt failed ${error}`)
    }
  }

  // temp solution. going through a massive rewrite. expect initSmartWallet will grow exponentially -- much cleaner
  async smartWallet(): Promise<SmartWallet> {
    if (!this._smartWallet) {
      try {
        this._smartWallet = await this.initSmartWallet()
      } catch (error) {
        return Promise.reject(`smartWallet failed ${error}`)
      }
    }

    return this._smartWallet
  }
}
