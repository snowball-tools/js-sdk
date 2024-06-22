import { getWebAuthnAssertion } from '@turnkey/http'
import { Turnkey } from '@turnkey/sdk-browser'

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
