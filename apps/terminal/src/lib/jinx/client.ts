// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
// JINX owner console — API client.
//
// JINX runs as a native engine on Kevin's machine behind the local control
// worker (127.0.0.1:8794). The Cloudflare edge can't reach that, so control is
// an outbound command queue: this client enqueues a command via
// kayjaytrades.com/api/jinx and polls for its result while the local worker
// picks it up. Status is a snapshot the worker pushes every few seconds.
//
// Every call rides the same authenticated App Server transport as the rest of
// the terminal (`authFetch`), so the owner's Access session is the only gate.

import { appServerUrl, authFetch } from '@/lib/api'

export type JinxDesiredState = 'PARKED' | 'RUNNING'
export type JinxMode = 'MANUAL' | 'AUTO'

export interface JinxSnapshot {
  agent: 'JINX'
  on: boolean
  running: boolean
  desiredState: JinxDesiredState
  mode: JinxMode
  liveTrading: boolean
  alerts: boolean
  enginePid: number | null
  feed: {
    connected: boolean
    stale: boolean
    lagMs: number | null
    opportunities: number
    edges: number
    lastError: string | null
  }
  wallet: {
    address: string | null
    lamports: number | null
    sol: number | null
  }
  pnl: { realizedLamports: string; realizedSol: number; openPositions: number }
  updatedAt: string
}

export interface JinxStatusResponse {
  snapshot: JinxSnapshot | null
  reportedAt: number | null
  ageMs: number | null
  /** true when the local worker hasn't reported in >20s — show DISCONNECTED. */
  stale: boolean
  pendingCommands: number
}

export type JinxCommandKind =
  | 'start'
  | 'stop'
  | 'mode'
  | 'alerts'
  | 'withdraw'
  | 'quote'
  | 'status'

export interface JinxCommandAck {
  id: string
  kind: JinxCommandKind
  status: 'pending'
}

export interface JinxCommandResult {
  id: string
  kind: JinxCommandKind
  status: 'pending' | 'dispatched' | 'done'
  ok: boolean | null
  result: Record<string, unknown> | null
  error: string | null
  updatedAt: number
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(`${appServerUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    },
  })
  const body = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    let message = `JINX API ${res.status}`
    if (body && typeof body === 'object' && 'error' in body) {
      message = String((body as { error: unknown }).error)
    }
    throw new Error(message)
  }
  return body as T
}

export const jinxApi = {
  status: () => req<JinxStatusResponse>('/api/jinx/status'),

  command: (kind: JinxCommandKind, params: Record<string, unknown> = {}) =>
    req<JinxCommandAck>('/api/jinx/command', {
      method: 'POST',
      body: JSON.stringify({ kind, params }),
    }),

  commandResult: (id: string) =>
    req<JinxCommandResult>(`/api/jinx/command/${encodeURIComponent(id)}`),

  /**
   * Enqueue a command and resolve once the local worker has run it (or reject
   * on timeout / worker error). `timeoutMs` covers the worst case — a cold
   * engine start needs ~20s to bind its telemetry port.
   */
  async run(
    kind: JinxCommandKind,
    params: Record<string, unknown> = {},
    {
      timeoutMs = 45_000,
      pollMs = 1500,
    }: { timeoutMs?: number; pollMs?: number } = {},
  ): Promise<JinxCommandResult> {
    const ack = await this.command(kind, params)
    const deadline = Date.now() + timeoutMs
    // Give the worker one poll cycle before the first check.
    await new Promise((r) => setTimeout(r, pollMs))
    for (;;) {
      const result = await this.commandResult(ack.id)
      if (result.status === 'done') {
        if (result.ok === false)
          throw new Error(result.error ?? `${kind} failed`)
        return result
      }
      if (Date.now() > deadline) {
        throw new Error(
          `JINX did not acknowledge "${kind}" in time — the local control worker may be offline.`,
        )
      }
      await new Promise((r) => setTimeout(r, pollMs))
    }
  },
}

// ---- display helpers -------------------------------------------------------

export function jinxOnline(status: JinxStatusResponse | undefined): boolean {
  return !!status && !status.stale && !!status.snapshot?.on
}

export function jinxConnectionLabel(
  status: JinxStatusResponse | undefined,
): 'LIVE' | 'OFF' | 'DISCONNECTED' {
  if (!status || status.stale || !status.snapshot) return 'DISCONNECTED'
  return status.snapshot.on ? 'LIVE' : 'OFF'
}

export function formatSol(sol: number | null | undefined, dp = 4): string {
  if (sol == null || !Number.isFinite(sol)) return '—'
  return `${sol.toFixed(dp)} SOL`
}

export const LAMPORTS_PER_SOL = 1_000_000_000
