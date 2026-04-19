'use client'

import ReactMarkdown from 'react-markdown'

interface ReportStreamProps {
  content: string
  streaming: boolean
}

export default function ReportStream({ content, streaming }: ReportStreamProps) {
  return (
    <div className="max-w-2xl">
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
          {content}
        </ReactMarkdown>
      </div>
      {streaming && <span className="cursor-blink" aria-hidden="true" />}
    </div>
  )
}
