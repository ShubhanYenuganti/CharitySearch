'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AgentProgress from '@/components/AgentProgress'
import CrisisStats from '@/components/CrisisStats'
import OrgCarousel from '@/components/OrgCarousel'
import ReportStream from '@/components/ReportStream'
import PipelineNotice from '@/components/PipelineNotice'
import { AgentStep, InterpreterOutput, PipelineError, ResearcherOutput } from '@/lib/types'
import {
  mockInterpreterOutput,
  mockResearcherOutput,
  mockNarratorStream,
} from '@/lib/fixtures'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const EXAMPLE_QUERIES = ['Education in Sudan', 'Healthcare in Yemen', 'Food security in Ethiopia']

export default function ResultsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q')

  const [step, setStep] = useState<AgentStep>('idle')
  const [interpreterData, setInterpreterData] = useState<InterpreterOutput | null>(null)
  const [researcherData, setResearcherData] = useState<ResearcherOutput | null>(null)
  const [reportContent, setReportContent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [hapiWarning, setHapiWarning] = useState(false)
  const [pipelineError, setPipelineError] = useState<PipelineError | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    if (!query) {
      router.replace('/')
      return
    }
    runPipeline(query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  async function runPipeline(_q: string) {
    // ── Stage 1: Interpret ────────────────────────────────────────────────────
    setStep('interpreting')
    let interpretData: InterpreterOutput
    try {
      // TODO: replace with real API call when route handler is ready
      await delay(1200)
      interpretData = mockInterpreterOutput

      /*
      const interpretRes = await fetch('/api/agents/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      // 422 → the query couldn't be mapped to a country/issue
      if (interpretRes.status === 422) {
        const body = await interpretRes.json().catch(() => ({}))
        setPipelineError({ stage: 'interpreter', kind: 'bad_query', message: body.message ?? '' })
        setStep('error')
        return
      }
      // 503 → HAPI was down; route handler fell back to cached data
      if (interpretRes.status === 503) {
        const body = await interpretRes.json().catch(() => ({}))
        setPipelineError({ stage: 'interpreter', kind: 'hapi_down', message: body.message ?? '' })
        interpretData = body.data as InterpreterOutput
        setHapiWarning(true)
        setInterpreterData(interpretData)
        // continue — we still have something to show
      } else if (!interpretRes.ok) {
        throw new Error(`Interpreter returned ${interpretRes.status}`)
      } else {
        interpretData = await interpretRes.json()
        if (interpretData.hapi_stale) setHapiWarning(true)
        setInterpreterData(interpretData)
      }
      */

      if (interpretData.hapi_stale) setHapiWarning(true)
      setInterpreterData(interpretData)
    } catch {
      // Unexpected interpreter failure — treat as bad_query (hard stop)
      setPipelineError({
        stage: 'interpreter',
        kind: 'bad_query',
        message: 'We could not analyse your query. Please try rephrasing it.',
      })
      setStep('error')
      return
    }

    // ── Stage 2: Research ─────────────────────────────────────────────────────
    setStep('researching')
    let researchData: ResearcherOutput
    try {
      // TODO: replace with real API call when route handler is ready
      await delay(1500)
      researchData = mockResearcherOutput

      /*
      const researchRes = await fetch('/api/agents/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interpreter_output: interpretData }),
      })
      if (!researchRes.ok) throw new Error(`Researcher returned ${researchRes.status}`)
      researchData = await researchRes.json()
      */

      setResearcherData(researchData)
    } catch {
      // Researcher failed — show crisis stats but surface the org error inline
      setPipelineError({
        stage: 'researcher',
        kind: 'failed',
        message: 'Organization data could not be retrieved. The crisis overview above is still accurate.',
      })
      setStep('complete')
      return
    }

    // ── Stage 3: Narrate ──────────────────────────────────────────────────────
    setStep('narrating')
    try {
      // TODO: replace with real API call when route handler is ready
      setStreaming(true)
      const words = mockNarratorStream.split(' ')
      for (const word of words) {
        setReportContent((prev) => prev + word + ' ')
        await delay(30)
      }
      setStreaming(false)

      /*
      const narrateRes = await fetch('/api/agents/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpreter_output: interpretData,
          researcher_output: researchData,
        }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!narrateRes.ok) throw new Error(`Narrator returned ${narrateRes.status}`)
      const reader = narrateRes.body!.getReader()
      const decoder = new TextDecoder()
      setStreaming(true)
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setReportContent((prev) => prev + decoder.decode(value))
      }
      setStreaming(false)
      */
    } catch {
      // Narrator timed out or failed — org cards are already visible, surface inline
      setStreaming(false)
      setPipelineError({
        stage: 'narrator',
        kind: 'timeout',
        message: 'The report timed out before completing. Organization recommendations above are based on verified data.',
      })
      setStep('complete')
      return
    }

    setStep('complete')
  }

  // Hard stop: interpreter couldn't parse the query
  const isHardStop =
    pipelineError?.stage === 'interpreter' && pipelineError.kind === 'bad_query'

  return (
    <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-text-muted mb-1 font-medium">
            Results for
          </p>
          <h1 className="text-xl font-semibold text-foreground">{query}</h1>
        </div>
        <Link
          href="/"
          className="text-sm text-text-muted hover:text-foreground transition-colors mt-1"
        >
          ← New search
        </Link>
      </div>

      {/* Agent progress */}
      {step !== 'idle' && <AgentProgress step={step} />}

      {/* Hard stop: bad query */}
      {isHardStop && (
        <div className="space-y-5">
          <PipelineNotice variant="error" title="Query not recognised">
            We couldn&rsquo;t identify a humanitarian issue or location in your query. Try
            describing a specific crisis — for example:
          </PipelineNotice>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <Link
                key={q}
                href={`/results?q=${encodeURIComponent(q)}`}
                className="px-3 py-1.5 rounded-full text-xs border border-border text-text-secondary bg-surface-subtle hover:border-accent hover:text-accent transition-colors"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Crisis stats */}
      {interpreterData && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Crisis overview
          </h2>
          {hapiWarning && (
            <PipelineNotice variant="warning" title="Humanitarian data may be out of date">
              The UN Humanitarian Data Exchange (HDX HAPI) is currently unreachable. The figures
              below reflect the most recently cached data and may not capture the latest situation.
            </PipelineNotice>
          )}
          <CrisisStats data={interpreterData} />
        </section>
      )}

      {/* Org cards — or inline error if researcher failed */}
      {interpreterData && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Recommended organizations
          </h2>
          {pipelineError?.stage === 'researcher' ? (
            <PipelineNotice variant="error" title="Organization data unavailable">
              We couldn&rsquo;t retrieve charity recommendations at this time. The crisis overview
              above is still accurate. Please try again in a few moments.
            </PipelineNotice>
          ) : researcherData && researcherData.orgs.length > 0 ? (
            <OrgCarousel orgs={researcherData.orgs} />
          ) : null}
        </section>
      )}

      {/* Narrator report — or inline error if narrator timed out */}
      {interpreterData && researcherData && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Analysis
          </h2>
          {pipelineError?.stage === 'narrator' ? (
            <PipelineNotice variant="info" title="Report unavailable">
              The written analysis timed out before completing. The organization recommendations
              above are drawn directly from verified field data and are unaffected.
            </PipelineNotice>
          ) : (reportContent || streaming) ? (
            <div className="bg-surface border border-border rounded-md px-7 py-6">
              <ReportStream content={reportContent} streaming={streaming} />
            </div>
          ) : null}
        </section>
      )}
    </main>
  )
}
