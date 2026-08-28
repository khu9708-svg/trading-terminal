// Copyright (c) 2026
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
//
// KAY watchlist cross-device bridge. The terminal's LocalPersistenceAdapter
// owns the local copy (`pairlens:persistence:watchlists:<userId>`); this module
// mirrors it to the KAY App Server so it follows the owner between devices.
// On login it pulls the account copy (newest-wins vs a local timestamp); on a
// local change it debounce-pushes. Guest / non-KAY builds: no-op.

import { appServerUrl } from '@/lib/api'
import { IS_KAY_BUILD } from '@/lib/kay-auth'

const ADAPTER_PREFIX = 'pairlens:persistence:'
const TS_KEY = 'pairlens:sync-ts:watchlists'
const PUSH_DEBOUNCE_MS = 1200

let started = false
let pushTimer: ReturnType<typeof setTimeout> | null = null

function localKey(userId: string): string {
  return `${ADAPTER_PREFIX}watchlists:${userId}`
}
function readLocal(userId: string): unknown {
  try {
    const raw = localStorage.getItem(localKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function localTs(): number {
  return parseInt(localStorage.getItem(TS_KEY) ?? '0', 10) || 0
}
function stampLocal(now: number): void {
  try {
    localStorage.setItem(TS_KEY, String(now))
  } catch {
    // ignore
  }
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = localStorage.getItem('pairlens:auth-token') ?? ''
  const headers = new Headers(init?.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  headers.set('content-type', 'application/json')
  return fetch(`${appServerUrl}${path}`, {
    ...init,
    headers,
    credentials: 'same-origin',
  })
}

async function pull(userId: string): Promise<void> {
  try {
    const res = await authFetch('/api/user/watchlists')
    if (!res.ok) return
    const data = (await res.json()) as { state: unknown; updatedAt: number }
    if (data.state && data.updatedAt > localTs()) {
      localStorage.setItem(localKey(userId), JSON.stringify(data.state))
      stampLocal(data.updatedAt)
      // The watchlists store reads on init and reacts to `storage` events for
      // sibling windows; dispatch one so the live store re-hydrates.
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: localKey(userId),
          newValue: JSON.stringify(data.state),
        }),
      )
    }
  } catch {
    // offline — local stays authoritative
  }
}

function schedulePush(userId: string): void {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    const state = readLocal(userId)
    if (state == null) return
    const now = Date.now()
    stampLocal(now)
    void authFetch('/api/user/watchlists', {
      method: 'PUT',
      body: JSON.stringify({ state, updatedAt: now }),
    }).catch(() => {})
  }, PUSH_DEBOUNCE_MS)
}

/**
 * Call once per signed-in session. `userId` is the KAY user id from the
 * session. Returns a teardown for sign-out.
 */
export function startKayWatchlistSync(userId: string): () => void {
  if (!IS_KAY_BUILD || started) return () => {}
  started = true

  void pull(userId)

  const onStorage = (e: StorageEvent) => {
    if (e.key === localKey(userId)) schedulePush(userId)
  }
  window.addEventListener('storage', onStorage)

  // Same-tab writes don't fire `storage`; poll the local copy lightly.
  let lastSeen = JSON.stringify(readLocal(userId))
  const poll = setInterval(() => {
    const cur = JSON.stringify(readLocal(userId))
    if (cur !== lastSeen) {
      lastSeen = cur
      schedulePush(userId)
    }
  }, 4000)

  return () => {
    started = false
    window.removeEventListener('storage', onStorage)
    clearInterval(poll)
    if (pushTimer) clearTimeout(pushTimer)
  }
}
