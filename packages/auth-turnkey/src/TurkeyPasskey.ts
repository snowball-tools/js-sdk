/* eslint-disable */
import { Passkey } from '@snowballtools/auth'

import type { PKPEthersWallet } from '@lit-protocol/pkp-ethers'

export class TurkeyPasskey extends Passkey {
  registerPasskey(_username: string): Promise<void> {
    throw new Error('Method not implemented.')
  }

  authenticatePasskey(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  getEthersWallet(): Promise<PKPEthersWallet> {
    throw new Error('Method not implemented.')
  }
}
