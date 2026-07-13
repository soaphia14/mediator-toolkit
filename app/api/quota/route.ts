import { adminAuth, adminDb } from '../../lib/firebaseAdmin'

export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let email: string
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    email = decoded.email!
  } catch {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const [userSnap, configSnap] = await Promise.all([
    adminDb.collection('toolkitDevelopers').doc(email).get(),
    adminDb.collection('toolkit').doc('config').get(),
  ])

  const limit: number = configSnap.data()?.dailySimLimit ?? 30
  const userData = userSnap.data() ?? {}
  const used: number = userData.simCountDate === today ? (userData.dailySimCount ?? 0) : 0

  return Response.json({ used, limit })
}
