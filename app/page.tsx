'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPopup } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from './lib/firebase'

export default function LandingPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setError(null)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const email = result.user.email!
      const ref = doc(db, 'toolkitDevelopers', email)
      const snap = await getDoc(ref)
      if (!snap.exists()) {
        await setDoc(ref, { email, createdAt: new Date().toISOString() })
      }
      router.push('/mediator')
    } catch (e: any) {
      setError(e.message ?? 'Sign in failed')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-6">
        <h1 className="text-5xl font-semibold tracking-tight max-w-2xl leading-tight">
          Build and test AI mediators
        </h1>
        <p className="text-xl text-neutral-400">
          Create and test custom mediators through ConvoArena and multi-agent simulations.
        </p>
        <div className="text-xl text-neutral-300 font-bold">
            Please only sign in after reading the  &nbsp;
            <a href= "https://docs.google.com/document/d/1tX9w_9RFuES2jxlGTDY2lXpRenc354hjzYMeH8LzngU/edit?usp=sharing"
                target = "_blank"
                className="text-blue-400 underline hover:text-blue-300">
                instructions
            </a> &nbsp; and completing the &nbsp;
            <a href = "https://forms.gle/4hEYhY9E8SzvYNhi6" target="_blank"
                className="text-blue-400 underline hover:text-blue-300">
                consent form
            </a>.
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            onClick={handleSignIn}
            className="px-6 py-3 rounded-lg bg-neutral-100 text-neutral-950 text-lg font-semibold hover:bg-white active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            Sign in with Google
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 px-8 py-5 text-center text-xs text-neutral-600">
        Mediator Toolkit - TrAuSt
      </footer>

    </div>
  )
}
