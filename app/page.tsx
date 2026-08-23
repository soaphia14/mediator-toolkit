import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 "
      />

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center relative">
        <div className="w-full max-w-2xl flex flex-col items-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight">
            TrAuSt Toolkits
          </h1>
          <p className="mt-4 text-base text-neutral-400">
            Choose a toolkit to get started
          </p>

          <div className="mt-10 w-full grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Link
              href="/login/assistant"
              className="group rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm p-8 flex flex-col items-start gap-2 text-left hover:border-neutral-600 hover:bg-neutral-900/70 transition-all duration-150"
            >
              <span className="text-lg font-semibold">Assistant Toolkit</span>
              <span className="text-sm text-neutral-400">
                Build and test conversational assistants
              </span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-neutral-100 group-hover:gap-2 transition-all duration-150">
                Go to Assistant Toolkit
                <span aria-hidden>&rarr;</span>
              </span>
            </Link>

            <Link
              href="/login/mediator"
              className="group rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur-sm p-8 flex flex-col items-start gap-2 text-left hover:border-neutral-600 hover:bg-neutral-900/70 transition-all duration-150"
            >
              <span className="text-lg font-semibold">Mediator Toolkit</span>
              <span className="text-sm text-neutral-400">
                Build and test civic discourse mediators
              </span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-neutral-100 group-hover:gap-2 transition-all duration-150">
                Go to Mediator Toolkit
                <span aria-hidden>&rarr;</span>
              </span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-neutral-800 px-8 py-5 text-center text-xs text-neutral-600 space-y-1 relative">
        <p>TrAuSt Toolkits</p>
        <p>The toolkits build in part on the ConvoKit and Deliberate Labs open source projects.</p>
      </footer>
    </div>
  )
}
