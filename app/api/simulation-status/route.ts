const BASE_URL = 'https://us-central1-traust-491612.cloudfunctions.net/api/v1'

const TERMINAL_STATUSES = new Set([
  'SUCCESS',
  'TRANSFER_TIMEOUT',
  'TRANSFER_FAILED',
  'TRANSFER_DECLINED',
  'ATTENTION_TIMEOUT',
  'BOOTED_OUT',
  'DELETED',
])

export async function GET(request: Request) {
  const apiKey = 'dlb_live_ttWLOHIFIpzTj7XJKg85Mwk4RtxAELtWfL1hu5dTuCg' //process.env.DL_API_KEY ?? ''
  if (!apiKey) return Response.json({ error: 'DL_API_KEY not set' }, { status: 500 })

  const expId = new URL(request.url).searchParams.get('experimentId')
  if (!expId) return Response.json({ error: 'experimentId query param is required' }, { status: 400 })

  const res = await fetch(`${BASE_URL}/experiments/${expId}/export`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  })
  const data = await res.json()
  if (!res.ok) return Response.json(data, { status: res.status })

  const participants = Object.values(data?.participantMap ?? {}) as Array<{ profile?: { currentStatus?: string } }>
  const statuses = participants.map((p) => p?.profile?.currentStatus)
  const completed = statuses.length > 0 && statuses.every((s) => s !== undefined && TERMINAL_STATUSES.has(s))

  return Response.json({ completed, statuses, export: data })
}
