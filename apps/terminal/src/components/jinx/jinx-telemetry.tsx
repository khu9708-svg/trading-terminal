// Copyright (c) 2026 Juan Ignacio Molina Estrada
// SPDX-License-Identifier: FSL-1.1-Apache-2.0
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@pairlens/ui/components/ui/card'

import { useJinxStatus } from '@/lib/jinx/use-jinx'

export function JinxTelemetry() {
  const { data } = useJinxStatus({ intervalMs: 4000 })
  const telemetry = data?.snapshot

  if (!telemetry) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Canonical telemetry</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          DISCONNECTED: the local producer has not reported canonical telemetry.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm">Canonical telemetry</CardTitle>
        <p className="text-xs text-muted-foreground">
          {telemetry.contract_version} · as of {telemetry.as_of} · source{' '}
          {telemetry.source_status}
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm md:grid-cols-2">
        <TelemetrySection
          title="JINX"
          rows={[
            [
              'Lifecycle',
              `${telemetry.lifecycle.state} · ${telemetry.lifecycle.phase}`,
            ],
            [
              'Discovery',
              `${telemetry.discovery.status} · ${telemetry.discovery.candidates.length} candidates`,
            ],
            [
              'Token market',
              `${telemetry.token_market.symbol} · ${telemetry.token_market.status}`,
            ],
            [
              'Safety',
              `${telemetry.safety.status} · ${telemetry.safety.reason}`,
            ],
            [
              'Position',
              `${telemetry.position.status} · ${telemetry.position.token}`,
            ],
            [
              'Execution',
              `${telemetry.execution.state} · ${telemetry.execution.detail}`,
            ],
          ]}
        />
        <TelemetrySection
          title="MCP observer"
          rows={[
            [
              'MCP',
              `${telemetry.mcp.status} · ${telemetry.mcp.servers.length} servers`,
            ],
            ['Agents', String(telemetry.agents.length)],
            [
              'Browser',
              `${telemetry.browser.status} · ${telemetry.browser.target}`,
            ],
            [
              'GitHub',
              `${telemetry.github.pr_state} · ${telemetry.github.ci_state}`,
            ],
            [
              'Interceptor',
              `${telemetry.interceptor.state} · ${telemetry.interceptor.detail}`,
            ],
            ['Commands', String(telemetry.commands.length)],
          ]}
        />
        <div className="md:col-span-2">
          <div className="mb-1 text-xs font-medium text-muted-foreground">
            Events
          </div>
          {telemetry.events.length ? (
            <ul className="space-y-1 font-mono text-xs">
              {telemetry.events.slice(-4).map((event, index) => (
                <li key={index} className="truncate">
                  {eventText(event)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              No canonical events supplied.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TelemetrySection({
  title,
  rows,
}: {
  title: string
  rows: Array<[string, string]>
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <span className="text-muted-foreground">{label}</span>
          <span className="truncate text-right font-medium">{value}</span>
        </div>
      ))}
    </section>
  )
}

function eventText(event: Record<string, unknown>) {
  const timestamp =
    typeof event.timestamp === 'string' ? `${event.timestamp} ` : ''
  const level = typeof event.level === 'string' ? event.level : 'EVENT'
  const message =
    typeof event.message === 'string'
      ? event.message
      : typeof event.detail === 'string'
        ? event.detail
        : JSON.stringify(event)
  return `${timestamp}[${level}] ${message}`
}
