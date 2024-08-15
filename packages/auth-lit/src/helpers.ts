import { DEFAULT_EXP, SnowballChain } from '@snowballtools/utils'

import { LitAbility, LitActionResource, LitPKPResource } from '@lit-protocol/auth-helpers'
import { AuthMethodScope } from '@lit-protocol/constants'
import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { AuthMethod, IRelayPKP, SessionSigsMap } from '@lit-protocol/types'

import { BaseProvider } from './lit-auth-client'

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
  litNodeClient,
}: {
  auth: AuthMethod
  chain: SnowballChain
  provider: BaseProvider
  expiration?: string
  pkpPublicKey: string
  switchChain?: boolean
  litNodeClient: LitNodeClient
}): Promise<SessionSigsMap> {
  await litNodeClient.getLatestBlockhash()
  return await litNodeClient.getPkpSessionSigs({
    pkpPublicKey,
    expiration,
    chain: chain.name.toLowerCase(),
    switchChain,
    authMethods: [auth],
    resourceAbilityRequests: [
      {
        resource: new LitPKPResource('*'),
        ability: LitAbility.PKPSigning,
      },
      {
        resource: new LitActionResource('*'),
        ability: LitAbility.LitActionExecution,
      },
    ],
  })
}
