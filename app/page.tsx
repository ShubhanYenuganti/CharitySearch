'use client'

import { useRouter } from 'next/navigation'
import SearchBar from '@/components/SearchBar'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function handleSearch(query: string) {
    setLoading(true)
    router.push(`/results?q=${encodeURIComponent(query)}`)
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-xl space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            CharitySearch
          </h1>
          <p className="text-text-secondary leading-relaxed">
            Find high-impact humanitarian organizations matched to the crises
            that matter to you.
          </p>
        </div>

        <SearchBar onSubmit={handleSearch} loading={loading} />
      </div>
    </main>
  )
}
