import { AlchemySmartWallet } from '@snowballtools/smartwallet-alchemy'
import { SmartWalletApiKeys } from '@snowballtools/types'
import { SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

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

        return await AlchemySmartWallet.make(chain, signer, keys)
      }
    },
  },
}
