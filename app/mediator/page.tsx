'use client'

import { useState, useEffect, useMemo } from 'react'
import * as yaml from 'js-yaml'
import { TOPICS } from '../lib/topics'
import { ApiKeyType, API_KEY_TYPE_LABELS, REASONING_LEVEL_OPTIONS } from '../lib/types'
import { StructuredPromptEditor, PromptItemType, type PromptItem, type TextPromptItem } from '../components/StructuredPromptEditor'
import { MediatorSection } from '../components/MediatorSection'
import { ActionButton, ResultBox, type ActionState } from '../components/ExperimentActions'

const idle: ActionState = { status: 'idle', result: null }

const topicMap = (name: string) => name.toLowerCase().replaceAll(' ', '_')

const POLL_INTERVAL_MS = 10_000
const MAX_POLLS = 180 // poll every 10s for 30 minutes

export default function Home() {
  const [mediatorData, setMediatorData] = useState<string | null>(null)
  const [topicId, setTopicId] = useState<number>(Number(Object.keys(TOPICS)[0]))

  useEffect(() => {
    const topic = topicMap(TOPICS[topicId].topic)
    Promise.all([
      fetch('/templates/defaults/mediator.yaml').then(res => res.text()),
      fetch(`/templates/topics/${topic}/mediator.yaml`).then(res => res.text()),
    ]).then(([defaultsText, topicText]) => {
      const merged = { ...(yaml.load(defaultsText) as object), ...(yaml.load(topicText) as object) }
      setMediatorData(JSON.stringify(merged, null, 2))
    })
  }, [topicId])
  const [experimentId, setExperimentId] = useState<string | null>('1686b432-b09a-4d52-956a-3decec0ab813')
  const [exportState, setExportState] = useState<ActionState>(idle)
  const [createState, setCreateState] = useState<ActionState>(idle)
  const [simState, setSimState] = useState<ActionState>(idle)
  const [creating, setCreating] = useState<'human-human' | 'human-agent' | 'agent-agent' | null>(null)
  const [showAsYaml, setShowAsYaml] = useState(true)
  const [activeSection, setActiveSection] = useState(0)
  const sectionTitles = ['Persona', 'Model', 'Generation', 'Chat Settings']
  const busy = creating !== null || exportState.status === 'loading' || simState.status === 'loading'

  const mediatorParsed = useMemo(() => {
    try { return JSON.parse(mediatorData ?? '') } catch { return null }
  }, [mediatorData])

  const shouldRespondPrompt: PromptItem[] = useMemo(() => {
    const text = typeof mediatorParsed?.should_respond_prompt === 'string'
      ? mediatorParsed.should_respond_prompt
      : ''
    return [{ type: PromptItemType.TEXT, text } as TextPromptItem]
  }, [mediatorParsed?.should_respond_prompt])

  const updateShouldRespondPrompt = (prompt: PromptItem[]) => {
    const text = (prompt[0] as TextPromptItem | undefined)?.text ?? ''
    setMediatorData(prev => {
      try {
        const data = JSON.parse(prev ?? '')
        data.should_respond_prompt = text
        return JSON.stringify(data, null, 2)
      } catch { return prev }
    })
  }

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

  function downloadMediator() {
    let text: string
    try { text = yaml.dump(JSON.parse(mediatorData ?? '')) } catch { text = mediatorData ?? '' }
    const url = URL.createObjectURL(new Blob([text], { type: 'text/yaml' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'mediator.yaml'
    a.click()
    URL.revokeObjectURL(url)
  }

  function loadMediatorFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try { setMediatorData(JSON.stringify(yaml.load(String(reader.result)), null, 2)) } catch { /* ignore invalid yaml */ }
    }
    reader.readAsText(file)
  }

  async function handleCreate(mode: 'human-human' | 'human-agent' | 'agent-agent') {
    setCreating(mode)
    setCreateState({ status: 'loading', result: null })
    try {
      const res = await fetch('/api/create-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediatorTemplate: mediatorData, mode, topic: topicMap(TOPICS[topicId].topic) }),
      })
      const data = await res.json()
      setCreateState({ status: res.ok ? 'done' : 'error', result: data })
      return res.ok ? data : null
    } catch (e) {
      setCreateState({ status: 'error', result: String(e) })
      return null
    } finally {
      setCreating(null)
    }
  }

  // sent to simulation + polling its status
  async function handleCreateSim() {
    const data = await handleCreate('agent-agent')
    const experimentId: string | undefined = data?.experiment_id
    if (!data?.is_sim || !experimentId) return

    setSimState({ status: 'loading', result: { message: 'Simulation running — waiting for agents to finish' } })
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      try {
        const res = await fetch(`/api/simulation-status?experimentId=${encodeURIComponent(experimentId)}`)
        const status = await res.json()
        if (!res.ok) { setSimState({ status: 'error', result: status }); return }
        if (status.completed) { setSimState({ status: 'done', result: status.export }); return }
        setSimState({ status: 'loading', result: { message: 'Simulation running', statuses: status.statuses } })
      } catch (e) {
        setSimState({ status: 'error', result: String(e) }); return
      }
    }
    setSimState({ status: 'error', result: 'Timed out waiting for the simulation to complete.' })
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden bg-neutral-950 text-neutral-100">

      {/* Left column — configuration */}
      <div className="lg:flex-1 lg:overflow-y-auto p-8">
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
                onChange={e => setTopicId(Number(e.target.value))}
                className="ml-3 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500 cursor-pointer"
              >
                {Object.values(TOPICS).map(t => (
                  <option key={t.id} value={t.id}>{t.topic}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Mediator configuration */}
          <div className="space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-lg font-semibold tracking-tight">Mediator Configuration</h2>
            </div>

            {/* Section tabs */}
            <p className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Mediator Settings</p>
            <div className="flex gap-0.5 rounded-lg bg-neutral-900 p-1 border border-neutral-800">
              {sectionTitles.map((title, i) => (
                <button
                  key={title}
                  onClick={() => setActiveSection(i)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    activeSection === i
                      ? 'bg-neutral-700 text-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {title}
                </button>
              ))}
            </div>

            {activeSection === 0 && (
              <MediatorSection
                title="Persona"
                mediatorParsed={mediatorParsed}
                onUpdate={updateMediatorField}
                fields={[
                  { label: 'Name', path: ['persona', 'name'], type: 'text' },
                  { label: 'Avatar', path: ['persona', 'avatar'], type: 'emoji' },
                ]}
              />
            )}
            {activeSection === 1 && (
              <MediatorSection
                title="Model"
                mediatorParsed={mediatorParsed}
                onUpdate={updateMediatorField}
                fields={[
                  { label: 'API Type', path: ['model', 'apiType'], type: 'select', options: Object.values(ApiKeyType).map(t => ({ value: t, label: API_KEY_TYPE_LABELS[t] })) },
                  { label: 'Model Name', path: ['model', 'modelName'], type: 'text' },
                ]}
              />
            )}
            {activeSection === 2 && (
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
            )}
            {activeSection === 3 && (
              <MediatorSection
                title="Chat Settings"
                mediatorParsed={mediatorParsed}
                onUpdate={updateMediatorField}
                fields={[
                  { label: 'Words Per Minute', path: ['chat_settings', 'words_per_minute'], type: 'number', min: 1, max: 2000, step: 1 },
                  { label: 'Min User Messages Before Responding', path: ['min_participant_messages_before_responding'], type: 'number', min: 0, max: 20, step: 1 },
                  { label: 'Context', path: ['context'], type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'current', label: 'Current' }] },
                  { label: 'Initial Message', path: ['chat_settings', 'initial_message'], type: 'text' },
                  { label: 'Can Self Trigger Calls', path: ['chat_settings', 'can_self_trigger_calls'], type: 'checkbox' },
                ]}
              />
            )}

            <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-neutral-400">Prompt Editors</p>
            <StructuredPromptEditor
              label="Response Editor"
              prompt={(mediatorParsed?.prompt as PromptItem[]) ?? []}
              stageId=""
              onUpdate={updateMediatorPrompt}
            />
            <StructuredPromptEditor
              label="Should Respond Editor"
              prompt={shouldRespondPrompt}
              onUpdate={updateShouldRespondPrompt}
              locked
            />
          </div>

        </div>
      </div>

      {/* Right column — preview & actions */}
      <div className="lg:flex-1 lg:overflow-y-auto p-8 space-y-6 border-t border-neutral-800 lg:border-t-0 lg:border-l">
        
        {/* YAML preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={showAsYaml}
                onChange={e => setShowAsYaml(e.target.checked)}
                className="accent-neutral-400"
              />
              <span className="text-sm text-neutral-400">Show as YAML</span>
            </label>
            <button
              onClick={downloadMediator}
              className="text-sm px-3 py-1 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 cursor-pointer"
            >
              Download
            </button>
            <label className="text-sm px-3 py-1 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 cursor-pointer">
              Upload
              <input
                type="file"
                accept=".yaml,.yml"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadMediatorFile(f); e.target.value = '' }}
              />
            </label>
          </div>
          <textarea
            disabled
            value={showAsYaml
              ? (() => { try { return yaml.dump(JSON.parse(mediatorData ?? '')) } catch { return mediatorData ?? '' } })()
              : mediatorData ?? ''}
            className="w-full h-96 p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-200 resize-y font-mono"
          />
        </div>
        
        {/* Actions: create buttons, then experiment id + export */}
        <div className="space-y-3">
          {/* 3 create buttons on one row */}
          <div className="flex flex-wrap gap-3">
            <ActionButton
              label="Create (human-human)"
              loadingLabel="Creating…"
              loading={creating === 'human-human'}
              disabled={busy}
              onClick={() => handleCreate('human-human')}
            />
            <ActionButton
              label="Create (human-agent)"
              loadingLabel="Creating…"
              loading={creating === 'human-agent'}
              disabled={busy}
              onClick={() => handleCreate('human-agent')}
            />
            <ActionButton
              label="Create (agent-agent)"
              loadingLabel="Simulating…"
              loading={creating === 'agent-agent' || simState.status === 'loading'}
              disabled={busy}
              onClick={handleCreateSim}
            />
          </div>

          {/* Experiment ID + Export, below the create buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-400">Experiment ID (for export)</label>
            <input
              type="text"
              value={experimentId ?? ''}
              onChange={e => setExperimentId(e.target.value)}
              placeholder="Experiment ID"
              className="w-full p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-200"
            />
            <ActionButton
              label="Export Experiment"
              loadingLabel="Exporting…"
              loading={exportState.status === 'loading'}
              disabled={busy}
              onClick={handleExport}
            />
          </div>
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

        {simState.result !== null && (
          <ResultBox title="Simulation" state={simState} />
        )}

      </div>
    </div>
  )
}
