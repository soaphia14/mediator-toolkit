import { generate } from './generator'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { mediatorTemplate, participantId = 'anonymous', hasAgent = false } = body as {
    mediatorTemplate?: string
    participantId?: string
    hasAgent?: boolean
  }

  if (!mediatorTemplate) {
    console.log('No mediatorTemplate provided in request body')
    return Response.json({ error: 'mediatorTemplate is required' }, { status: 400 })
  }

  try {
    const result = await generate(participantId, mediatorTemplate, hasAgent)
    return Response.json(result)
  } catch (e) {
    console.error('Error in create-experiment:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
