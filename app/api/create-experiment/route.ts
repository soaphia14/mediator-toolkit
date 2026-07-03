import path from 'path'
import { generate, type Mode } from './generator'

const MODES: Mode[] = ['human-human', 'human-agent', 'agent-agent']

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { mediatorTemplate, p1 = 'test-p1', p2 = 'test-p2', topic = 'covenant_marriage', mode } = body as {
    mediatorTemplate?: string
    p1?: string
    p2?: string
    topic?: string
    mode?: Mode
  }

  if (!mediatorTemplate) {
    return Response.json({ error: 'mediatorTemplate is required' }, { status: 400 })
  }

  if (!mode || !MODES.includes(mode)) {
    return Response.json({ error: `invalid or missing mode: ${mode}` }, { status: 400 })
  }

  const experimentTemplatePath = path.join(process.cwd(), 'public', 'templates', 'topics', topic, 'experiment.yaml')

  try {
    const result = await generate(p1, p2, experimentTemplatePath, mediatorTemplate, mode)
    return Response.json(result)
  } catch (e) {
    console.error('Error in create-experiment:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
