'use client'

import { useState } from 'react'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider())
      const email = result.user.email!

      const ref = doc(db, 'developers', email)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, { email, createdAt: new Date().toISOString() })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 p-8">
      <div className="w-full max-w-sm space-y-8">

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mediator Toolkit</h1>
          <p className="text-base text-neutral-500 mt-1">Sign in to continue.</p>
        </div>

        <div className="rounded-lg border border-neutral-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
            <h2 className="text-sm font-semibold text-neutral-300">Sign in</h2>
          </div>
          <div className="p-4 bg-neutral-900/20">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-900 text-sm font-medium text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {!loading && (
                <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
              )}
              {loading ? 'Signing in…' : 'Continue with Google'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

      </div>
    </div>
  )
}
