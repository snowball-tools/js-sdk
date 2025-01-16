type TransactionParams = {
  to: string
  value: bigint
}
export class IframeWallet {
  constructor(public readonly iframeUrl: string) {}

  sendTransaction(params: TransactionParams) {
    console.log('Sending transaction to', params.to, 'with value', params.value)
  }
}
