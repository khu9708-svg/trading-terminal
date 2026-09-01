// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
/**
 * JINX owner control bar — the top of the JINX console.
 *
 *   JINX — OFF / LIVE        [ START JINX ] / [ STOP JINX ]
 *   Mode — MANUAL / AUTO     Alerts — ON / OFF
 *   Feed — CONNECTED / DISCONNECTED    Wallet — <SOL>    P&L — <SOL>
 *
 * Every control goes through the cloud command queue to the local worker. If
 * the worker is offline the bar shows DISCONNECTED and the buttons say so
 * rather than pretending.
 */
import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Loader2,
  Power,
  Wifi,
  WifiOff,
} from 'lucide-react'

import { cn } from '@pairlens/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@pairlens/ui/components/ui/alert-dialog'
import { Badge } from '@pairlens/ui/components/ui/badge'
import { Button } from '@pairlens/ui/components/ui/button'
import { Separator } from '@pairlens/ui/components/ui/separator'
import { Switch } from '@pairlens/ui/components/ui/switch'

import { formatSol, jinxConnectionLabel } from '@/lib/jinx/client'
import { useJinxCommand, useJinxStatus } from '@/lib/jinx/use-jinx'

export function JinxControlBar() {
  const { data, isLoading } = useJinxStatus({ intervalMs: 3000 })
  const cmd = useJinxCommand()
  const [confirmAuto, setConfirmAuto] = useState(false)

  const conn = jinxConnectionLabel(data)
  const snap = data?.snapshot
  const control = snap?.control
  const disconnected = conn !== 'LIVE' && conn !== 'OFF'
  const on = conn === 'LIVE'
  const busy = cmd.isPending

  const run = (
    kind: Parameters<typeof cmd.mutate>[0]['kind'],
    params?: Record<string, unknown>,
    label?: string,
  ) => cmd.mutate({ kind, params, label })

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5">
      {/* Row 1 — the big switch */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">JINX</span>
          <Badge
            variant={on ? 'default' : 'secondary'}
            className={cn(
              on && 'bg-emerald-500 text-white hover:bg-emerald-500',
              disconnected && 'bg-amber-500 text-white hover:bg-amber-500',
            )}
          >
            {conn}
          </Badge>
          {control?.live_trading && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="size-3" /> LIVE MONEY
            </Badge>
          )}
        </div>

        {on ? (
          <Button
            size="lg"
            variant="destructive"
            disabled={busy || disconnected}
            onClick={() => run('stop', {}, 'JINX stopped')}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Power className="size-4" />
            )}
            STOP JINX
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={busy || disconnected}
            className="bg-emerald-600 hover:bg-emerald-600/90"
            onClick={() => run('start', {}, 'JINX started')}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Power className="size-4" />
            )}
            START JINX
          </Button>
        )}
      </div>

      {disconnected && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          The local JINX control worker hasn&apos;t reported in. Start it on the
          machine ({`node worker.mjs`}) — controls resume automatically once it
          checks in.
        </p>
      )}

      <Separator className="my-4" />

      {/* Row 2 — mode + alerts */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mode">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-sm',
                control?.execution_mode !== 'AUTO' && 'font-semibold',
              )}
            >
              MANUAL
            </span>
            <Switch
              checked={control?.execution_mode === 'AUTO'}
              disabled={busy || disconnected}
              onCheckedChange={(next) => {
                if (next) setConfirmAuto(true)
                else run('mode', { mode: 'MANUAL' }, 'Mode → MANUAL')
              }}
            />
            <span
              className={cn(
                'text-sm',
                control?.execution_mode === 'AUTO' &&
                  'font-semibold text-amber-500',
              )}
            >
              AUTO
            </span>
          </div>
        </Field>

        <Field label="Alerts">
          <div className="flex items-center gap-3">
            <Switch
              checked={!!control?.alerts}
              disabled={busy || disconnected}
              onCheckedChange={(next) =>
                run(
                  'alerts',
                  { enabled: next },
                  `Alerts ${next ? 'on' : 'off'}`,
                )
              }
            />
            <span className="text-sm">{control?.alerts ? 'ON' : 'OFF'}</span>
          </div>
        </Field>
      </div>

      <Separator className="my-4" />

      {/* Row 3 — feed / wallet / P&L */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat
          label="Feed"
          value={
            control?.feed?.connected && !control.feed.stale
              ? 'CONNECTED'
              : 'DISCONNECTED'
          }
          icon={
            control?.feed?.connected && !control.feed.stale ? (
              <Wifi className="size-4" />
            ) : (
              <WifiOff className="size-4" />
            )
          }
          tone={
            control?.feed?.connected && !control.feed.stale ? 'good' : 'muted'
          }
        />
        <Stat
          label="Opportunities"
          value={String(control?.feed?.opportunities ?? '—')}
          icon={<Activity className="size-4" />}
        />
        <Stat label="Wallet" value={formatSol(control?.wallet?.sol, 4)} />
        <Stat
          label="Realized P&L"
          value={`${(control?.pnl?.realized_sol ?? 0) >= 0 ? '+' : ''}${(control?.pnl?.realized_sol ?? 0).toFixed(4)} SOL`}
          tone={
            (control?.pnl?.realized_sol ?? 0) > 0
              ? 'good'
              : (control?.pnl?.realized_sol ?? 0) < 0
                ? 'bad'
                : 'muted'
          }
        />
      </div>

      {isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">
          Loading JINX status…
        </p>
      )}

      <AlertDialog open={confirmAuto} onOpenChange={setConfirmAuto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch JINX to AUTO?</AlertDialogTitle>
            <AlertDialogDescription>
              AUTO lets JINX open positions on its own, subject to every
              existing risk, simulation, sizing, stop-loss and circuit-breaker
              gate. Autonomous entries still require live execution to be armed
              separately — this only sets the mode.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-600/90"
              onClick={() =>
                run('mode', { mode: 'AUTO', confirm: true }, 'Mode → AUTO')
              }
            >
              Set AUTO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string
  value: string
  icon?: React.ReactNode
  tone?: 'default' | 'good' | 'bad' | 'muted'
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'flex items-center gap-1.5 text-sm font-semibold tabular-nums',
          tone === 'good' && 'text-emerald-500',
          tone === 'bad' && 'text-red-500',
          tone === 'muted' && 'text-muted-foreground',
        )}
      >
        {icon}
        {value}
      </div>
    </div>
  )
}
