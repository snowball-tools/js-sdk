import { AlchemyProvider } from '@alchemy/aa-alchemy';
import { Hash } from 'viem';
import {
	SmartAccountSigner,
	UserOperationCallData,
	UserOperationReceipt,
	UserOperationResponse,
} from '@alchemy/aa-core';
import { Address, Hex } from 'viem';
import {
	LightSmartContractAccount,
	getDefaultLightAccountFactoryAddress,
} from '@alchemy/aa-accounts';
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers';

import { viemChain, alchemyGasPolicyId } from '@snowballtools/utils';
import { SmartWallet } from './SmartWallet';
import type { SmartWalletProviderInfo, Chain } from '@snowballtools/types';

export class AlchemySmartWallet
	extends LightSmartContractAccount
	implements SmartWallet
{
	ethersWallet: PKPEthersWallet | undefined;
	provider: AlchemyProvider;
	smartWalletProviderInfo: SmartWalletProviderInfo;
	chain: Chain;

	constructor(
		chain: Chain,
		authProviderInfo: SmartWalletProviderInfo,
		provider: AlchemyProvider,
		signer: SmartAccountSigner,
	) {
		super({
			rpcClient: provider.rpcClient,
			owner: signer,
			chain: viemChain(chain),
			factoryAddress: getDefaultLightAccountFactoryAddress(viemChain(chain)),
		});
		this.chain = chain;
		this.provider = provider;
		this.smartWalletProviderInfo = authProviderInfo;
	}

	override async getAddress(): Promise<Address> {
		try {
			return await this.provider.getAddress();
		} catch (error) {
			throw new Error(
				`Failed to get address: ${
					error instanceof Error ? error.message : error
				}`,
			);
		}
	}

	async switchChain(chain: Chain): Promise<void> {
		this.chain = chain;
	}

	async sendUserOperation(
		target: Address,
		data: Hex,
		value?: bigint,
	): Promise<{ hash: string }> {
		try {
			const userOperationCallData: UserOperationCallData = {
				target: target,
				data: data,
				value: value,
			};
			const response = await this.provider.sendUserOperation(
				userOperationCallData,
			);
			return { hash: response.hash };
		} catch (error) {
			throw new Error(
				`Failed to send user operation: ${
					error instanceof Error ? error.message : error
				}`,
			);
		}
	}

	async sendSponsoredUserOperation(
		target: Address,
		data: Hex,
		value?: bigint,
	): Promise<{ hash: string }> {
		try {
			this.provider = this.provider.withAlchemyGasManager({
				policyId: alchemyGasPolicyId(
					this.chain,
					this.smartWalletProviderInfo.apiKeys,
				),
			});

			const response = await this.sendUserOperation(target, data, value);
			return { hash: response.hash };
		} catch (error) {
			throw new Error(
				`Failed to send sponsor user operation: ${
					error instanceof Error ? error.message : error
				}`,
			);
		}
	}

	async waitForUserOperationTransaction(hash: Hash): Promise<Hash> {
		try {
			return await this.provider.waitForUserOperationTransaction(hash);
		} catch (error) {
			throw new Error(
				`Failed to wait for user operation transaction: ${
					error instanceof Error ? error.message : error
				}`,
			);
		}
	}

	async getUserOperationByHash(
		hash: Hash,
	): Promise<UserOperationResponse | null> {
		try {
			return await this.provider.getUserOperationByHash(hash);
		} catch (error) {
			throw new Error(
				`Failed to get user operation by hash: ${
					error instanceof Error ? error.message : error
				}`,
			);
		}
	}

	async getUserOperationReceipt(
		hash: Hash,
	): Promise<UserOperationReceipt | null> {
		try {
			return await this.provider.getUserOperationReceipt(hash);
		} catch (error) {
			throw new Error(
				`Failed to get user operation receipt: ${
					error instanceof Error ? error.message : error
				}`,
			);
		}
	}
}
