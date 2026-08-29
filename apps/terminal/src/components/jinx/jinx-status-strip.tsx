// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
/**
 * The always-visible JINX line. Wherever the terminal shows a status bar, this
 * tells the owner — without going Home — whether JINX is live, which mode it is
 * in, the wallet balance, whether alerts are on, and current realized P&L.
 */
import { Link } from '@tanstack/react-router'
import { Bell, BellOff, Circle } from 'lucide-react'

import { cn } from '@pairlens/ui'

import { formatSol, jinxConnectionLabel } from '@/lib/jinx/client'
import { useJinxStatus } from '@/lib/jinx/use-jinx'

export function JinxStatusStrip({ className }: { className?: string }) {
  const { data } = useJinxStatus({ intervalMs: 5000 })
  const conn = jinxConnectionLabel(data)
  const snap = data?.snapshot
  const live = conn === 'LIVE'
  const pnl = snap?.pnl.realizedSol ?? 0

  return (
    <Link
      to="/jinx"
      className={cn(
        'flex items-center gap-2 whitespace-nowrap text-xs font-medium tabular-nums',
        'text-muted-foreground hover:text-foreground transition-colors',
        className,
      )}
      title="Open JINX console"
    >
      <span
        className={cn(
          'flex items-center gap-1',
          live
            ? 'text-emerald-500'
            : conn === 'OFF'
              ? 'text-muted-foreground'
              : 'text-amber-500',
        )}
      >
        <Circle
          className={cn(
            'size-2',
            live && 'fill-emerald-500',
            conn === 'OFF' && 'fill-muted-foreground',
          )}
        />
        JINX {conn}
      </span>
      <Sep />
      <span className={cn(snap?.mode === 'AUTO' ? 'text-amber-500' : '')}>
        {snap?.mode ?? 'MANUAL'}
      </span>
      <Sep />
      <span>{formatSol(snap?.wallet.sol, 3)}</span>
      <Sep />
      <span className="flex items-center gap-1">
        {snap?.alerts ? (
          <Bell className="size-3" />
        ) : (
          <BellOff className="size-3 opacity-60" />
        )}
        {snap?.alerts ? 'on' : 'off'}
      </span>
      <Sep />
      <span
        className={cn(
          pnl > 0 ? 'text-emerald-500' : pnl < 0 ? 'text-red-500' : '',
        )}
      >
        {pnl >= 0 ? '+' : ''}
        {pnl.toFixed(3)} SOL
      </span>
    </Link>
  )
}

function Sep() {
  return <span className="text-border">|</span>
}
