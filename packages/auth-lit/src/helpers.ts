import { SnowballError } from '@snowballtools/types'
import { DEFAULT_EXP, SnowballChain } from '@snowballtools/utils'

import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers'
import { AuthMethodScope } from '@lit-protocol/constants'
import { BaseProvider } from '@lit-protocol/lit-auth-client'
import { AuthMethod, IRelayPKP, SessionSigsMap } from '@lit-protocol/types'

export async function getPKPs(
  provider: BaseProvider,
  authMethod: AuthMethod,
): Promise<IRelayPKP[]> {
  const allPKPs = await provider.fetchPKPsThroughRelayer(authMethod)
  return allPKPs
}

export async function mintPKP(provider: BaseProvider, authMethod: AuthMethod): Promise<IRelayPKP> {
  let txHash: string

  // Mint PKP through relay server
  txHash = await provider.mintPKPThroughRelayer(authMethod, {
    // <https://developer.litprotocol.com/v3/sdk/wallets/auth-methods/#auth-method-scopes>
    permittedAuthMethodScopes: [[AuthMethodScope.SignAnything]],
  })

  const response = await provider.relay.pollRequestUntilTerminalState(txHash)
  if (response.status !== 'Succeeded') {
    throw new Error('Minting failed')
  }
  const newPKP: IRelayPKP = {
    tokenId: response.pkpTokenId!,
    publicKey: response.pkpPublicKey!,
    ethAddress: response.pkpEthAddress!,
  }

  if (!newPKP.tokenId || !newPKP.publicKey || !newPKP.ethAddress) {
    // TODO: Not sure if these are required
    console.warn('Missing required fields in response')
  }
  return newPKP
}

export function clearRedirectUrlParams() {
  if (typeof window !== 'undefined') {
    const newUrl = window.location.pathname
    window.history.replaceState({ path: newUrl }, '', newUrl)
  }
}

export async function getSessionSigs({
  provider,
  auth,
  chain,
  pkpPublicKey,
  expiration = DEFAULT_EXP,
  switchChain = false,
}: {
  auth: AuthMethod
  chain: SnowballChain
  provider: BaseProvider
  expiration?: string
  pkpPublicKey: string
  switchChain?: boolean
}): Promise<SessionSigsMap> {
  return await provider.getSessionSigs({
    pkpPublicKey,
    authMethod: auth,
    sessionSigsParams: {
      chain: chain.name.toLowerCase(),
      expiration,
      switchChain,
      resourceAbilityRequests: [
        {
          resource: new LitActionResource('*'),
          ability: LitAbility.PKPSigning,
        },
      ],
    },
  })
}
