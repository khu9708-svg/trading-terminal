// Copyright (c) 2026
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
//
// KAY auth entry points. In the KAY production build (`VITE_APP_SERVER_URL`
// set) the terminal is public — no Pairlens signup / login / email OTP. The
// owner signs in through Cloudflare Access via a full navigation to
// `/api/auth/login`, which a dedicated Access application guards; on success
// Access sets the `CF_Authorization` cookie for the hostname and the KAY App
// Server bounces back to `/`. `access-session.ts` then resolves the owner
// session from that cookie.

/** True in the KAY build — the public terminal with an owner account layer. */
export const IS_KAY_BUILD = Boolean(import.meta.env.VITE_APP_SERVER_URL)

/**
 * Begin the KAY owner sign-in. A full-page navigation, not a fetch: Cloudflare
 * Access has to intercept it at the edge and run its challenge.
 */
export function startKaySignIn(): void {
  if (typeof window === 'undefined') return
  window.location.href = '/api/auth/login'
}

/** End the Access session and return to the public terminal. */
export function startKaySignOut(): void {
  if (typeof window === 'undefined') return
  window.location.href = '/api/auth/logout'
}
