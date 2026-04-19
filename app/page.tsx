'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import SearchBar from '@/components/SearchBar'

const NASA_IMAGE =
  'https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function handleSearch(query: string) {
    setLoading(true)
    router.push(`/results?q=${encodeURIComponent(query)}`)
  }

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 overflow-hidden">
      {/* Background image */}
      <Image
        src={NASA_IMAGE}
        alt=""
        fill
        className="object-cover object-center select-none pointer-events-none"
        priority
        quality={90}
      />

      {/* Overlay: warm-tinted dark veil so city lights still glow through */}
      <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/60 to-black/75" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-xl space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            CharitySearch
          </h1>
          <p className="text-white/60 leading-relaxed">
            Find high-impact humanitarian organizations matched to the crises
            that matter to you.
          </p>
        </div>

        <SearchBarDark onSubmit={handleSearch} loading={loading} />
      </div>
    </main>
  )
}

function SearchBarDark({
  onSubmit,
  loading,
}: {
  onSubmit: (q: string) => void
  loading: boolean
}) {
  return (
    <div className="[&_input]:bg-white/10 [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder:text-white/40 [&_input]:focus:ring-white/30 [&_button[type=submit]]:bg-white [&_button[type=submit]]:text-black [&_button[type=submit]]:hover:opacity-90 [&_button:not([type=submit])]:border-white/20 [&_button:not([type=submit])]:text-white/50 [&_button:not([type=submit])]:bg-transparent [&_button:not([type=submit])]:hover:border-white/50 [&_button:not([type=submit])]:hover:text-white/80">
      <SearchBar onSubmit={onSubmit} loading={loading} />
    </div>
  )
}
