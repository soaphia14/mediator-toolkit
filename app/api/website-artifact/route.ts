export async function POST(request: Request) {
  const createExperimentUrl = new URL('/api/create-experiment', request.url)

  const res = await fetch(createExperimentUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediatorTemplate: '{}',
      mode: 'human-agent',
    }),
  })

  const data = await res.json()
  return Response.json(data, { status: res.status })
}
