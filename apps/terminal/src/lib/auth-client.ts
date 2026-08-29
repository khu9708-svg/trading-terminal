// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
import { useSyncExternalStore } from 'react'
import { __resetAccessSessionCache, getAccessSession } from './access-session'
import type { emailOTPClient } from 'better-auth/client/plugins'
import type { createAuthClient } from 'better-auth/react'
import type { AccessSessionData } from './access-session'

/** True when an App Server URL is explicitly configured. */
export const hasAppServer = Boolean(import.meta.env.VITE_APP_SERVER_URL)

const getAuthBaseURL = () => {
  const appServerUrl = (
    import.meta.env.VITE_APP_SERVER_URL ?? 'http://localhost:4046'
  ).replace(/\/+$/, '')
  return `${appServerUrl}/api/auth`
}

/** Host of the App Server we authenticate against — for error copy. */
export const appServerHost = (() => {
  try {
    return new URL(getAuthBaseURL()).host
  } catch {
    return 'the App Server'
  }
})()

// ---------------------------------------------------------------------------
// Bearer token storage
//
// Sessions ride on a bearer token instead of cookies. Cookies don't survive
// the cross-origin setups we actually ship: the Tauri webview (origin
// tauri://localhost) talking to api.pairlens.finance is a third-party-cookie
// context that Safari/WebKit block outright, and localhost dev against a
// remote App Server has the same problem. The App Server runs BetterAuth's
// `bearer()` plugin: every auth response carries a `set-auth-token` header,
// which we persist and send back as `Authorization: Bearer`.
//
// Which is why we must NOT ask for cookies (`credentials: 'include'`). A
// credentialed cross-origin request is only satisfied by an exact
// `Access-Control-Allow-Origin` plus `Allow-Credentials: true`; a server
// answering the wildcard makes the browser reject the response before we ever
// see it, surfacing as a bare "fetch failed". That is what broke sign-in on
// the hosted web terminal, whose origin the App Server answers with `*`.
// `same-origin` (the fetch default) still sends cookies to an App Server
// deployed under the terminal's own origin, and sends nothing cross-origin —
// where the bearer token is the credential anyway.
// ---------------------------------------------------------------------------

/**
 * Credential mode for every App Server request. See the note above: cookies
 * for a same-origin deployment, bearer-only across origins.
 */
export const APP_SERVER_CREDENTIALS: RequestCredentials = 'same-origin'

const AUTH_TOKEN_KEY = 'pairlens:auth-token'

export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

// When no App Server is configured, export a no-op stub so nothing crashes
// trying to call createAuthClient with a relative URL.
function createStubAuthClient() {
  const noop = () => Promise.resolve({ data: null, error: null })
  return {
    useSession: () => ({
      data: null,
      isPending: false,
      error: null,
    }),
    getSession: noop,
    signOut: noop,
    signIn: { emailOtp: noop },
    emailOtp: { sendVerificationOtp: noop },
  } as unknown as ReturnType<
    typeof createAuthClient<{ plugins: [ReturnType<typeof emailOTPClient>] }>
  >
}

const appServerUrl = (
  import.meta.env.VITE_APP_SERVER_URL ?? 'http://localhost:4046'
).replace(/\/+$/, '')

function createAccessAuthClient() {
  let snapshot: AccessSessionData = { data: null, error: null }
  const listeners = new Set<() => void>()
  let started = false

  const refresh = async () => {
    snapshot = await getAccessSession(appServerUrl)
    listeners.forEach((l) => l())
  }
  const ensureStarted = () => {
    if (started) return
    started = true
    void refresh()
  }

  return {
    useSession: () => {
      ensureStarted()
      const data = useSyncExternalStore(
        (cb) => {
          listeners.add(cb)
          return () => listeners.delete(cb)
        },
        () => snapshot,
        () => ({ data: null, error: null }) as AccessSessionData,
      )
      return { data: data.data, isPending: !started, error: data.error }
    },
    getSession: async () => {
      const s = await getAccessSession(appServerUrl)
      return { data: s.data, error: s.error }
    },
    signOut: async () => {
      __resetAccessSessionCache()
      clearStoredAuthToken()
      // The KAY App Server clears the Access session and redirects home.
      if (typeof window !== 'undefined')
        window.location.href = '/api/auth/logout'
      return { data: null, error: null }
    },
    signIn: { emailOtp: () => Promise.resolve({ data: null, error: null }) },
    emailOtp: {
      sendVerificationOtp: () => Promise.resolve({ data: null, error: null }),
    },
  } as unknown as ReturnType<
    typeof createAuthClient<{ plugins: [ReturnType<typeof emailOTPClient>] }>
  >
}

export const authClient: ReturnType<
  typeof createAuthClient<{ plugins: [ReturnType<typeof emailOTPClient>] }>
> = hasAppServer ? createAccessAuthClient() : createStubAuthClient()
