import { OkResult, ErrResult, ErrMeta } from './result'

export type ApiRpcs = {
  sendOtp: (params: { auth: { value: string; type: "email"; }; }) => Promise<ErrResult<"unexpected"> | ErrResult<"unsupported_auth_type"> | ErrResult<"send_failed"> | ErrResult<"too_many_codes", { minutesLeft: number; }> | OkResult<{ uuid: string; }>>
  verifyOtp: (params: { code: string; uuid: string; }) => Promise<ErrResult<"unexpected"> | ErrResult<"invalid_otp"> | ErrResult<"expired_code"> | ErrResult<"invalid_code"> | ErrResult<"email_taken"> | ErrResult<"user_not_found"> | OkResult<{ puser: { uid: string; authMethods: ApiAuthMethod[]; wallets: ApiWallet[]; passkeys: { publicKey: string; credentialId: string; }[]; }; newSession: { token: string; expiresAt: number; refreshToken: string; }; }>>
  pu_connectPasskey: (params: { challenge: string; attestation: { transports: ("AUTHENTICATOR_TRANSPORT_BLE" | "AUTHENTICATOR_TRANSPORT_INTERNAL" | "AUTHENTICATOR_TRANSPORT_NFC" | "AUTHENTICATOR_TRANSPORT_USB" | "AUTHENTICATOR_TRANSPORT_HYBRID")[]; credentialId: string; clientDataJson: string; attestationObject: string; }; }) => Promise<ErrResult<"unexpected"> | ErrResult<"invalid_attestation"> | OkResult<{}>>
  pu_whoami: (params: {}) => Promise<ErrResult<"unexpected"> | OkResult<{ uid: string; authMethods: ApiAuthMethod[]; wallets: ApiWallet[]; passkeys: { publicKey: string; credentialId: string; }[]; }>>
  getAuthConfig: (params: {}) => Promise<ErrResult<"unexpected"> | OkResult<{ turnkey: { rpId: string; orgId: string; rpName: string; apiBaseUrl: string; }; }>>
};
export type ApiParams = {
  [K in keyof ApiRpcs]: {
    params: ApiRpcs[K] extends (args: infer P) => any ? P : never
  }
}

export type ApiOks = {
  [K in keyof ApiRpcs]: ApiRpcs[K] extends (args: any) => Promise<infer R>
    ? R extends OkResult
      ? R
      : never
    : never
}

export type ApiErrs = {
  [K in keyof ApiRpcs]: ApiRpcs[K] extends (args: any) => Promise<infer R>
    ? R extends ErrResult
      ? R
      : never
    : never
}

export type ApiValues = {
  [K in keyof ApiRpcs]: ApiRpcs[K] extends (args: any) => Promise<infer R>
    ? R extends OkResult
      ? R['value']
      : never
    : never
}

export type ApiAuthMethod = {
  type: 'email'
  value: string
}

export type ApiWallet = {
  id: string
  accounts: ApiWalletAccount[]
}

export type ApiWalletAccount = {
  path: string
  address: `0x${string}`
  pathFormat: string
}
