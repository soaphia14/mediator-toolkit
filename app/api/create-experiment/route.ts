import path from 'path'
import { generate, type Mode } from './generator'

const MODES: Mode[] = ['human-human', 'human-agent', 'agent-agent']

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { mediatorTemplate, p1 = 'participant-1', p2 = 'participant-2', topic = 'covenant_marriage', mode, numCohorts, numUtterances, action = 'create' } = body as {
    mediatorTemplate?: string
    p1?: string
    p2?: string
    topic?: string
    mode?: Mode
    numCohorts?: string | number
    numUtterances?: string | number
    action?: 'create' | 'simulate'
  }

  const parsedCohorts = parseInt(String(numCohorts), 10)
  const cohortCount = Number.isFinite(parsedCohorts) && parsedCohorts >= 1 ? parsedCohorts : undefined

  const parsedUtterances = parseInt(String(numUtterances), 10)
  const utteranceCount = Number.isFinite(parsedUtterances) && parsedUtterances >= 1 ? parsedUtterances : undefined

  if (!mediatorTemplate) {
    return Response.json({ error: 'mediatorTemplate is required' }, { status: 400 })
  }

  if (!mode || !MODES.includes(mode)) {
    return Response.json({ error: `invalid or missing mode: ${mode}` }, { status: 400 })
  }

  const experimentTemplatePath = path.join(process.cwd(), 'public', 'templates', 'competition', 'experiment.yaml')

  try {
    const result = await generate(p1, p2, experimentTemplatePath, mediatorTemplate, mode, cohortCount, utteranceCount, action)
    return Response.json(result)
  } catch (e) {
    console.error('Error in create-experiment:', e)
    return Response.json({ error: String(e) }, { status: 500 })
  }
}
