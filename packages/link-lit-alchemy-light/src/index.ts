import { AlchemySmartWalletLight } from '@snowballtools/smartwallet-alchemy-light'
import { SmartWalletApiKeys } from '@snowballtools/types'
import { SnowballError } from '@snowballtools/types'
import { SnowballChain } from '@snowballtools/utils'

import type { PKPEthersWallet } from '@lit-protocol/pkp-ethers'

import { PkpLitSigner } from './PkpLitSigner'

export type { PKPEthersWallet }

export type LinkOptions = {
  alchemyApiKeys: Record<number, SmartWalletApiKeys>
}

export const LinkLitAlchemyLight = {
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
            'missing.apiKey',
            `No Alchemy API key found for chain ${chain.name} (${chain.chainId})`,
          )
        }
        const signer = new PkpLitSigner(wallet)

        return await AlchemySmartWalletLight.make(chain, signer, keys)
      }
    },
  },
}
