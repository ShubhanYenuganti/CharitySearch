'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AgentProgress from '@/components/AgentProgress'
import ScoredOrgCards from '@/components/ScoredOrgCards'
import UnverifiedOrgCards from '@/components/UnverifiedOrgCards'
import ReportStream from '@/components/ReportStream'
import PipelineLog from '@/components/PipelineLog'
import PipelineNotice from '@/components/PipelineNotice'
import type { AgentStep, ScoredOrg, UnverifiedCandidate } from '@/lib/types'
import type { PipelineEvent, LogEntry } from '@/lib/pipeline/events'

const EXAMPLE_QUERIES = ['Education in Sudan', 'Healthcare in Yemen', 'Food security in Ethiopia']

export default function ResultsClient() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const query        = searchParams.get('q')

  const [step,                 setStep]                 = useState<AgentStep>('idle')
  const [scoredOrgs,           setScoredOrgs]           = useState<ScoredOrg[]>([])
  const [unverifiedCandidates, setUnverifiedCandidates] = useState<UnverifiedCandidate[]>([])
  const [reportContent,        setReportContent]        = useState('')
  const [streaming,            setStreaming]             = useState(false)
  const [activityLog,          setActivityLog]          = useState<LogEntry[]>([])
  const [pipelineError,        setPipelineError]        = useState<string | null>(null)

  const started   = useRef(false)
  const startTime = useRef(Date.now())
  const logId     = useRef(0)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!query) { router.replace('/'); return }
    startTime.current = Date.now()
    runPipeline(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  function appendLog(event: PipelineEvent) {
    setActivityLog((prev) => [
      ...prev,
      { id: String(logId.current++), elapsed_ms: Date.now() - startTime.current, event },
    ])
  }

  function handleEvent(event: PipelineEvent) {
    appendLog(event)

    switch (event.type) {
      case 'stage':
        if (event.stage === 'matching' || event.stage === 'enriching') setStep('interpreting')
        if (event.stage === 'fetching' || event.stage === 'scoring')   setStep('researching')
        if (event.stage === 'narrating')                               setStep('narrating')
        break
      case 'scored':
        setScoredOrgs(event.organizations)
        break
      case 'unverified_candidates':
        setUnverifiedCandidates(event.candidates)
        break
      case 'narration_chunk':
        setStreaming(true)
        setReportContent((prev) => prev + event.text)
        break
      case 'done':
        setStep('complete')
        setStreaming(false)
        break
      case 'error':
        setPipelineError(event.message)
        setStep('error')
        setStreaming(false)
        break
    }
  }

  async function runPipeline(q: string) {
    setStep('interpreting')
    setPipelineError(null)

    try {
      const response = await fetch(`/api/pipeline?q=${encodeURIComponent(q)}`)

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setPipelineError((body as any).error ?? `Pipeline returned ${response.status}`)
        setStep('error')
        return
      }

      const reader  = response.body!.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          for (const line of part.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                handleEvent(JSON.parse(line.slice(6)) as PipelineEvent)
              } catch { /* malformed — skip */ }
            }
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setPipelineError(message)
      setStep('error')
      setStreaming(false)
    }
  }

  return (
    <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-text-muted mb-1 font-medium">Results for</p>
          <h1 className="text-xl font-semibold text-foreground">{query}</h1>
        </div>
        <Link href="/" className="text-sm text-text-muted hover:text-foreground transition-colors mt-1">
          ← New search
        </Link>
      </div>

      {/* Agent progress */}
      {step !== 'idle' && <AgentProgress step={step} />}

      {/* Error */}
      {step === 'error' && pipelineError && (
        <div className="space-y-5">
          <PipelineNotice variant="error" title="Pipeline error">{pipelineError}</PipelineNotice>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <Link key={q} href={`/results?q=${encodeURIComponent(q)}`}
                className="px-3 py-1.5 rounded-full text-xs border border-border text-text-secondary bg-surface-subtle hover:border-accent hover:text-accent transition-colors">
                {q}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Live pipeline log — hidden once complete */}
      {activityLog.length > 0 && step !== 'complete' && (
        <PipelineLog entries={activityLog} />
      )}

      {/* Scored organizations */}
      {scoredOrgs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">Recommended organizations</h2>
          <ScoredOrgCards orgs={scoredOrgs} />
        </section>
      )}

      {/* Unverified organizations */}
      {unverifiedCandidates.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">Also considered</h2>
          <UnverifiedOrgCards candidates={unverifiedCandidates} />
        </section>
      )}

      {/* Narration report */}
      {(reportContent || streaming) && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">Analysis</h2>
          <div className="bg-surface border border-border rounded-md px-7 py-6">
            <ReportStream content={reportContent} streaming={streaming} />
          </div>
        </section>
      )}
    </main>
  )
}
