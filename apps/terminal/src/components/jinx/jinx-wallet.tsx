// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
/**
 * JINX wallet — deposit and withdraw.
 *
 * JINX has its own Solana wallet. The signing key never leaves the machine:
 * withdrawals are built, signed and submitted by the local worker; the browser
 * only sends {destination, amount} through the command queue and receives the
 * transaction signature back.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, QrCode } from 'lucide-react'

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
import { Button } from '@pairlens/ui/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@pairlens/ui/components/ui/card'
import { Input } from '@pairlens/ui/components/ui/input'
import { Label } from '@pairlens/ui/components/ui/label'

import { LAMPORTS_PER_SOL, formatSol, jinxApi } from '@/lib/jinx/client'
import { useJinxCommand, useJinxStatus } from '@/lib/jinx/use-jinx'

export function JinxWallet() {
  const { data } = useJinxStatus({ intervalMs: 6000 })
  const snap = data?.snapshot
  const address = snap?.wallet.address ?? null
  const balanceSol = snap?.wallet.sol ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DepositCard address={address} balanceSol={balanceSol} />
      <WithdrawCard address={address} balanceSol={balanceSol} />
    </div>
  )
}

// ---------------------------------------------------------------------------

function DepositCard({
  address,
  balanceSol,
}: {
  address: string | null
  balanceSol: number | null
}) {
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  const copy = useCallback(async () => {
    if (!address) return
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — the address is on screen to copy by hand */
    }
  }, [address])

  useEffect(() => {
    if (!address) return
    let cancelled = false
    void import('qrcode')
      .then((m) => m.toDataURL(address, { margin: 1, width: 220 }))
      .then((url) => {
        if (!cancelled) setQr(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [address])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit</CardTitle>
        <CardDescription>
          Send SOL to this address to fund JINX. Solana network only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          {qr ? (
            <img
              src={qr}
              alt="JINX wallet address QR"
              className="rounded-lg border bg-white p-2"
              width={200}
              height={200}
            />
          ) : (
            <div className="flex size-[200px] items-center justify-center rounded-lg border text-muted-foreground">
              <QrCode className="size-8" />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            JINX wallet address
          </Label>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-2 py-1.5 text-xs">
              {address ?? 'unavailable'}
            </code>
            <Button
              size="sm"
              variant="outline"
              disabled={!address}
              onClick={copy}
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Current balance:{' '}
          <span className="font-medium text-foreground">
            {formatSol(balanceSol)}
          </span>
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------

type Stage = 'form' | 'review' | 'submitting' | 'done'

function WithdrawCard({
  address,
  balanceSol,
}: {
  address: string | null
  balanceSol: number | null
}) {
  const cmd = useJinxCommand()
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [isMax, setIsMax] = useState(false)
  const [stage, setStage] = useState<Stage>('form')
  const [quote, setQuote] = useState<Awaited<
    ReturnType<typeof quoteWithdraw>
  > | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    signature: string
    explorerUrl: string
    amountSol: number
  } | null>(null)

  const amountLamports = useMemo(() => {
    if (isMax) return 'max' as const
    const n = Number(amount)
    return Number.isFinite(n) && n > 0 ? Math.round(n * LAMPORTS_PER_SOL) : null
  }, [amount, isMax])

  const setMax = () => {
    setIsMax(true)
    setAmount(
      balanceSol != null ? String(Math.max(0, balanceSol - 0.000005)) : '',
    )
  }

  async function review() {
    setError(null)
    if (!destination.trim()) return setError('Enter a destination address.')
    if (amountLamports == null)
      return setError('Enter an amount greater than zero.')
    try {
      const q = await quoteWithdraw(destination.trim(), amountLamports)
      setQuote(q)
      setStage('review')
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not price this withdrawal.',
      )
    }
  }

  async function submit() {
    if (!quote) return
    setStage('submitting')
    setError(null)
    try {
      const res = await cmd.mutateAsync({
        kind: 'withdraw',
        params: {
          destination: quote.destination,
          amountLamports,
          confirm: true,
        },
        label: 'Withdrawal submitted',
      })
      const r = res.result as {
        signature?: string
        explorerUrl?: string
        amountSol?: number
      } | null
      if (!r?.signature) throw new Error('No signature returned')
      setResult({
        signature: r.signature,
        explorerUrl: r.explorerUrl ?? `https://solscan.io/tx/${r.signature}`,
        amountSol: r.amountSol ?? quote.amountSol,
      })
      setStage('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed.')
      setStage('review')
    }
  }

  function reset() {
    setDestination('')
    setAmount('')
    setIsMax(false)
    setQuote(null)
    setResult(null)
    setError(null)
    setStage('form')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw</CardTitle>
        <CardDescription>
          Move SOL out of the JINX wallet. Signed locally — the key never leaves
          the machine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="jinx-wd-dest">Destination address</Label>
          <Input
            id="jinx-wd-dest"
            placeholder="Solana address"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            disabled={stage === 'submitting'}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jinx-wd-amt">Amount (SOL)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="jinx-wd-amt"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                setIsMax(false)
              }}
              disabled={stage === 'submitting'}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={setMax}
              disabled={balanceSol == null || stage === 'submitting'}
            >
              MAX
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Available: {formatSol(balanceSol)}
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button
          className="w-full"
          onClick={review}
          disabled={!address || stage === 'submitting'}
        >
          Review withdrawal
        </Button>
      </CardContent>

      {/* Review + explicit confirmation */}
      <AlertDialog
        open={stage === 'review' || stage === 'submitting'}
        onOpenChange={(o) => !o && stage !== 'submitting' && setStage('form')}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm withdrawal</AlertDialogTitle>
            <AlertDialogDescription>
              Review the details, then submit. This moves real SOL.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm">
            <Row
              k="To"
              v={
                <code className="break-all text-xs">{quote?.destination}</code>
              }
            />
            <Row k="Amount" v={formatSol(quote?.amountSol ?? null)} />
            <Row
              k="Network fee"
              v={`~${formatSol(quote?.estimatedFeeSol ?? null, 6)}`}
            />
            <Row
              k="Balance after"
              v={formatSol(quote?.balanceAfterSol ?? null)}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stage === 'submitting'}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void submit()
              }}
              disabled={stage === 'submitting'}
            >
              {stage === 'submitting' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result */}
      <AlertDialog open={stage === 'done'} onOpenChange={(o) => !o && reset()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdrawal sent</AlertDialogTitle>
            <AlertDialogDescription>
              The transaction was signed locally and submitted to Solana.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm">
            <Row k="Amount" v={formatSol(result?.amountSol ?? null)} />
            <Row
              k="Signature"
              v={
                <a
                  href={result?.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <code className="text-xs">
                    {result?.signature.slice(0, 8)}…
                    {result?.signature.slice(-8)}
                  </code>
                  <ExternalLink className="size-3" />
                </a>
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={reset}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  )
}

interface WithdrawQuote {
  destination: string
  amountSol: number
  estimatedFeeSol: number
  balanceAfterSol: number | null
}

/** Ask the local worker (via the command queue) to dry-run the withdrawal. */
async function quoteWithdraw(
  destination: string,
  amountLamports: number | 'max',
): Promise<WithdrawQuote> {
  const res = await jinxApi.run(
    'quote',
    { destination, amountLamports },
    { timeoutMs: 20_000, pollMs: 1200 },
  )
  const q = (res.result ?? {}) as Record<string, unknown>
  const num = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) ? v : null
  return {
    destination:
      typeof q.destination === 'string' ? q.destination : destination,
    amountSol:
      num(q.amountSol) ??
      (amountLamports === 'max' ? 0 : amountLamports / LAMPORTS_PER_SOL),
    estimatedFeeSol: num(q.estimatedFeeSol) ?? 0.000005,
    balanceAfterSol: num(q.balanceAfterSol),
  }
}
