import { generate } from './generator'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { mediatorTemplate, p1 = 'test-p1', p2 = 'test-p2', hasAgent = true, topic = 'covenant_marriage' } = body as {
    mediatorTemplate?: string
    p1?: string
    p2?: string
    hasAgent?: boolean
    topic?: string
  }

  if (!mediatorTemplate) {
    return Response.json({ error: 'mediatorTemplate is required' }, { status: 400 })
  }

  try {
    const result = await generate(p1, p2, mediatorTemplate, topic, hasAgent)
    return Response.json(result)
  } catch (e) {
    console.error('Error in create-experiment:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
