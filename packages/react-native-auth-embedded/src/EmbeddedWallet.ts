import { ApiWalletAccount } from '@snowballtools/types'

export class EmbeddedWallet {
  constructor(public accounts: ApiWalletAccount[]) {}
}
