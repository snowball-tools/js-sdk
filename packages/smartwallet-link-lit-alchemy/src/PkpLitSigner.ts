import { SmartAccountSigner } from '@alchemy/aa-core'
import type {
  Address,
  Hex,
  SignableMessage,
  TypedData,
  TypedDataDefinition,
  TypedDataDomain,
} from 'viem'

import { PKPEthersWallet } from '.'

export class PkpLitSigner implements SmartAccountSigner {
  signerType = 'PKP'

  constructor(readonly inner: PKPEthersWallet) {}

  async getAddress() {
    // return this.inner.getAddress() as Promise<Address>
    const addr = await this.inner.getAddress()
    console.log('Lit getAddress', addr)
    return addr as Address
  }

  signMessage = async (msg: SignableMessage) => {
    console.log('signMessage', msg)
    return this.inner.signMessage(typeof msg === 'string' ? msg : msg.raw) as Promise<Hex>
  }

  signTypedData = async <
    const TTypedData extends TypedData | { [key: string]: unknown },
    TPrimaryType extends string = string,
  >(
    params: TypedDataDefinition<TTypedData, TPrimaryType>,
  ) => {
    console.log('signTypedData', params)
    return this.inner._signTypedData(
      params.domain as TypedDataDomain,
      params.types as any,
      params.message as Record<string, any>,
    ) as Promise<Hex>
  }
}
