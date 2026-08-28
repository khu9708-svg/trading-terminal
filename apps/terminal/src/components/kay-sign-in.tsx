// Copyright (c) 2026
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
//
// KAY owner sign-in. A branded launch screen for Cloudflare Access — there is
// no password step here (Access owns authentication) and no Pairlens signup.
// Every option is a full-page navigation to `/api/auth/login`, which a
// dedicated Access application intercepts; `?idp=` deep-links a provider once
// the owner has added Google / GitHub IdPs in Zero Trust.

import { useState } from 'react'
import { motion } from 'motion/react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@pairlens/ui/components/ui/dialog'

import { KayBrand } from '@/components/kay-logo'

const LOGIN_URL = '/api/auth/login'

function go(idp?: 'google' | 'github' | 'onetimepin'): void {
  if (typeof window === 'undefined') return
  window.location.href = idp ? `${LOGIN_URL}?idp=${idp}` : LOGIN_URL
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
function GitHubGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="size-[18px] fill-current" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}
function MailGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m4 7 8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function OptionButton({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex w-full items-center justify-center gap-3 rounded-xl px-5 py-3',
        'text-[14px] font-semibold tracking-tight transition-all duration-200',
        'ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2',
        primary
          ? 'bg-[var(--kay-gold,#d9a441)] text-black ring-[var(--kay-gold,#d9a441)] hover:brightness-110 active:scale-[0.99]'
          : 'bg-white/[0.03] text-foreground ring-white/10 hover:bg-white/[0.06] hover:ring-white/20 active:scale-[0.99]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function KaySignInDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span onClick={() => setOpen(true)}>{children}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="overflow-hidden border-white/10 bg-[#0a0806] p-0 sm:max-w-[420px]"
        >
          <DialogTitle className="sr-only">Sign in to KAY</DialogTitle>
          <DialogDescription className="sr-only">
            Sign in to your KAY account to load your workspaces, watchlists,
            JINX integration and trade history.
          </DialogDescription>

          {/* ambient gold glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[140%] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                'radial-gradient(closest-side, rgba(217,164,65,0.35), transparent)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative flex flex-col items-center gap-6 px-8 pb-9 pt-10 text-center"
          >
            <KayBrand markHeight={44} />

            <div className="space-y-1.5">
              <h2 className="font-serif text-2xl font-light tracking-tight text-foreground">
                Sign in to KAY
              </h2>
              <p className="mx-auto max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">
                Load your workspaces, watchlists, JINX rankings, alerts and
                trade history. The terminal stays public — this unlocks your
                account.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2.5">
              <OptionButton primary onClick={() => go('google')}>
                <GoogleGlyph />
                Continue with Google
              </OptionButton>
              <OptionButton onClick={() => go('github')}>
                <GitHubGlyph />
                Continue with GitHub
              </OptionButton>
              <div className="my-1 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <OptionButton onClick={() => go('onetimepin')}>
                <MailGlyph />
                Email a one-time code
              </OptionButton>
            </div>

            <p className="text-[11px] leading-snug text-muted-foreground/70">
              Secured by Cloudflare Access. KAY never sees your password.
            </p>
          </motion.div>
        </DialogContent>
      </Dialog>
    </>
  )
}
