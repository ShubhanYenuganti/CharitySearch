'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AgentProgress from '@/components/AgentProgress'
import OrgCarousel from '@/components/OrgCarousel'
import ReportStream from '@/components/ReportStream'
import PipelineNotice from '@/components/PipelineNotice'
import { AgentStep, OrgResult, PipelineError, ResearcherOutput } from '@/lib/types'
import { queryMatchingOrganizations, OrganizationRecommendation } from '@/app/actions/match_orgs'
import { summarizeCountryIssuesFromOrganizations } from '@/app/actions/country-issues-summary'

const EXAMPLE_QUERIES = ['Education in Sudan', 'Healthcare in Yemen', 'Food security in Ethiopia']

export default function ResultsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q')

  const [step, setStep] = useState<AgentStep>('idle')
  const [researcherData, setResearcherData] = useState<ResearcherOutput | null>(null)
  const [crisisDescription, setCrisisDescription] = useState('')
  const [reportContent] = useState('')
  const [streaming] = useState(false)
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

  async function runPipeline(q: string) {
    // ── Stage 1: Match organizations ─────────────────────────────────────────
    setStep('interpreting')
    let orgs: OrganizationRecommendation[]
    try {
      orgs = await queryMatchingOrganizations(q)
      const mapped: OrgResult[] = orgs.map((rec) => ({
        org_name: rec.org_name,
        sector: rec.sector,
        country: rec.country,
        reason: rec.reason,
        blurb: null,
        donate_url: null,
        org_impact_stats: [],
        sector_tags: [],
        grade_label: null,
        alignment_score: null,
        verified_badge: null,
      }))
      setResearcherData({ orgs: mapped })
    } catch {
      setPipelineError({
        stage: 'researcher',
        kind: 'failed',
        message: 'We could not find matching organizations. Please try rephrasing your query.',
      })
      setStep('error')
      return
    }

    // ── Stage 2: Summarize country issues ─────────────────────────────────────
    setStep('researching')
    try {
      const result = await summarizeCountryIssuesFromOrganizations(orgs)
      setCrisisDescription(result.description)
    } catch {
      setPipelineError({
        stage: 'researcher',
        kind: 'failed',
        message: 'The crisis overview could not be generated. Organization recommendations above are still accurate.',
      })
    }

    setStep('complete')
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

      {/* Org fetch error */}
      {pipelineError?.stage === 'researcher' && !researcherData && (
        <div className="space-y-5">
          <PipelineNotice variant="error" title="No results found">
            {pipelineError.message} Try one of these examples:
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

      {/* Crisis overview */}
      {crisisDescription && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Crisis overview
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary max-w-3xl">
            {crisisDescription}
          </p>
          <p className="text-xs text-text-muted">Reported by UN OCHA / HDX HAPI</p>
        </section>
      )}

      {/* Org cards */}
      {researcherData && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Recommended organizations
          </h2>
          {researcherData.orgs.length > 0 ? (
            <OrgCarousel orgs={researcherData.orgs} />
          ) : (
            <PipelineNotice variant="info" title="No organizations found">
              No matching organizations were identified for this query. Please try a different search.
            </PipelineNotice>
          )}
        </section>
      )}

      {/* Narrator report — not triggered in current pipeline; retained for future use */}
      {researcherData && (reportContent || streaming) && (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-text-muted font-medium">
            Analysis
          </h2>
          <div className="bg-surface border border-border rounded-md px-7 py-6">
            <ReportStream content={reportContent} streaming={streaming} />
          </div>
        </section>
      )}
    </main>
  )
}
