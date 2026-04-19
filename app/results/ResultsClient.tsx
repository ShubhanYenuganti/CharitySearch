'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AgentProgress from '@/components/AgentProgress'
import CrisisStats from '@/components/CrisisStats'
import OrgCarousel from '@/components/OrgCarousel'
import ReportStream from '@/components/ReportStream'
import { AgentStep, InterpreterOutput, ResearcherOutput } from '@/lib/types'
import {
  mockInterpreterOutput,
  mockResearcherOutput,
  mockNarratorStream,
} from '@/lib/fixtures'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function ResultsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q')

  const [step, setStep] = useState<AgentStep>('idle')
  const [interpreterData, setInterpreterData] = useState<InterpreterOutput | null>(null)
  const [researcherData, setResearcherData] = useState<ResearcherOutput | null>(null)
  const [reportContent, setReportContent] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  async function runPipeline(q: string) {
    void q
    try {
      // TODO: replace with real API calls when route handlers are ready

      // Step 1
      setStep('interpreting')
      await delay(1200)
      setInterpreterData(mockInterpreterOutput)

      // Step 2
      setStep('researching')
      await delay(1500)
      setResearcherData(mockResearcherOutput)

      // Step 3 — stream mock narrator word by word
      setStep('narrating')
      setStreaming(true)
      const words = mockNarratorStream.split(' ')
      for (const word of words) {
        setReportContent((prev) => prev + word + ' ')
        await delay(30)
      }
      setStreaming(false)
      setStep('complete')

      /*
      // Real API calls (uncomment when route handlers are ready):

      // Step 1
      const interpretRes = await fetch('/api/agents/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      if (!interpretRes.ok) throw new Error('Interpreter failed')
      const interpretData: InterpreterOutput = await interpretRes.json()
      setInterpreterData(interpretData)

      // Step 2
      const researchRes = await fetch('/api/agents/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interpreter_output: interpretData }),
      })
      if (!researchRes.ok) throw new Error('Researcher failed')
      const researchData: ResearcherOutput = await researchRes.json()
      setResearcherData(researchData)

      // Step 3 — streaming
      const narrateRes = await fetch('/api/agents/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interpreter_output: interpretData,
          researcher_output: researchData,
        }),
      })
      if (!narrateRes.ok) throw new Error('Narrator failed')
      const reader = narrateRes.body!.getReader()
      const decoder = new TextDecoder()
      setStreaming(true)
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setReportContent((prev) => prev + decoder.decode(value))
      }
      setStreaming(false)
      setStep('complete')
      */
    } catch (err) {
      setStep('error')
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

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

      {/* Crisis stats */}
      {interpreterData && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Crisis overview
          </h2>
          <CrisisStats data={interpreterData} />
        </section>
      )}

      {/* Org cards */}
      {researcherData && researcherData.orgs.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Recommended organizations
          </h2>
          <OrgCarousel orgs={researcherData.orgs} />
        </section>
      )}

      {/* Narrator report */}
      {(reportContent || streaming) && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Analysis
          </h2>
          <div className="bg-surface border border-border rounded-md px-7 py-6">
            <ReportStream content={reportContent} streaming={streaming} />
          </div>
        </section>
      )}

      {/* Error */}
      {step === 'error' && error && (
        <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 px-5 py-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}
    </main>
  )
}
