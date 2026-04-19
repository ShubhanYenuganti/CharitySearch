import { runPipeline } from '@/lib/pipeline/run'
import type { PipelineEvent } from '@/lib/pipeline/events'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing required parameter: q' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const fetchAgentId = process.env.FETCH_AGENT_ID
  if (!fetchAgentId) {
    return new Response(
      JSON.stringify({ error: 'FETCH_AGENT_ID is not configured. Run scripts/create-agent.ts first.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: PipelineEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }
      try {
        for await (const event of runPipeline(query, fetchAgentId)) {
          send(event)
          if (event.type === 'done' || event.type === 'error') break
        }
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : String(err), stage: 'unknown' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
