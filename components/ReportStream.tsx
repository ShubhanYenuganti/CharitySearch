'use client'

import ReactMarkdown from 'react-markdown'

interface ReportStreamProps {
  content: string
  streaming: boolean
}

function ensureFirstLineIsHeader(text: string): string {
  const firstNewline = text.indexOf('\n')
  const firstLine = firstNewline === -1 ? text : text.slice(0, firstNewline)
  const rest = firstNewline === -1 ? '' : text.slice(firstNewline)
  if (firstLine && !firstLine.startsWith('#')) {
    return `# ${firstLine}${rest}`
  }
  return text
}

export default function ReportStream({ content, streaming }: ReportStreamProps) {
  const normalised = ensureFirstLineIsHeader(content)
  return (
    <div>
      <div className="report-prose">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {normalised}
        </ReactMarkdown>
      </div>
      {streaming && <span className="cursor-blink" aria-hidden="true" />}
    </div>
  )
}
