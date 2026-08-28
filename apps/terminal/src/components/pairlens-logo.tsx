// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
// KAY brand mark for the header. Named `PairlensLogo` for import stability
// across the codebase; it renders the KAY lockup (backwards-K chrome mark +
// K A Y wordmark) with the light-through-metal treatment. See `kay-logo.tsx`.
import type { HTMLAttributes } from 'react'
import { KayBrand } from '@/components/kay-logo'

type Props = HTMLAttributes<HTMLSpanElement> & {
  /** Height of the chrome mark in px. Wordmark scales from it. */
  markHeight?: number
  // Legacy <img> props some callers still pass — accepted and ignored.
  width?: number
  height?: number
  alt?: string
  draggable?: boolean
}

export function PairlensLogo({
  markHeight = 46,
  className,
  width: _w,
  height: _h,
  alt: _a,
  draggable: _d,
  ...rest
}: Props) {
  return <KayBrand markHeight={markHeight} className={className} {...rest} />
}
