# JINX owner console (terminal integration)

Turns kayjaytrades.com into the place Kevin operates JINX from — no terminals,
no PowerShell, no ports.

## Data path

```
browser (this terminal)
  → kayjaytrades.com/api/jinx/*        (kay-app-server Worker, requireAccess = owner only)
    → D1 command queue  ←poll→  local JINX worker (127.0.0.1:8794)
                                  → runtime-control.mjs → jinx-engine.exe
                                  → wallet-ops.mjs (local signer, key never leaves the box)
```

The Cloudflare edge cannot reach `127.0.0.1:8794`, so control is an **outbound
queue**: the browser enqueues a command, the local worker polls it, runs it, and
posts the result back. Status is a snapshot the worker pushes every ~5s; when it
goes quiet the console shows `DISCONNECTED`.

## Files

| File                                          | What                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `client.ts`                                   | typed API client + display helpers. Uses `authFetch` from `@/lib/api`.           |
| `use-jinx.ts`                                 | `useJinxStatus()` (polls `/api/jinx/status`), `useJinxCommand()` (send + await). |
| `../../components/jinx/jinx-control-bar.tsx`  | START/STOP, MANUAL/AUTO, Alerts, Feed, Wallet, P&L.                              |
| `../../components/jinx/jinx-status-strip.tsx` | compact `LIVE/OFF · MODE · SOL · Alerts · P&L` for the status bar.               |
| `../../components/jinx/jinx-wallet.tsx`       | Deposit (address + QR) / Withdraw (review → confirm → signature).                |
| `../../components/jinx/jinx-console-page.tsx` | composes the above.                                                              |
| `../../routes/_terminal/jinx.tsx`             | the `/jinx` route.                                                               |

## Remaining wiring (3 small edits — kept out of this commit so they land verified)

1. **Route tree** — `routeTree.gen.ts` regenerates on `bun dev` / `bun build`
   (TanStack Start vite plugin). Nothing to hand-edit; just run the dev server once.

2. **Nav item** — in `src/routes/_terminal.tsx`, add JINX to the sidebar. Near
   `NAV_ITEMS` / the rail `<SidebarMenu>`, add an entry pointing at `/jinx`
   (icon: `Bot` from lucide is already imported). Add `nav.jinx` to the locale
   files (`src/locales/*/translation.json`) or use a literal `"JINX"`.

3. **Status strip** — in `src/components/layout/status-bar.tsx`, render
   `<JinxStatusStrip />` (import from `@/components/jinx/jinx-status-strip`). It's
   a self-contained `<Link to="/jinx">` and no-ops gracefully until the worker
   reports.

## Dependency

`jinx-wallet.tsx` lazy-imports `qrcode` for the deposit QR. Add it:

```
bun add qrcode && bun add -d @types/qrcode
```

(If you'd rather not, the address + Copy button work without it; the QR box just
shows a placeholder icon.)

## Env (production)

`VITE_APP_SERVER_URL=https://kayjaytrades.com` — then all `/api/jinx/*` calls hit
the kay-app-server Worker with the owner's Access session automatically.
