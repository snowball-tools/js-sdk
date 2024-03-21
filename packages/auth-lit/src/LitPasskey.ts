import { Passkey } from '@snowballtools/auth'
import type { AuthProviderInfo, Chain } from '@snowballtools/types'
import { DEFAULT_EXP } from '@snowballtools/utils'

import { LitAbility, LitActionResource } from '@lit-protocol/auth-helpers'
import { ProviderType } from '@lit-protocol/constants'
import { LitAuthClient, WebAuthnProvider } from '@lit-protocol/lit-auth-client'
import { LitNodeClient } from '@lit-protocol/lit-node-client'
import { PKPEthersWallet } from '@lit-protocol/pkp-ethers'
import type {
  AuthCallbackParams,
  AuthMethod,
  IRelayPKP,
  IRelayPollStatusResponse,
  SessionSigsMap,
} from '@lit-protocol/types'

export class LitPasskey extends Passkey {
  litAuthClient: LitAuthClient
  webAuthnProvider: WebAuthnProvider
  litNodeClient: typeof LitNodeClientNodeJs

  private authenticated: AuthMethod | undefined
  private pkpPublicKey: string | undefined
  private sessionSig: SessionSigsMap | undefined
  private pkpWallet: PKPEthersWallet | undefined

  constructor(chain: Chain, authProvider: AuthProviderInfo) {
    super(chain, authProvider)

    this.litAuthClient = new LitAuthClient({
      litRelayConfig: {
        relayApiKey: this.authProviderInfo.apiKeys['relayKey'] || 'snowball',
      },
    })

    this.litAuthClient.initProvider(ProviderType.WebAuthn)

    this.webAuthnProvider = this.litAuthClient.getProvider(
      ProviderType.WebAuthn,
    ) as WebAuthnProvider

    this.litNodeClient = new LitNodeClient({
      litNetwork: 'serrano',
      debug: true,
    })
  }

  async registerPasskey(username: string): Promise<void> {
    try {
      const options = await this.webAuthnProvider.register(username)
      const txHash = await this.webAuthnProvider.verifyAndMintPKPThroughRelayer(options)
      const response: IRelayPollStatusResponse =
        await this.webAuthnProvider.relay.pollRequestUntilTerminalState(txHash)

      if (response.pkpPublicKey === undefined) {
        return Promise.reject(`pollRequestUntilTerminalState failed ${response}`)
      }

      this.pkpPublicKey = response.pkpPublicKey

      return Promise.resolve()
    } catch (error) {
      return Promise.reject(`registerPasskey failed: ${JSON.stringify(error)}`)
    }
  }

  async authenticatePasskey(): Promise<void> {
    try {
      this.authenticated = await this.webAuthnProvider.authenticate()

      return Promise.resolve()
    } catch (error) {
      return Promise.reject(`Authentication failed ${JSON.stringify(error)}`)
    }
  }

  async fetchPkpsForAuthMethod(): Promise<IRelayPKP[]> {
    try {
      if (this.authenticated === undefined) {
        await this.authenticatePasskey()
      }

      const pkps = await this.webAuthnProvider.fetchPKPsThroughRelayer(this.authenticated!)

      if (pkps.length === 0 || pkps === undefined) {
        // TODO: Consider not throwing
        return Promise.reject('No PKPs found')
      }

      // TODO: Don't mutate
      this.pkpPublicKey = pkps[0]!.publicKey

      return pkps
    } catch (error) {
      return Promise.reject(`Retrieving PKPs failed ${JSON.stringify(error)}`)
    }
  }

  async getSessionSigs(switchChain: boolean = false): Promise<SessionSigsMap> {
    try {
      if (this.pkpPublicKey === undefined) {
        const pkps = await this.fetchPkpsForAuthMethod()
        // TODO: Check for undefined?
        this.pkpPublicKey = pkps[0]?.publicKey
      }

      await this.litNodeClient.connect()

      const authNeededCallback = async (params: AuthCallbackParams) => {
        const resp = await this.litNodeClient.signSessionKey({
          statement: params.statement,
          authMethods: [this.authenticated!],
          pkpPublicKey: this.pkpPublicKey,
          expiration: params.expiration,
          resources: params.resources,
          chainId: this.chain.chainId,
        })
        return resp.authSig
      }

      this.sessionSig = await this.litNodeClient.getSessionSigs({
        expiration: DEFAULT_EXP,
        chain: this.chain.name,
        resourceAbilityRequests: [
          {
            resource: new LitActionResource('*'),
            ability: LitAbility.PKPSigning,
          },
        ],
        switchChain,
        authNeededCallback: authNeededCallback,
      })

      if (this.sessionSig === undefined) {
        return Promise.reject('No session sigs found')
      }

      return this.sessionSig!
    } catch (error) {
      return Promise.reject(`Retrieving session sigs failed ${JSON.stringify(error)}`)
    }
  }

  async getEthersWallet(): Promise<PKPEthersWallet> {
    try {
      if (this.sessionSig === undefined) {
        this.sessionSig = await this.getSessionSigs()
      }

      if (this.pkpPublicKey === undefined) {
        const pkps = await this.fetchPkpsForAuthMethod()
        this.pkpPublicKey = pkps[0]?.publicKey
      }

      if (!this.pkpPublicKey) {
        return Promise.reject('No PKP public key found')
      }

      this.pkpWallet = new PKPEthersWallet({
        controllerSessionSigs: this.sessionSig,
        pkpPubKey: this.pkpPublicKey,
        rpc: 'https://chain-rpc.litprotocol.com/http',
      })
      await this.pkpWallet.init()

      return this.pkpWallet
    } catch (error) {
      return Promise.reject(`Transaction failed ${JSON.stringify(error)}`)
    }
  }
}
