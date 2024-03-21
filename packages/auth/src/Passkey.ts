import type { PKPEthersWallet } from '@lit-protocol/pkp-ethers'

import { Auth } from './Auth'

export abstract class Passkey extends Auth {
  async register(username: string): Promise<void> {
    try {
      await this.registerPasskey(username)
    } catch (error) {
      return Promise.reject(`[SnowballPasskey] register failed: ${JSON.stringify(error)}`)
    }
  }

  async authenticate(): Promise<void> {
    try {
      await this.authenticatePasskey()
    } catch (error) {
      return Promise.reject(`[SnowballPasskey] authenticate failed: ${JSON.stringify(error)}`)
    }
  }

  abstract registerPasskey(username: string): Promise<void>
  abstract authenticatePasskey(): Promise<void>
  abstract override getEthersWallet(): Promise<PKPEthersWallet>
}
