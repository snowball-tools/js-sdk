import type { AuthProviderInfo, Chain } from '@snowballtools/types'

import type { PKPEthersWallet } from '@lit-protocol/pkp-ethers'

export abstract class Auth {
  authProviderInfo: AuthProviderInfo
  chain: Chain

  constructor(chain: Chain, authProviderInfo: AuthProviderInfo) {
    this.chain = chain
    this.authProviderInfo = authProviderInfo
  }

  abstract register(username: string): Promise<void>
  abstract authenticate(): Promise<void>
  abstract getEthersWallet(): Promise<PKPEthersWallet>

  switchChain(chain: Chain) {
    this.chain = chain
  }
}
