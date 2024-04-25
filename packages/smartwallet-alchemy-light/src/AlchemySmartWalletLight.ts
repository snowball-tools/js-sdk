import type { Address, Hash } from '@snowballtools/types'
import type { SnowballChain } from '@snowballtools/utils'

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

export class AlchemySmartWalletLight {
  ethersWallet: PKPEthersWallet | undefined

  static async make(chain: SnowballChain, signer: SmartAccountSigner, apiKeys: ApiKeys) {
    const client = await createLightAccountAlchemyClient({
      chain: chain.toViemChain(),
      rpcUrl: chain.alchemyRpcUrls(apiKeys.apiKey)[0],
      signer,
      factoryAddress: getDefaultLightAccountFactoryAddress(chain.toViemChain()),
      gasManagerConfig: apiKeys.gasPolicyId ? { policyId: apiKeys.gasPolicyId } : undefined,
    })
    return new AlchemySmartWalletLight(chain, client, apiKeys)
  }

  constructor(
    readonly chain: SnowballChain,
    readonly client: AlchemySmartAccountClient,
    private apiKeys: ApiKeys,
  ) {}

  async getAddress(): Promise<Address> {
    // TODO: Types are requiring an account field, but runtime does not
    //@ts-ignore
    return await this.client.getAddress()
  }

  /** Convenience helper. For full configuration, use .client.sendUserOperation() */
  async sendUserOp(uo: SendUserOperationParameters<SmartContractAccount | undefined>['uo']) {
    // TODO: Types are requiring an account field, but runtime does not
    //@ts-ignore
    const response = await this.client.sendUserOperation({
      uo,
    })
    return { hash: response.hash }
  }

  async waitForUserOperationTransaction(params: WaitForUserOperationTxParameters): Promise<Hash> {
    return await this.client.waitForUserOperationTransaction(params)
  }

  async getUserOperationByHash(hash: Hash): Promise<UserOperationResponse | null> {
    return await this.client.getUserOperationByHash(hash)
  }

  async getUserOperationReceipt(hash: Hash): Promise<UserOperationReceipt | null> {
    return await this.client.getUserOperationReceipt(hash)
  }
}
