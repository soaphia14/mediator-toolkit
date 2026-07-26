'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithPopup } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from './lib/firebase'

const INSTRUCTIONS_URL =
  'https://docs.google.com/document/d/1tX9w_9RFuES2jxlGTDY2lXpRenc354hjzYMeH8LzngU/edit?usp=sharing'
const CONSENT_URL = 'https://forms.gle/4hEYhY9E8SzvYNhi6'
const VIDEO_URL = 'https://drive.google.com/file/d/1ELPMxibpd6Fm9m254UIjp1HoSAnNpJHD/preview'

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
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center space-y-8">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight max-w-4xl leading-tight">
            Mediator Toolkit: Build and Test Civic Discourse Mediators
          </h1>
        </div>

        <div className="w-full max-w-xl text-left space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Steps for the Mediator Competition
          </h2>
          <ol className="space-y-5 text-sm text-neutral-300">
          <li className="space-y-3">
            <p>
              <span className="font-semibold text-neutral-100">1.</span>{' '}
              Watch this brief video introducing the competition:
            </p>
            <div className="aspect-video rounded-lg border border-neutral-800 bg-neutral-900/50 overflow-hidden">
              <iframe
                src={VIDEO_URL}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                allowFullScreen
              />
            </div>
          </li>
          <li>
            <span className="font-semibold text-neutral-100">2.</span>{' '}
            <a
              href={INSTRUCTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 text-neutral-200 hover:text-white"
            >
              Read the instructions
            </a>{' '}
            for more details
          </li>
          <li>
            <span className="font-semibold text-neutral-100">3.</span>{' '}
            Complete the{' '}
            <a
              href={CONSENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 text-neutral-200 hover:text-white"
            >
              Consent Form
            </a>
          </li>
          <li className="space-y-3">
            <p>
              <span className="font-semibold text-neutral-100">4.</span>{' '}
              Sign in to start developing your mediator
            </p>
            <div className="flex flex-col items-start gap-3">
              <button
                onClick={handleSignIn}
                className="px-6 py-3 rounded-lg bg-neutral-100 text-neutral-950 text-sm font-semibold hover:bg-white active:scale-[0.98] transition-all duration-150 cursor-pointer"
              >
                Sign in with Google
              </button>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          </li>
          </ol>
        </div>
      </main>

      <footer className="border-t border-neutral-800 px-8 py-5 text-center text-xs text-neutral-600 space-y-1">
        <p>Mediator Toolkit - TrAuSt</p>
        <p>The toolkit builds in part on the ConvoKit and Deliberate Labs open source projects.</p>
      </footer>
    </div>
  )
}
