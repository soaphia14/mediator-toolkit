import { adminAuth, adminDb } from '../../../lib/firebaseAdmin'

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

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return Response.json({ error: 'id is required' }, { status: 400 })

  const snap = await adminDb
    .collection('toolkitDevelopers').doc(email)
    .collection('mediators').doc(id)
    .get()

  if (!snap.exists) return Response.json({ error: 'Not found' }, { status: 404 })

  const data = snap.data()!
  return Response.json({ name: data.name, content: data.content })
}
