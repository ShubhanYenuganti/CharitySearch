import { Suspense } from 'react'
import ResultsClient from './ResultsClient'

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <main className="flex-1 px-6 py-10 max-w-5xl mx-auto w-full">
        <div className="text-sm text-text-muted">Loading…</div>
      </main>
    }>
      <ResultsClient />
    </Suspense>
  )
}
