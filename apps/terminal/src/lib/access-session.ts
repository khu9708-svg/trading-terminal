// Copyright (c) 2026
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
//
// Access-backed session. When VITE_APP_SERVER_URL is set, KAY sits behind
// Cloudflare Access: the page only loads for an authenticated user, and this
// module turns that identity into the BetterAuth-shaped session the terminal
// expects. It never inspects the Access cookie -- Cloudflare manages that.

export interface AccessSessionUser {
  id: string
  email: string
  name?: string | null
  image?: string | null
}
export interface AccessSessionData {
  data: {
    user: AccessSessionUser
    session: { token: string; userId: string; expiresAt: string }
  } | null
  error: null | { message: string }
}

const AUTH_TOKEN_KEY = 'pairlens:auth-token'
const TTL_MS = 60_000

let cache: { at: number; value: AccessSessionData } | null = null
let inflight: Promise<AccessSessionData> | null = null

export function __resetAccessSessionCache(): void {
  cache = null
  inflight = null
}

export async function getAccessSession(appServerUrl: string): Promise<AccessSessionData> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await fetch(`${appServerUrl.replace(/\/+$/, '')}/api/auth/get-session`, {
        credentials: 'same-origin',
        headers: { accept: 'application/json' },
      })
      if (!res.ok) {
        const value: AccessSessionData = { data: null, error: { message: `HTTP ${res.status}` } }
        cache = { at: Date.now(), value }
        return value
      }
      const value = (await res.json()) as AccessSessionData
      if (value.data?.session?.token) {
        try { localStorage.setItem(AUTH_TOKEN_KEY, value.data.session.token) } catch {}
      }
      cache = { at: Date.now(), value }
      return value
    } finally {
      inflight = null
    }
  })()
  return inflight
}
