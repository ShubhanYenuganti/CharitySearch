'use client'

import { useState } from 'react'
import ScoredOrgCard from './ScoredOrgCard'
import type { ScoredOrg } from '@/lib/types'

const VISIBLE = 3

export default function ScoredOrgCards({ orgs }: { orgs: ScoredOrg[] }) {
  const [start, setStart] = useState(0)
  if (orgs.length === 0) return null

  const canPrev = start > 0
  const canNext = start + VISIBLE < orgs.length
  const visible = orgs.slice(start, start + VISIBLE)

  return (
    <div className="space-y-3">
      {orgs.length > VISIBLE && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted tabular-nums">
            {start + 1}–{Math.min(start + VISIBLE, orgs.length)} of {orgs.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setStart((s) => s - 1)} disabled={!canPrev} aria-label="Previous"
              className="flex items-center justify-center w-8 h-8 rounded border border-border text-text-muted bg-surface hover:border-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button onClick={() => setStart((s) => s + 1)} disabled={!canNext} aria-label="Next"
              className="flex items-center justify-center w-8 h-8 rounded border border-border text-text-muted bg-surface hover:border-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {visible.map((org) => <ScoredOrgCard key={org.org_name} org={org} />)}
      </div>
    </div>
  )
}
