// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
// JINX owner console — React Query hooks.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  jinxApi,
  type JinxCommandKind,
  type JinxCommandResult,
  type JinxStatusResponse,
} from './client'

export const jinxKeys = {
  status: () => ['jinx', 'status'] as const,
}

/**
 * Poll the JINX runtime snapshot. Fast while a command is settling, relaxed
 * otherwise. The snapshot itself carries a `stale` flag when the local worker
 * has gone quiet.
 */
export function useJinxStatus(options?: { intervalMs?: number }) {
  return useQuery<JinxStatusResponse>({
    queryKey: jinxKeys.status(),
    queryFn: () => jinxApi.status(),
    refetchInterval: options?.intervalMs ?? 4000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  })
}

/**
 * Send an owner command and wait for the local worker to run it. Refreshes the
 * status snapshot on settle so the control bar reflects reality immediately.
 */
export function useJinxCommand() {
  const qc = useQueryClient()
  return useMutation<
    JinxCommandResult,
    Error,
    { kind: JinxCommandKind; params?: Record<string, unknown>; label?: string }
  >({
    mutationFn: ({ kind, params }) => jinxApi.run(kind, params ?? {}),
    onSuccess: (_res, { label, kind }) => {
      toast.success(label ?? `JINX ${kind} complete`)
    },
    onError: (err) => {
      toast.error(err.message)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: jinxKeys.status() })
    },
  })
}
