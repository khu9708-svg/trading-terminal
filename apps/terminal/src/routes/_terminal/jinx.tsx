// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { HEADER_TITLE } from '@/components/chrome/header-chrome'
import { PAGE_FRAME } from '@/components/chrome/page-chrome'
import {
  MasterDetailSkeleton,
  PendingAfter,
} from '@/components/master-detail-skeleton'
import { PageHeader } from '@/components/page-header'
import { lazyPageChunk } from '@/lib/pending-pacing'

const JinxConsolePage = lazyPageChunk(() =>
  import('@/components/jinx/jinx-console-page').then((m) => ({
    default: m.JinxConsolePage,
  })),
)

export const Route = createFileRoute('/_terminal/jinx')({
  component: JinxRoute,
})

function JinxRoute() {
  return (
    <main className={PAGE_FRAME}>
      <PageHeader>
        <h1 className={HEADER_TITLE}>JINX</h1>
      </PageHeader>
      <Suspense
        fallback={
          <PendingAfter>
            <MasterDetailSkeleton body="detail" label="Loading JINX console…" />
          </PendingAfter>
        }
      >
        <JinxConsolePage />
      </Suspense>
    </main>
  )
}
