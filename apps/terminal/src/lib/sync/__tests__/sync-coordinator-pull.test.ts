// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
import { describe, it, expect, beforeEach } from 'bun:test'
import { SyncCoordinator } from '../sync-coordinator'
import { onHydrate } from '../sync-channel'

// Minimal localStorage shim
const backing = new Map<string, string>()
const previousStorage = globalThis.localStorage as Storage | undefined
globalThis.localStorage = {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => { backing.set(k, String(v)) },
  removeItem: (k: string) => { backing.delete(k) },
  clear: () => backing.clear(),
  key: (i: number) => [...backing.keys()][i] ?? null,
  get length() { return backing.size },
} as Storage

beforeEach(() => {
  backing.clear()
})

function coordinatorWithResponses(map: Record<string, unknown>) {
  const token = async () => 'tok'
  const c = new SyncCoordinator('https://kayjaytrades.com', token)
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const path = new URL(url).pathname
    if (path in map) return new Response(JSON.stringify(map[path]), { status: 200 })
    return new Response('{}', { status: 200 })
  }) as typeof fetch
  return c
}

describe('SyncCoordinator workspace/chart pull', () => {
  it('pullWorkspaces hydrates a slot when the server copy is newer', async () => {
    const hydrated: Array<[string, unknown]> = []
    const unsub = onHydrate((k, v) => hydrated.push([k, v]))
    backing.set('pairlens:sync-ts:terminal.layout', '1000')

    const c = coordinatorWithResponses({
      '/api/sync/preferences': { entries: {} },
      '/api/user/workspace': { slots: [{ name: 'terminal-layout', panels: { v: 2 }, updatedAt: 5000 }] },
      '/api/user/chart-state': { pairKey: '_all', indicators: {}, drawings: {}, settings: {}, updatedAt: 0 },
      '/api/workflows/bulk': { workflows: [] },
      '/api/notifications/sync': { rules: [], bindings: [] },
    })
    await c.setSession('usr_1')

    expect(hydrated).toContainEqual(['terminal.layout', { v: 2 }])
    expect(localStorage.getItem('pairlens:terminal.layout')).toBe(JSON.stringify({ v: 2 }))
    unsub()
    c.destroy()
  })

  it('pullWorkspaces skips a slot the local copy is newer than', async () => {
    const hydrated: string[] = []
    const unsub = onHydrate((k) => hydrated.push(k))
    backing.set('pairlens:sync-ts:terminal.layout', '9999')

    const c = coordinatorWithResponses({
      '/api/sync/preferences': { entries: {} },
      '/api/user/workspace': { slots: [{ name: 'terminal-layout', panels: { v: 2 }, updatedAt: 5000 }] },
      '/api/user/chart-state': { pairKey: '_all', indicators: {}, drawings: {}, settings: {}, updatedAt: 0 },
      '/api/workflows/bulk': { workflows: [] },
      '/api/notifications/sync': { rules: [], bindings: [] },
    })
    await c.setSession('usr_1')
    expect(hydrated).not.toContain('terminal.layout')
    unsub()
    c.destroy()
  })

  it('flushTier2 sends updatedAt + writes sync-ts for a workspace slot', async () => {
    const fetchCalls: Array<[string, RequestInit | undefined]> = []
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push([String(input), init])
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    const token = async () => 'tok'
    const c = new SyncCoordinator('https://kayjaytrades.com', token)
    await c.setSession('usr_1')
    fetchCalls.length = 0

    c.markDirty('terminal.layout', { v: 3 })

    // wait for the tier2 debounce (800ms)
    await new Promise((r) => setTimeout(r, 900))

    const putCall = fetchCalls.find(([u, i]) =>
      String(u).includes('/api/user/workspace/terminal-layout') && i?.method === 'PUT')
    expect(putCall).toBeTruthy()
    const body = JSON.parse(putCall![1]!.body as string)
    expect(typeof body.updatedAt).toBe('number')
    expect(localStorage.getItem('pairlens:sync-ts:terminal.layout')).toBeTruthy()
    c.destroy()
  })
})
