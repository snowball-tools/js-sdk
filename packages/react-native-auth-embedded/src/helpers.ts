import { SnowballChain } from '@snowballtools/js-sdk'

import { TurnkeyClient } from '@turnkey/http'
import { PasskeyStamper, createPasskey } from "@turnkey/react-native-passkey-stamper";
import { createAccount } from '@turnkey/viem'
import { Transport, createWalletClient } from 'viem'

/**
 * Trigger the passkey "create" ceremony.
 */
type AttestParams = {
  name: string
  orgId: string
  rpId: string
  apiBaseUrl: string
  serverSignUrl?: string
}
export async function turnkeyAttestPasskey(params: AttestParams) {
  const credential = await createPasskey({
    authenticatorName: "End-User Passkey",
      rp: {
      id: params.rpId,
      name: "Passkey App",
    },
    user: {
      id: params.orgId,
      name: params.name,
      displayName: `${params.name} (${renderTimestamp()})`,
    },
  })
  return { credential }
}

type LoginParams = {
  challenge: string,
  rpId: string,
  credentialIds: string[],
}
export async function assertLogin({ challenge, rpId, credentialIds }: LoginParams) {
  const stamper = new PasskeyStamper({
    rpId,
    allowCredentials: credentialIds.map((credentialId) => ({
      id: credentialId,
      type: 'public-key',
  }))});
  return JSON.parse((await stamper.stamp(challenge)).stampHeaderValue) as {
    authenticatorData: string
    clientDataJson: string
    credentialId: string
    signature: string
  }
}

export type WalletClientParams = {
  rpId: string
  chain: SnowballChain
  baseUrl: string
  transport: Transport
  credentialIds: string[]
  walletAddress: string
  organizationId: string
}
export async function makeWalletClient(params: WalletClientParams) {
  const httpClient = new TurnkeyClient(
    {
      baseUrl: params.baseUrl, // "https://api.turnkey.com",
    },
    new PasskeyStamper({
      rpId: params.rpId,
      allowCredentials: params.credentialIds.map((credentialId) => ({
        id: credentialId,
        type: 'public-key',
      })),
    }),
  )

  // Create the Viem custom account
  const turnkeyAccount = await createAccount({
    client: httpClient,
    organizationId: params.organizationId,
    signWith: params.walletAddress,
  })

  const wallet = createWalletClient({
    account: turnkeyAccount,
    chain: params.chain.toViemChain(),
    transport: params.transport,
  })
  return wallet
}

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')

function renderTimestamp() {
  const date = new Date()
  const month = MONTHS[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()

  let hours = date.getHours()
  const minutes = date.getMinutes()

  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12
  hours = hours ? hours : 12 // the hour '0' should be '12'

  const minutesStr = minutes < 10 ? '0' + minutes : minutes.toString()

  return `${month} ${day} ${year} ${hours}:${minutesStr}${ampm}`
}
