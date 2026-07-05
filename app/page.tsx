'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-6">
        <h1 className="text-5xl font-semibold tracking-tight max-w-2xl leading-tight">
          Build and test AI mediators
        </h1>
        <p className="text-lg text-neutral-500 max-w-xl">
          Create and test custom mediators through ConvoArena and multi-agent simulations.
        </p>
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/mediator"
            className="px-6 py-3 rounded-lg bg-neutral-100 text-neutral-950 text-sm font-semibold hover:bg-white active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            Open Mediator Toolkit
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800 px-8 py-5 text-center text-xs text-neutral-600">
        Mediator Toolkit - TrAuSt
      </footer>

    </div>
  )
}
