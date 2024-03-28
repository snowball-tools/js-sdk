import { Address, Hash, Hex, SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import {
  LightSmartContractAccount,
  getDefaultLightAccountFactoryAddress,
} from '@alchemy/aa-accounts'
import { AlchemyProvider } from '@alchemy/aa-alchemy'
import {
  SmartAccountSigner,
  UserOperationCallData,
  UserOperationReceipt,
  UserOperationResponse,
} from '@alchemy/aa-core'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers'

type ApiKeys = {
  /** Not required at this time; presumably `signer` is already using this */
  apiKey?: string
  /** Required for sendSponsoredUserOperation */
  gasPolicyId?: string
}

export class AlchemySmartWallet extends LightSmartContractAccount {
  ethersWallet: PKPEthersWallet | undefined

  constructor(
    readonly chain: SnowballChain,
    private provider: AlchemyProvider,
    signer: SmartAccountSigner,
    private apiKeys: ApiKeys,
  ) {
    super({
      rpcClient: provider.rpcClient,
      owner: signer,
      chain: chain.toViemChain(),
      factoryAddress: getDefaultLightAccountFactoryAddress(chain.toViemChain()),
    })
    this.chain = chain
    this.provider = provider
  }

  override async getAddress(): Promise<Address> {
    try {
      return await this.provider.getAddress()
    } catch (error) {
      throw new Error(`Failed to get address: ${error instanceof Error ? error.message : error}`)
    }
  }

  async sendUserOperation(target: Address, data: Hex, value?: bigint): Promise<{ hash: string }> {
    try {
      const userOperationCallData: UserOperationCallData = {
        target: target,
        data: data,
        value: value,
      }
      const response = await this.provider.sendUserOperation(userOperationCallData)
      return { hash: response.hash }
    } catch (error) {
      throw new Error(
        `Failed to send user operation: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  async sendSponsoredUserOperation(
    target: Address,
    data: Hex,
    value?: bigint,
  ): Promise<{ hash: string }> {
    const { gasPolicyId } = this.apiKeys
    if (!gasPolicyId) {
      throw new SnowballError(
        'No gas policy ID provided for sponsored user operation',
        'SMARTWALLET_ALCHEMY_NO_GAS_POLICY_ID',
      )
    }
    try {
      this.provider = this.provider.withAlchemyGasManager({
        policyId: gasPolicyId,
      })

      const response = await this.sendUserOperation(target, data, value)
      return { hash: response.hash }
    } catch (error) {
      throw new Error(
        `Failed to send sponsor user operation: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  async waitForUserOperationTransaction(hash: Hash): Promise<Hash> {
    try {
      return await this.provider.waitForUserOperationTransaction(hash)
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
      return await this.provider.getUserOperationByHash(hash)
    } catch (error) {
      throw new Error(
        `Failed to get user operation by hash: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  async getUserOperationReceipt(hash: Hash): Promise<UserOperationReceipt | null> {
    try {
      return await this.provider.getUserOperationReceipt(hash)
    } catch (error) {
      throw new Error(
        `Failed to get user operation receipt: ${error instanceof Error ? error.message : error}`,
      )
    }
  }
}
