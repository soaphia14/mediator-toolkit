'use client'

export type ActionState = { status: 'idle' | 'loading' | 'done' | 'error'; result: unknown }

export function ActionButton({ label, loadingLabel, loading, disabled, onClick }: {
  label: string
  loadingLabel: string
  loading: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="px-5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-900 text-base font-medium text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? loadingLabel : label}
    </button>
  )
}

export function ResultBox({ title, state, links }: {
  title: string
  state: ActionState
  links?: Record<string, string>
}) {
  const isError = state.status === 'error'

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800">
        <span className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-red-500' : 'bg-emerald-500'}`} />
        <span className="text-sm font-medium text-neutral-400 uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex flex-col gap-1">
          {links?.cohort_urls && (() => {
            const urls = links.cohort_urls as unknown as string[]
            return (
              <>
                {urls.map((url, i) => (
                  <a href={url} target="_blank" rel="noreferrer"
                    className="text-base text-neutral-300 hover:text-white underline underline-offset-2 transition-colors break-all">
                    Cohort {i+1} ↗
                  </a>
                ))}
              </>
            )
          })()}

          {links?.human_urls && (() => {
            const urls = links.human_urls as unknown as Record<string, string>
            return (
              <div className="flex flex-col gap-1">
                {urls.p1 &&
                  <a href={urls.p1} target="_blank" rel="noreferrer"
                    className="text-base text-neutral-300 hover:text-white underline underline-offset-2 transition-colors break-all">
                    Participant 1 ↗
                  </a>
                }
                {urls.p2 &&
                  <a href={urls.p2} target="_blank" rel="noreferrer"
                    className="text-base text-neutral-300 hover:text-white underline underline-offset-2 transition-colors break-all">
                    Participant 2 ↗
                  </a>
                }
              </div>
            )
          })()}    
        </div>
      
        <div className="text-sm text-neutral-400 space-y-3">
          <pre className="overflow-auto leading-relaxed whitespace-pre-wrap break-words">
            {JSON.stringify(state.result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
