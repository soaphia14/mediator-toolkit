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
      className="w-full px-5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-900 text-base font-medium text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? loadingLabel : label}
    </button>
  )
}

type ParticipantLink = {url: string; type: string}
type CohortLinks = { participant_urls?: ParticipantLink[] }

export function ResultBox({ title, state, links }: {
  title: string
  state: ActionState
  links?: { cohorts?: CohortLinks[]; mode?: string }
}) {
  const isError = state.status === 'error'

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-800">
        <span className={`w-1.5 h-1.5 rounded-full ${isError ? 'bg-red-500' : 'bg-emerald-500'}`} />
        <span className="text-sm font-medium text-neutral-400 uppercase tracking-wider">{title} {links?.mode ? `(${links.mode})` : ''}</span>
      </div>
      <div className="p-4 space-y-3">
        {links?.cohorts && links.cohorts.map((cohort, cohortIdx) =>
          cohort.participant_urls && (cohort.participant_urls).map((item, pIdx) => (
            <a
              key={`${cohortIdx}-${pIdx}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-neutral-300 hover:text-white underline underline-offset-2 transition-colors break-all"
            >
              Participant {pIdx + 1} ({item.type}) ↗
            </a>
          ))
        )}
        <details className="text-sm text-neutral-400">
          <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300 transition-colors select-none">Show JSON output</summary>
          <pre className="mt-2 overflow-auto leading-relaxed whitespace-pre-wrap break-words">
            {JSON.stringify(state.result, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
