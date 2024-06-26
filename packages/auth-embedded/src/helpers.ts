import { SnowballChain } from '@snowballtools/js-sdk'

import { TurnkeyClient, getWebAuthnAssertion } from '@turnkey/http'
import { Turnkey, WebauthnStamper } from '@turnkey/sdk-browser'
import { createAccount } from '@turnkey/viem'
import { Transport, createWalletClient } from 'viem'

/**
 * Trigger the webauthn "create" ceremony.
 */
type AttestParams = {
  name: string
  orgId: string
  rpId: string
  apiBaseUrl: string
  serverSignUrl?: string
}
export async function turnkeyAttestPasskey(params: AttestParams) {
  const turnkey = new Turnkey({
    rpId: params.rpId,
    apiBaseUrl: params.apiBaseUrl,
    defaultOrganizationId: params.orgId,
    serverSignUrl: params.serverSignUrl,
  })
  const passkeyClient = turnkey.passkeyClient()

  const credential = await passkeyClient.createUserPasskey({
    publicKey: {
      user: {
        name: params.name,
        displayName: `${params.name} (${renderTimestamp()})`,
      },
    },
  })

  return { credential }
}

type LoginParams = {
  challenge: string
}
export async function assertLogin({ challenge }: LoginParams) {
  return JSON.parse(await getWebAuthnAssertion(challenge)) as {
    authenticatorData: string
    clientDataJson: string
    credentialId: string
    signature: string
  }
}

type WalletClientParams = {
  rpId: string
  chain: SnowballChain
  baseUrl: string
  transport: Transport
  credentialIds: string[]
  walletAddress: string
  organizationId: string
}
export async function getWalletClient(params: WalletClientParams) {
  const httpClient = new TurnkeyClient(
    {
      baseUrl: params.baseUrl, // "https://api.turnkey.com",
    },
    new WebauthnStamper({
      rpId: params.rpId,
      allowCredentials: params.credentialIds.map((credentialId) => ({
        id: base64UrlDecode(credentialId),
        type: 'public-key',
      })),
    }),
  )

  // Create the Viem custom account
  const turnkeyAccount = await createAccount({
    client: httpClient,
    organizationId: params.organizationId,
    signWith: params.walletAddress,
    // optional; will be fetched from Turnkey if not provided
    // ethereumAddress: '...',
  })

  const wallet = createWalletClient({
    account: turnkeyAccount,
    chain: params.chain.toViemChain(),
    transport: params.transport,
  })
  return wallet
}

function base64UrlDecode(base64Url: string): ArrayBuffer {
  // Convert base64url to base64 by replacing characters
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')

  // Pad with '=' if needed
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Padded = base64 + padding

  // Decode base64 to binary string
  const binaryString = atob(base64Padded)

  // Convert binary string to Uint8Array
  const uint8Array = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i)
  }

  return uint8Array.buffer.slice(0) as ArrayBuffer
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
