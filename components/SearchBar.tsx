'use client'

import { useState } from 'react'

interface SearchBarProps {
  onSubmit: (query: string) => void
  loading: boolean
}

const EXAMPLE_QUERIES = [
  'Education in Sudan',
  'Healthcare in Yemen',
  'Food security in Ethiopia',
]

export default function SearchBar({ onSubmit, loading }: SearchBarProps) {
  const [value, setValue] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
  }

  function handleChip(query: string) {
    setValue(query)
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. education in Sudan, healthcare in Yemen..."
          disabled={loading}
          className="
            flex-1 px-4 py-3 rounded-md border
            border-border bg-surface
            text-foreground placeholder:text-text-muted
            text-sm focus:outline-none focus:ring-2 focus:ring-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="
            px-5 py-3 rounded-md text-sm font-medium
            bg-accent text-white
            hover:opacity-90 active:opacity-80
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-opacity whitespace-nowrap
          "
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mt-3">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleChip(q)}
            disabled={loading}
            className="
              px-3 py-1.5 rounded-full text-xs border
              border-border text-text-secondary
              bg-surface-subtle hover:border-accent
              hover:text-accent disabled:opacity-40
              disabled:cursor-not-allowed transition-colors
            "
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
