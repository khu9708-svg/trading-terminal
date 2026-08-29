// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
import { describe, it, expect, beforeEach } from 'bun:test'
import { getAccessSession, __resetAccessSessionCache } from '../access-session'

const SESSION = {
  data: {
    user: {
      id: 'usr_1',
      email: 'owner@kayjaytrades.com',
      name: 'Kay',
      image: null,
    },
    session: {
      token: 'kay-token',
      userId: 'usr_1',
      expiresAt: new Date(Date.now() + 3600e3).toISOString(),
    },
  },
  error: null,
}

let fetchCalls: Array<[string, RequestInit | undefined]> = []
let store: Record<string, string> = {}

beforeEach(() => {
  __resetAccessSessionCache()
  fetchCalls = []
  store = {}
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ) => {
    fetchCalls.push([String(input), init])
    return new Response(JSON.stringify(SESSION), {
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  globalThis.localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      store = {}
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length
    },
  } as Storage
})

describe('access-session', () => {
  it('fetches get-session with same-origin credentials and no cookie inspection', async () => {
    const res = await getAccessSession('https://kayjaytrades.com')
    expect(res.data?.user.email).toBe('owner@kayjaytrades.com')
    expect(fetchCalls.length).toBe(1)
    expect(fetchCalls[0][0]).toBe(
      'https://kayjaytrades.com/api/auth/get-session',
    )
    expect(fetchCalls[0][1]?.credentials).toBe('same-origin')
  })

  it('persists the bearer token to localStorage for api.ts', async () => {
    await getAccessSession('https://kayjaytrades.com')
    expect(localStorage.getItem('pairlens:auth-token')).toBe('kay-token')
  })

  it('caches for 60s (second call makes no fetch)', async () => {
    await getAccessSession('https://kayjaytrades.com')
    await getAccessSession('https://kayjaytrades.com')
    expect(fetchCalls.length).toBe(1)
  })
})
