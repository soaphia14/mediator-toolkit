'use client'

import { useState, useEffect, useMemo } from 'react'
import * as yaml from 'js-yaml'
import { TOPICS } from './lib/topics'
import { ApiKeyType, API_KEY_TYPE_LABELS, REASONING_LEVEL_OPTIONS } from './lib/types'
import { StructuredPromptEditor, type PromptItem } from './components/StructuredPromptEditor'
import { MediatorSection } from './components/MediatorSection'
import { ActionButton, ResultBox, type ActionState } from './components/ExperimentActions'

const idle: ActionState = { status: 'idle', result: null }

export default function Home() {
  const [mediatorData, setMediatorData] = useState<string | null>(null)

  useEffect(() => {
    fetch('/mediator-example.yaml')
      .then(res => res.text())
      .then(text => {
        const parsed = yaml.load(text)
        setMediatorData(JSON.stringify(parsed, null, 2))
      })
  }, [])

  const [topicId, setTopicId] = useState<number>(Object.keys(TOPICS)[0] as unknown as number)
  const [experimentId, setExperimentId] = useState<string | null>('1686b432-b09a-4d52-956a-3decec0ab813')
  const [exportState, setExportState] = useState<ActionState>(idle)
  const [createState, setCreateState] = useState<ActionState>(idle)
  const [creating, setCreating] = useState<'human-human' | 'human-agent' | null>(null)
  const [showAsYaml, setShowAsYaml] = useState(true)
  const busy = creating !== null || exportState.status === 'loading'

  const mediatorParsed = useMemo(() => {
    try { return JSON.parse(mediatorData ?? '') } catch { return null }
  }, [mediatorData])

  const updateMediatorPrompt = (prompt: PromptItem[]) => {
    const reindexed = prompt.map((item, i) => ({ ...item, id: i }))
    setMediatorData(prev => {
      try {
        const data = JSON.parse(prev ?? '')
        data.prompt = reindexed
        return JSON.stringify(data, null, 2)
      } catch { return prev }
    })
  }

  const updateMediatorField = (path: string[], value: string | boolean | number) => {
    setMediatorData(prev => {
      try {
        const data = JSON.parse(prev ?? '')
        let obj = data
        for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]]
        obj[path[path.length - 1]] = value
        return JSON.stringify(data, null, 2)
      } catch { return prev }
    })
  }

  async function handleExport() {
    setExportState({ status: 'loading', result: null })
    try {
      const res = await fetch(`/api/export-experiment?experimentId=${encodeURIComponent(experimentId ?? '')}`)
      const data = await res.json()
      setExportState({ status: res.ok ? 'done' : 'error', result: data })
    } catch (e) {
      setExportState({ status: 'error', result: String(e) })
    }
  }

  async function handleCreate(hasAgent: boolean) {
    setCreating(hasAgent ? 'human-agent' : 'human-human')
    setCreateState({ status: 'loading', result: null })
    try {
      const res = await fetch('/api/create-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediatorTemplate: mediatorData, hasAgent }),
      })
      const data = await res.json()
      setCreateState({ status: res.ok ? 'done' : 'error', result: data })
    } catch (e) {
      setCreateState({ status: 'error', result: String(e) })
    } finally {
      setCreating(null)
    }
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden bg-neutral-950 text-neutral-100">

      {/* Left column — configuration */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="w-full max-w-xl space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Mediator Toolkit</h1>
            <p className="text-base text-neutral-500 mt-1">Create, audit, and test custom mediators.</p>
          </div>

          {/* Experiment configuration */}
          <div className="space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-lg font-semibold tracking-tight">Experiment Configuration</h2>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-400">Topic</label>
              <select
                value={topicId}
                onChange={e => {
                  const id = Number(e.target.value)
                  setTopicId(id)
                  setMediatorData(prev => {
                    try {
                      const data = JSON.parse(prev ?? '')
                      data.topic = TOPICS[id].topic
                      return JSON.stringify(data, null, 2)
                    } catch { return prev }
                  })
                }}
                className="ml-3 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500 cursor-pointer"
              >
                {Object.values(TOPICS).map(t => (
                  <option key={t.id} value={t.id}>{t.topic}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Mediator configuration */}
          <div className="space-y-6">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-lg font-semibold tracking-tight">Mediator Configuration</h2>
            </div>
            <MediatorSection
              title="Persona"
              mediatorParsed={mediatorParsed}
              onUpdate={updateMediatorField}
              fields={[
                { label: 'Name', path: ['persona', 'name'], type: 'text' },
                { label: 'Avatar', path: ['persona', 'avatar'], type: 'emoji' },
              ]}
            />
            <MediatorSection
              title="Model"
              mediatorParsed={mediatorParsed}
              onUpdate={updateMediatorField}
              fields={[
                { label: 'API Type', path: ['model', 'apiType'], type: 'select', options: Object.values(ApiKeyType).map(t => ({ value: t, label: API_KEY_TYPE_LABELS[t] })) },
                { label: 'Model Name', path: ['model', 'modelName'], type: 'text' },
              ]}
            />
            <MediatorSection
              title="Generation"
              mediatorParsed={mediatorParsed}
              onUpdate={updateMediatorField}
              fields={[
                { label: 'Temperature', path: ['generation', 'temperature'], type: 'number', min: 0, max: 2, step: 0.1 },
                { label: 'Reasoning Level', path: ['generation', 'reasoning_level'], type: 'select', options: REASONING_LEVEL_OPTIONS },
                { label: 'Include Reasoning', path: ['generation', 'include_reasoning'], type: 'checkbox' },
              ]}
            />
            <MediatorSection
              title="Chat Settings"
              mediatorParsed={mediatorParsed}
              onUpdate={updateMediatorField}
              fields={[
                { label: 'Words Per Minute', path: ['chat_settings', 'words_per_minute'], type: 'number', min: 1, max: 2000, step: 1 },
                { label: 'Min User Messages Before Responding', path: ['min_participant_messages_before_responding'], type: 'number', min: 0, max: 20, step: 1 },
                { label: 'Context', path: ['context'], type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'current', label: 'Current' }] },
                { label: 'Can Self Trigger Calls', path: ['chat_settings', 'can_self_trigger_calls'], type: 'checkbox' },
              ]}
            />
            <StructuredPromptEditor
              label="Response Editor"
              prompt={(mediatorParsed?.prompt as PromptItem[]) ?? []}
              stageId=""
              onUpdate={updateMediatorPrompt}
            />
          </div>

        </div>
      </div>

      {/* Right column — preview & actions */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 border-t border-neutral-800 lg:border-t-0 lg:border-l">
        
        {/* YAML preview */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={showAsYaml}
              onChange={e => setShowAsYaml(e.target.checked)}
              className="accent-neutral-400"
            />
            <span className="text-sm text-neutral-400">Show as YAML</span>
          </label>
          <textarea
            disabled
            value={showAsYaml
              ? (() => { try { return yaml.dump(JSON.parse(mediatorData ?? '')) } catch { return mediatorData ?? '' } })()
              : mediatorData ?? ''}
            className="w-full h-96 p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-200 resize-y font-mono"
          />
        </div>
        
        {/* Experiment ID input */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-400">Experiment ID (for export)</label>
          <input
            type="text"
            value={experimentId ?? ''}
            onChange={e => setExperimentId(e.target.value)}
            placeholder="Experiment ID"
            className="w-full p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-200"
          />
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <ActionButton
            label="Export Experiment"
            loadingLabel="Exporting…"
            loading={exportState.status === 'loading'}
            disabled={busy}
            onClick={handleExport}
          />
          <ActionButton
            label="Create (human-human)"
            loadingLabel="Creating…"
            loading={creating === 'human-human'}
            disabled={busy}
            onClick={() => handleCreate(false)}
          />
          <ActionButton
            label="Create (human-agent)"
            loadingLabel="Creating…"
            loading={creating === 'human-agent'}
            disabled={busy}
            onClick={() => handleCreate(true)}
          />
        </div>
        
        {/* Action results */}
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
