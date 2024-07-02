import { ApiClient, ErrResult, OkResult } from '@snowballtools/types'
import { logBase } from '@snowballtools/utils'

import { consoleLogError } from './errors'

export * from '@snowballtools/types/api'
export * from '@snowballtools/types/result'

export type Unexpected = ErrResult<'unexpected'>

const log = logBase.extend('rpc')

// Pretend return value rpc is a ProcCtx to alleviate type errors
// Therefore DO NOT try to access e.g. client.user, because those fields won't be there!
export function makeRpcClient(apiKey: string, apiUrl: string, sessionKey: string): ApiClient {
  let session: { token: string; expiresAt: number; refreshToken: string } | undefined
  try {
    const sess = JSON.parse(localStorage.getItem(sessionKey) || 'null') || undefined
    if (sess && sess.expiresAt > Date.now()) {
      session = sess
      log('Found existing session')
    } else if (sess) {
      log('Found existing session, but expired')
      // TODO: Implement refresh token
    } else {
      log('No existing session')
    }
  } catch {
    log('Failed to parse session from storage')
  }

  function logout() {
    session = undefined
    localStorage.removeItem(sessionKey)
  }
  function hasValidSession() {
    return getSessionExpirationTime() > Date.now()
  }
  function getSessionExpirationTime() {
    return session ? session.expiresAt : 0
  }
  return new Proxy(
    {
      apiUrl,
      logout,
      hasValidSession,
      getSessionExpirationTime,
    },
    {
      get(target, procName) {
        if (typeof procName === 'symbol') return
        if (procName in target) return Reflect.get(target, procName)

        const isPu = procName.startsWith('pu_')
        if (isPu && session && !hasValidSession()) {
          // TODO: Implement refresh token
        }
        const token = isPu ? session?.token : apiKey
        if (!token) {
          throw new Error(`No ${isPu ? 'session' : 'apiKey'} provided for rpc call ${procName}`)
        }

        return async (argsObject: any) => {
          const res = await fetch(`${apiUrl}/rpc/${procName}`, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            },
            body: JSON.stringify({
              args: argsObject,
            }),
          })
          const rawBody = await res.text()

          try {
            var body = JSON.parse(rawBody)
          } catch (e) {
            // RPCs are always expected to return JSON
            // If not, something went very wrong
            const cause = new Error(
              `[snowball-rpc] Failed to parse body: ${JSON.stringify(rawBody)}`,
            )
            consoleLogError(cause)
            body = new ErrResult('unexpected', 'rpc-client-parse-error', 500, { cause })
          }

          if (res.status === 500 && body.code !== 'rpc-client-parse-error') {
            consoleLogError(new Error(`[snowball-rpc] Server error: ${rawBody}`))
          } else if (res.status === 200 && body.value.newSession) {
            // Auto-detect new sessions
            session = body.value.newSession
            localStorage.setItem(sessionKey, JSON.stringify(session))
          }
          // Wrap in instance of Result
          return body.ok
            ? new OkResult(body.value)
            : new ErrResult(body.reason, body.code, body.statusCode, body.meta)
        }
      },
    },
  ) as any
}
