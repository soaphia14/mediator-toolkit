'use client'

import { useState, useEffect } from 'react'

type ActionState = { status: 'idle' | 'loading' | 'done' | 'error'; result: unknown }
const idle: ActionState = { status: 'idle', result: null }

export default function Home() {
  const [experimentData, setExperimentData] = useState<string | null>(null)

  useEffect(() => {
    fetch('/mediator-example.yaml')
      .then(res => res.text())
      .then(setExperimentData)
  }, [])
  const [experimentId, setExperimentId] = useState<string | null>('1686b432-b09a-4d52-956a-3decec0ab813')
  const [exportState, setExportState] = useState<ActionState>(idle)
  const [createState, setCreateState] = useState<ActionState>(idle)

  async function handleExport() {
    setExportState({ status: 'loading', result: null })
    try {
      const res  = await fetch(`/api/export-experiment?experimentId=${encodeURIComponent(experimentId ?? '')}`)
      const data = await res.json()
      setExportState({ status: res.ok ? 'done' : 'error', result: data })
    } catch (e) {
      setExportState({ status: 'error', result: String(e) })
    }
  }

  async function handleCreate() {
    setCreateState({ status: 'loading', result: null })
    try {
      const res = await fetch('/api/create-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediatorTemplate: experimentData }),
      })
      const data = await res.json()
      setCreateState({ status: res.ok ? 'done' : 'error', result: data })
    } catch (e) {
      setCreateState({ status: 'error', result: String(e) })
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="w-full max-w-xl space-y-8">

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mediator Toolkit</h1>
          <p className="text-base text-neutral-500 mt-1">Manage your deliberate lab experiments.</p>
        </div>

        <div>
          Experiment Configuration: <textarea value={experimentData ?? ''} onChange={(e) => setExperimentData(e.target.value)} className="w-full h-96 p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-base text-neutral-200 resize-y" />
        </div>

        <div>
          Experiment ID (for export): <input type="text" value={experimentId ?? ''} onChange={(e) => setExperimentId(e.target.value)} placeholder="Experiment ID" className="w-full p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-base text-neutral-200" />
        </div>
        
        <div className="flex gap-3">
          <ActionButton
            label="Export Experiment"
            loadingLabel="Exporting…"
            loading={exportState.status === 'loading'}
            onClick={handleExport}
          />

          <ActionButton
            label="Create Experiment"
            loadingLabel="Creating…"
            loading={createState.status === 'loading'}
            onClick={handleCreate}
          />
        </div>

        {exportState.result !== null && (
          <ResultBox title="Export" state={exportState} />
        )}

        {createState.result !== null && (
          <ResultBox
            title="Create"
            state={createState}
            links={
              createState.status === 'done' && typeof createState.result === 'object' && createState.result !== null
                ? createState.result as Record<string, string>
                : undefined
            }
          />
        )}
      </div>
    </div>
  )
}

function ActionButton({ label, loadingLabel, loading, onClick }: {
  label: string
  loadingLabel: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-900 text-base font-medium text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
    >
      {loading ? loadingLabel : label}
    </button>
  )
}

function ResultBox({ title, state, links }: {
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
        {links?.experimentLink && (
          <div className="flex flex-col gap-1">
            <a href={links.experimentLink} target="_blank" rel="noreferrer"
               className="text-base text-neutral-300 hover:text-white underline underline-offset-2 transition-colors break-all">
              Experiment ↗
            </a>
            <a href={links.cohortLink} target="_blank" rel="noreferrer"
               className="text-base text-neutral-300 hover:text-white underline underline-offset-2 transition-colors break-all">
              Cohort ↗
            </a>
          </div>
        )}

        <div className="text-sm text-neutral-400 space-y-3">
          <pre className="overflow-auto leading-relaxed whitespace-pre-wrap break-words">
            {JSON.stringify(state.result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
