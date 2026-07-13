import path from 'path'
import { generate, type Mode } from './generator'
import { adminAuth, adminDb } from '../../lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

const MODES: Mode[] = ['human-human', 'human-agent', 'agent-agent']

function todayInEST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
}

async function checkAndIncrementQuota(email: string, cohorts: number): Promise<{ allowed: boolean; used: number; limit: number }> {
  const configRef = adminDb.collection('toolkit').doc('config')
  const userRef = adminDb.collection('toolkitDevelopers').doc(email)
  const today = todayInEST()

  return adminDb.runTransaction(async (tx) => {
    const [configSnap, userSnap] = await Promise.all([tx.get(configRef), tx.get(userRef)])
    const limit: number = configSnap.data()?.dailySimLimit ?? 10
    const userData = userSnap.data() ?? {}
    const lastDate: string = userData.simCountDate ?? ''
    const currentCount: number = lastDate === today ? (userData.dailySimCount ?? 0) : 0

    if (currentCount >= limit) return { allowed: false, used: currentCount, limit }

    tx.update(userRef, {
      dailySimCount: currentCount + cohorts,
      simCountDate: today,
      lastSimulationRan: FieldValue.serverTimestamp(),
    })
    return { allowed: true, used: currentCount + cohorts, limit }
  })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { mediatorTemplate, p1 = 'participant-1', p2 = 'participant-2', topic = 'covenant_marriage', mode, numCohorts, numUtterances, action = 'create', idToken } = body as {
    mediatorTemplate?: string
    p1?: string
    p2?: string
    topic?: string
    mode?: Mode
    numCohorts?: string | number
    numUtterances?: string | number
    action?: 'create' | 'simulate'
    idToken?: string
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

  if (action === 'simulate') {
    if (!idToken) return Response.json({ error: 'Authentication required' }, { status: 401 })
    let email: string
    try {
      const decoded = await adminAuth.verifyIdToken(idToken)
      email = decoded.email!
    } catch {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const quota = await checkAndIncrementQuota(email, cohortCount ?? 1)
    if (!quota.allowed) {
      return Response.json({ error: `Daily simulation limit reached (${quota.limit}/day). Resets at midnight EST.` }, { status: 429 })
    }
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
