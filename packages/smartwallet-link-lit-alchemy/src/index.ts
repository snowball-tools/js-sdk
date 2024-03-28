import { AlchemySmartWallet } from '@snowballtools/smartwallet-alchemy'
import { SmartWalletApiKeys } from '@snowballtools/types'
import { Hex, SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import { AlchemyProvider } from '@alchemy/aa-alchemy'
import { Address, SignTypedDataParams, SmartAccountSigner } from '@alchemy/aa-core'
import type { PKPEthersWallet } from '@lit-protocol/pkp-ethers'
import { TypedDataField } from 'ethers'

export type { PKPEthersWallet }

export const SmartWalletLinkAlchemyLit = {
  pkpEthersWallet: {
    configure(opts: { alchemyApiKeys: Record<number, SmartWalletApiKeys> }) {
      return function makeAlchemySmartWalletFromLitWallet(
        chain: SnowballChain,
        wallet: PKPEthersWallet,
      ) {
        const keys = opts.alchemyApiKeys[chain.chainId]
        const apiKey = keys?.apiKey
        if (!keys || !apiKey) {
          throw new SnowballError(
            `No Alchemy API key found for chain ${chain.name} (${chain.chainId})`,
            'LINK_ALCHEMY_LIT_NO_API_KEY',
          )
        }
        const signer: SmartAccountSigner = {
          signerType: 'PKP',
          inner: wallet,
          signMessage: async (msg: Hex | Uint8Array | string) =>
            (await wallet.signMessage(msg)) as Address,
          getAddress: async () => (await wallet.getAddress()) as Address,
          signTypedData: async (params: SignTypedDataParams) => {
            const types: Record<string, TypedDataField[]> = {
              [params.primaryType]: params.types['x']!.map((value) => ({
                name: value.name,
                type: value.type,
              })),
            }
            return (await wallet._signTypedData(
              params.domain ? params.domain : {},
              types,
              params.message,
            )) as Address
          },
        }
        const provider = new AlchemyProvider({
          chain: chain.toViemChain(),
          apiKey,
          entryPointAddress: chain.entryPointAddress,
        })

        return new AlchemySmartWallet(chain, provider, signer, keys)
      }
    },
  },
}
