// 1. Force the emulator host variables immediately so they are never missed
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

if (!getApps().length) {
  console.log('🔥 Forcing Firebase Admin to Local Emulators...')
  initializeApp({
    projectId: 'traust-491612',
  })
}

export const adminDb = getFirestore()
export const adminAuth = getAuth()