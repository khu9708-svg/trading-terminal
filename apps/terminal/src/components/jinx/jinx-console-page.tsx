// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
/**
 * JINX console — the whole owner surface on one page.
 *
 *   [ control bar: OFF/LIVE · START/STOP · MANUAL/AUTO · Alerts · Feed · Wallet · P&L ]
 *   [ wallet: deposit (address + QR) · withdraw (review → confirm → signature) ]
 *
 * Everything routes browser → kayjaytrades.com/api/jinx → command queue →
 * local worker → JINX engine. No terminal, no PowerShell.
 */
import { JinxControlBar } from './jinx-control-bar'
import { JinxWallet } from './jinx-wallet'

export function JinxConsolePage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <JinxControlBar />
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Wallet</h2>
        <JinxWallet />
      </section>
    </div>
  )
}
