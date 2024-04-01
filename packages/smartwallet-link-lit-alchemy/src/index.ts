import { AlchemySmartWallet } from '@snowballtools/smartwallet-alchemy'
import { SmartWalletApiKeys } from '@snowballtools/types'
import { SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import { Address, SmartAccountSigner } from '@alchemy/aa-core'
import type { PKPEthersWallet } from '@lit-protocol/pkp-ethers'

import { PkpLitSigner } from './PkpLitSigner'

export type { PKPEthersWallet }

export type LinkOptions = {
  alchemyApiKeys: Record<number, SmartWalletApiKeys>
}

export const SmartWalletLinkAlchemyLit = {
  pkpEthersWallet: {
    configure(opts: LinkOptions) {
      return async function makeAlchemySmartWalletFromLitWallet(
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

        const signer = new PkpLitSigner(wallet)
        // const signer: SmartAccountSigner = {
        //   signerType: 'PKP',
        //   inner: wallet,
        //   signMessage: async (msg) =>
        //     (await wallet.signMessage(typeof msg === 'string' ? msg : msg.raw)) as Address,
        //   getAddress: async () => (await wallet.getAddress()) as Address,
        //   signTypedData: async (params) => {
        //     return (await wallet._signTypedData(
        //       params.domain ? params.domain : {},
        //       params.types as any,
        //       params.message as Record<string, any>,
        //     )) as Address
        //   },
        // }
        // const provider = new AlchemyProvider({
        //   chain: chain.toViemChain(),
        //   apiKey,
        //   entryPointAddress: chain.entryPointAddress,
        // })

        // const client = await createLightAccountAlchemyClient({
        //   chain: chain.toViemChain(),
        //   apiKey,
        //   signer,
        // })

        // const smartAccountClient = createSmartAccountClient({
        //   account: provider.account,
        //   transport: provider.transport,
        // })

        return await AlchemySmartWallet.make(chain, signer, keys)
      }
    },
  },
}
