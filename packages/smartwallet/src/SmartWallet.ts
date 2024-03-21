import type { Chain } from '@snowballtools/types'

import { type Address, UserOperationReceipt, UserOperationResponse } from '@alchemy/aa-core'
import type { PKPEthersWallet } from '@lit-protocol/pkp-ethers'
import { Hash, Hex } from 'viem'

/**
 * Interface for the SnowBall SDK Smart Wallet.
 */
export interface SmartWallet {
  /** Ethers wallet associated with the smart wallet. */
  ethersWallet: PKPEthersWallet | undefined

  /** Retrieves the contract address of this smart wallet. */
  getAddress(): Promise<Address>

  /**
   * Switches the current chain.
   * @param chain The chain to switch to.
   */
  switchChain(chain: Chain): Promise<void>

  /**
   * Sends a user operation.
   * @param target The target address.
   * @param data The data to send.
   * @param value The value to send, if any.
   * @returns The hash of the operation.
   */
  sendUserOperation(target: Address, data: Hex, value?: bigint): Promise<{ hash: string }>

  /**
   * Sends a sponsor user operation.
   * @param target The target address.
   * @param data The data to send.
   * @param value The value to send, if any.
   * @returns The hash of the operation.
   */
  sendSponsoredUserOperation(target: Address, data: Hex, value?: bigint): Promise<{ hash: string }>

  /** Waits for a user operation transaction to complete.
   * @param hash The hash of the operation.
   */
  waitForUserOperationTransaction(hash: Hash): Promise<Hash>

  /** Retrieves a user operation by its hash.
   * @param hash The hash of the operation.
   */
  getUserOperationByHash(hash: Hash): Promise<UserOperationResponse | null>

  /** Retrieves a receipt for a user operation.
   * @param hash The hash of the operation.
   */
  getUserOperationReceipt(hash: Hash): Promise<UserOperationReceipt | null>
}
