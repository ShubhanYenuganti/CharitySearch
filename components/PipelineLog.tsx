'use client'

import { useEffect, useRef } from 'react'
import type { LogEntry } from '@/lib/pipeline/events'
import { eventToLogMessage, eventToPrefix } from '@/lib/pipeline/events'

const PREFIX_STYLES: Record<string, string> = {
  '◌': 'text-text-muted',
  '→': 'text-blue-500 dark:text-blue-400',
  '⇡': 'text-amber-500 dark:text-amber-400',
  '✓': 'text-emerald-600 dark:text-emerald-400',
  '!': 'text-red-500 dark:text-red-400',
}

export default function PipelineLog({ entries }: { entries: LogEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [entries.length])

  const visible = entries.filter((e) => eventToLogMessage(e.event) !== null)
  if (visible.length === 0) return null

  return (
    <div className="rounded-md border border-border bg-surface-subtle overflow-hidden">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-xs text-text-muted font-medium uppercase tracking-wide">Pipeline activity</span>
      </div>
      <div className="max-h-56 overflow-y-auto px-4 py-3 space-y-1 font-mono">
        {visible.map((entry) => {
          const msg    = eventToLogMessage(entry.event)
          const prefix = eventToPrefix(entry.event)
          return (
            <div key={entry.id} className="flex items-start gap-3 text-xs leading-relaxed">
              <span className="shrink-0 text-text-muted tabular-nums w-10">
                {(entry.elapsed_ms / 1000).toFixed(1)}s
              </span>
              <span className={`shrink-0 w-3 ${PREFIX_STYLES[prefix] ?? 'text-text-muted'}`}>{prefix}</span>
              <span className="text-text-secondary break-all">{msg}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
