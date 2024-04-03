import { Address, Hash, Hex, SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import { getDefaultLightAccountFactoryAddress } from '@alchemy/aa-accounts'
import { AlchemySmartAccountClient, createLightAccountAlchemyClient } from '@alchemy/aa-alchemy'
import {
  SendUserOperationParameters,
  SmartAccountSigner,
  SmartContractAccount,
  UserOperationReceipt,
  UserOperationResponse,
  WaitForUserOperationTxParameters,
} from '@alchemy/aa-core'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers'

type ApiKeys = {
  /** Make sure this matches with the chain you're trying to use! */
  apiKey: string
  /** Required for sendSponsoredUserOperation */
  gasPolicyId?: string
}

export class AlchemySmartWallet {
  ethersWallet: PKPEthersWallet | undefined

  static async make(chain: SnowballChain, signer: SmartAccountSigner, apiKeys: ApiKeys) {
    const client = await createLightAccountAlchemyClient({
      chain: chain.toViemChain(),
      rpcUrl: chain.alchemyRpcUrls(apiKeys.apiKey)[0],
      signer,
      factoryAddress: getDefaultLightAccountFactoryAddress(chain.toViemChain()),
      gasManagerConfig: apiKeys.gasPolicyId ? { policyId: apiKeys.gasPolicyId } : undefined,
    })
    return new AlchemySmartWallet(chain, client, apiKeys)
  }

  constructor(
    readonly chain: SnowballChain,
    readonly client: AlchemySmartAccountClient,
    private apiKeys: ApiKeys,
  ) {}

  async getAddress(): Promise<Address> {
    try {
      // TODO: Types are requiring an account field, but runtime does not
      //@ts-ignore
      const addr = await this.client.getAddress()
      return addr
    } catch (error) {
      throw new Error(`Failed to get address: ${error instanceof Error ? error.message : error}`)
    }
  }

  /** Convenience helper. For full configuration, use .client.sendUserOperation() */
  async sendUserOperation(
    uo: SendUserOperationParameters<SmartContractAccount | undefined>['uo'],
  ): Promise<{ hash: string }> {
    try {
      // TODO: Types are requiring an account field, but runtime does not
      //@ts-ignore
      const response = await this.client.sendUserOperation({
        uo,
      })
      return { hash: response.hash }
    } catch (error) {
      throw new Error(
        `Failed to send user operation: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  async waitForUserOperationTransaction(params: WaitForUserOperationTxParameters): Promise<Hash> {
    try {
      return await this.client.waitForUserOperationTransaction(params)
    } catch (error) {
      throw new Error(
        `Failed to wait for user operation transaction: ${
          error instanceof Error ? error.message : error
        }`,
      )
    }
  }

  async getUserOperationByHash(hash: Hash): Promise<UserOperationResponse | null> {
    try {
      return await this.client.getUserOperationByHash(hash)
    } catch (error) {
      throw new Error(
        `Failed to get user operation by hash: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  async getUserOperationReceipt(hash: Hash): Promise<UserOperationReceipt | null> {
    try {
      return await this.client.getUserOperationReceipt(hash)
    } catch (error) {
      throw new Error(
        `Failed to get user operation receipt: ${error instanceof Error ? error.message : error}`,
      )
    }
  }
}
