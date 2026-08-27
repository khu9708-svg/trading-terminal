// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
// KAY brand marks. Chrome / brushed-gunmetal body, bright silver bevels, and
// thin illuminated seams with a soft white-to-ice-blue internal glow — light
// that feels embedded inside the metal, not painted on. Premium automotive
// ambient lighting, not gamer RGB.
//
// Everything is inline SVG so it renders on the black terminal without a font
// or asset load, and both marks share one <defs> instance id-namespaced per
// render to stay safe if two appear on the page.

import { useId } from 'react'
import type { CSSProperties } from 'react'

// ── the backwards / mirrored K ─────────────────────────────────────────
// Arms point left, stem on the right. One filled body path; the seams are
// stroked over it and bloom through a blur filter.
const K_BODY =
  'M62 2 H86 V118 H62 Z ' + // right stem, bold
  'M6 4 H40 L74 52 V66 L40 66 Z ' + // upper-left arm, chunky
  'M6 116 H40 L74 68 V54 L40 54 Z' // lower-left arm, chunky

const K_SEAMS = [
  'M74 6 V114', // bright cut down the stem
  'M13 9 L60 58', // inner edge, upper arm
  'M13 111 L60 62', // inner edge, lower arm
]

export function KayMark({
  className,
  style,
  sweep = true,
}: {
  className?: string
  style?: CSSProperties
  sweep?: boolean
}) {
  const uid = useId().replace(/:/g, '')
  const id = (k: string) => `kay-${uid}-${k}`

  return (
    <svg
      viewBox="0 0 94 120"
      role="img"
      aria-label="KAY"
      className={className}
      style={style}
    >
      <defs>
        {/* gunmetal body: dark chrome outer, bright silver mid-bevel */}
        <linearGradient id={id('body')} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#20252c" />
          <stop offset="0.16" stopColor="#4b5560" />
          <stop offset="0.42" stopColor="#c9d2dc" />
          <stop offset="0.52" stopColor="#eef3f8" />
          <stop offset="0.63" stopColor="#aeb8c4" />
          <stop offset="0.86" stopColor="#39424d" />
          <stop offset="1" stopColor="#161a1f" />
        </linearGradient>
        {/* bright silver bevel edge */}
        <linearGradient id={id('edge')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f8fc" />
          <stop offset="0.5" stopColor="#9aa6b3" />
          <stop offset="1" stopColor="#e7edf4" />
        </linearGradient>
        {/* soft white → ice-blue internal illumination */}
        <linearGradient id={id('seam')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#eaf4ff" />
          <stop offset="1" stopColor="#bfe0ff" />
        </linearGradient>
        {/* the slow light sweep */}
        <linearGradient id={id('sweep')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <filter id={id('bloom')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.7" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="0 0 0 0 0.78  0 0 0 0 0.9  0 0 0 0 1  0 0 0 1 0"
            result="tint"
          />
          <feMerge>
            <feMergeNode in="tint" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* very faint reflected glow onto the black header around the mark */}
        <filter id={id('cast')} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="7" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.62  0 0 0 0 0.78  0 0 0 0 1  0 0 0 0.5 0"
          />
        </filter>

        <clipPath id={id('clip')}>
          <path d={K_BODY} fillRule="evenodd" />
        </clipPath>
      </defs>

      {/* faint cast glow behind everything */}
      <path
        d={K_BODY}
        fillRule="evenodd"
        fill="#9cc4ff"
        filter={`url(#${id('cast')})`}
        opacity="0.28"
      />

      {/* chrome body */}
      <path
        d={K_BODY}
        fillRule="evenodd"
        fill={`url(#${id('body')})`}
        stroke={`url(#${id('edge')})`}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* illuminated seams, blooming through the metal */}
      <g
        clipPath={`url(#${id('clip')})`}
        filter={`url(#${id('bloom')})`}
        stroke={`url(#${id('seam')})`}
        strokeWidth="3.1"
        strokeLinecap="round"
        fill="none"
      >
        {K_SEAMS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* slow light sweep every ~8s */}
      {sweep && (
        <g clipPath={`url(#${id('clip')})`} style={{ mixBlendMode: 'overlay' }}>
          <rect
            x="-120"
            y="0"
            width="90"
            height="120"
            fill={`url(#${id('sweep')})`}
            transform="skewX(-18)"
          >
            <animate
              attributeName="x"
              values="-120;180"
              dur="2.2s"
              begin="0s;anim.end+6.5s"
              id="anim"
              calcMode="spline"
              keySplines="0.5 0 0.5 1"
            />
          </rect>
        </g>
      )}
    </svg>
  )
}

// ── the KAY wordmark ───────────────────────────────────────────────────
// K, a crossbarless Λ-style A, and Y — pure straight strokes, drawn as paths
// so the A never grows a crossbar and the tracking is exact. Cap height 100,
// wide inter-letter gaps for the 0.28em feel.
const STROKE = 15
const LETTERS: Array<string> = [
  // K
  'M0 0 V100 M0 50 L44 0 M0 50 L44 100',
  // Λ  (A with no crossbar)
  'M100 100 L145 0 L190 100',
  // Y
  'M232 0 L268 46 L304 0 M268 46 V100',
]

export function KayWordmark({
  className,
  style,
}: {
  className?: string
  style?: CSSProperties
}) {
  const uid = useId().replace(/:/g, '')
  const gid = `kayw-${uid}`
  return (
    <svg
      viewBox={`-4 -4 312 ${100 + 8}`}
      role="img"
      aria-label="KAY"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#dfe6ee" />
          <stop offset="1" stopColor="#aab3bf" />
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={STROKE}
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        {LETTERS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  )
}

// ── lockup: mark + wordmark, with the dark radial glow behind ──────────
export function KayBrand({
  className,
  markHeight = 46,
  style,
}: {
  className?: string
  markHeight?: number
  style?: CSSProperties
}) {
  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: markHeight * 0.42,
        paddingInline: markHeight * 0.5,
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: `${-markHeight * 0.9}px ${-markHeight * 0.6}px`,
          background:
            'radial-gradient(ellipse at 22% 50%, rgba(120,150,205,0.16), rgba(120,150,205,0.05) 45%, transparent 72%)',
          pointerEvents: 'none',
        }}
      />
      <KayMark
        style={{
          height: markHeight,
          width: 'auto',
          position: 'relative',
          filter: 'drop-shadow(0 0 12px rgba(155,190,255,0.30))',
        }}
      />
      <KayWordmark
        style={{
          height: markHeight * 0.62,
          width: 'auto',
          position: 'relative',
          letterSpacing: '0.28em',
        }}
      />
    </span>
  )
}
