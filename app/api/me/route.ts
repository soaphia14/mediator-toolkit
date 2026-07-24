import { adminAuth, adminDb } from '../../lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

// POST /api/me — ensure toolkitDevelopers/{email} exists (admin bypasses rules)
export async function POST(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let email: string
  try {
    email = (await adminAuth.verifyIdToken(token)).email!
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ref = adminDb.collection('toolkitDevelopers').doc(email)
  const snap = await ref.get()
  if (!snap.exists) {
    await ref.set({ email, createdAt: FieldValue.serverTimestamp() })
  }

  return Response.json({ email, created: !snap.exists })
}
