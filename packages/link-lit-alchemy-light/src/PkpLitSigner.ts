import { SmartAccountSigner } from '@alchemy/aa-core'
import {
  type Address,
  type Hex,
  type SignableMessage,
  type TypedData,
  type TypedDataDefinition,
  type TypedDataDomain,
  isHex,
  toBytes,
} from 'viem'

import { PKPEthersWallet } from '.'

export class PkpLitSigner implements SmartAccountSigner {
  signerType = 'PKP'

  constructor(readonly inner: PKPEthersWallet) {}

  async getAddress() {
    return this.inner.getAddress() as Promise<Address>
  }

  signMessage = async (msg: SignableMessage) => {
    const result = await (this.inner.signMessage(
      typeof msg === 'string' ? msg : isHex(msg.raw) ? toBytes(msg.raw) : msg.raw,
    ) as Promise<Hex>)
    return result
  }

  signTypedData = async <
    const TTypedData extends TypedData | { [key: string]: unknown },
    TPrimaryType extends string = string,
  >(
    params: TypedDataDefinition<TTypedData, TPrimaryType>,
  ) => {
    return this.inner._signTypedData(
      params.domain as TypedDataDomain,
      params.types as any,
      params.message as Record<string, any>,
    ) as Promise<Hex>
  }
}
