'use client'

import { useState, useEffect, useMemo } from 'react'
import * as yaml from 'js-yaml'
import { TOPICS } from '../lib/topics'
import { ApiKeyType, API_KEY_TYPE_LABELS, REASONING_LEVEL_OPTIONS } from '../lib/types'
import { StructuredPromptEditor, PromptItemType, type PromptItem, type TextPromptItem } from '../components/StructuredPromptEditor'
import { MediatorSection } from '../components/MediatorSection'
import { ActionButton, ResultBox, type ActionState } from '../components/ExperimentActions'
import { create } from 'domain'
import { StructuredOutputSchema, type StructuredOutputConfig } from '../components/StructuredOutputSchema'

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
      fetch(`/templates/competition/mediator.yaml`).then(res => res.text()),
    ]).then(([defaultsText, topicText]) => {
      const merged = { ...(yaml.load(defaultsText) as object), ...(yaml.load(topicText) as object) }
      setMediatorData(JSON.stringify(merged, null, 2))
    })
  }, [topicId])
  const [experimentId, setExperimentId] = useState<string | null>('')
  const [exportState, setExportState] = useState<ActionState>(idle)
  const [createState, setCreateState] = useState<ActionState>(idle)
  const [simState, setSimState] = useState<ActionState>(idle)
  const [createAction, setCreateAction] = useState<'create' | 'simulate' | null>(null)
  const [simExport, setSimExport] = useState<unknown>(null)
  const [convokitLoading, setConvokitLoading] = useState(false)
  const [creating, setCreating] = useState<'human-human' | 'human-agent' | 'agent-agent' | null>(null)
  const [numCohorts, setNumCohorts] = useState('5')
  const [numUtterances, setNumUtterances] = useState('15')
  const [showAsYaml, setShowAsYaml] = useState(false)
  const [activePromptTab, setActivePromptTab] = useState<'response' | 'should-respond'>('response')
  // const [structuredOutputConfig, setStructuredOutputConfig] = useState<StructuredOutputConfig>({
  //   schema: {
  //     type: 'OBJECT',
  //     properties: [
  //       { name: 'message', schema: { type: 'STRING', description: 'Your chat message.' } },
  //       { name: 'reasoning', schema: { type: 'STRING', description: '1-2 sentences explaining your message.' } },
  //       { name: 'readyToEndChat', schema: { type: 'BOOLEAN', description: 'Whether you are ready to end the conversation.' } },
  //     ],
  //   },
  //   messageField: 'message',
  //   explanationField: 'reasoning',
  //   descriptionOnly: true
  // })
  const busy = creating !== null || exportState.status === 'loading' || simState.status === 'loading'

  const mediatorParsed = useMemo(() => {
    try { return JSON.parse(mediatorData ?? '') } catch { return null }
  }, [mediatorData])

  const updateShouldRespondPrompt = (prompt: PromptItem[]) => {
    const reindexed = prompt.map((item, i) => ({ ...item, id: i }))
    setMediatorData(prev => {
      try {
        const data = JSON.parse(prev ?? '')
        data.should_respond_prompt = reindexed
        return JSON.stringify(data, null, 2)
      } catch { return prev }
    })
  }

  const structuredOutputConfig: StructuredOutputConfig = useMemo(() => {
    const structuredOutput = mediatorParsed?.structured_output
    const properties = Object.entries(structuredOutput?.schema ?? {}).map(([name, field]: [string, any]) => ({
      name,
      schema: { type: field.type, description: field.description },
    }))
    return {
      schema: {
        type: 'OBJECT',
        properties,
      },
      messageField: structuredOutput?.message_field ?? '',
      explanationField: structuredOutput?.explanation_field ?? '',
      descriptionOnly: true,
    }
  }, [mediatorParsed?.structured_output])

  const updateStructuredOutputConfig = (config: StructuredOutputConfig) => {
    const schema: Record<string, { type: string; description: string }> = {}
    for (const p of config.schema?.properties ?? []) {
      schema[p.name] = { type: p.schema.type, description: p.schema.description }
    }
    setMediatorData(prev => {
      try {
        const data = JSON.parse(prev ?? '')
        data.structured_output = {
          ...(data.structured_output ?? {}),   // keep enabled, append_to_prompt, should_respond_field, ready_to_end_field
          message_field: config.messageField,
          explanation_field: config.explanationField,
          schema,
        }
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

  function downloadJson(data: unknown, filename: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadConvokit() {
    if (simExport === null) return
    setConvokitLoading(true)
    try {
      const res = await fetch('/api/convokit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simExport),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`ConvoKit conversion failed: ${err.error ?? res.statusText}`)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `convokit-${(simExport as { experiment?: { id?: string } })?.experiment?.id ?? 'export'}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(`ConvoKit conversion error: ${String(e)}`)
    } finally {
      setConvokitLoading(false)
    }
  }

  function loadMediatorFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try { setMediatorData(JSON.stringify(yaml.load(String(reader.result)), null, 2)) } catch { /* ignore invalid yaml */ }
    }
    reader.readAsText(file)
  }

  async function handleCreate(mode: 'human-human' | 'human-agent' | 'agent-agent', action: 'create' | 'simulate' = 'create') {
    setSimState(idle)
    setCreating(mode)
    // setCreateState({ status: 'loading', result: null })
    setCreateAction(action)
    try {
      const res = await fetch('/api/create-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediatorTemplate: mediatorData, mode, topic: topicMap(TOPICS[topicId].topic), numCohorts, numUtterances, action }),
      })
      const data = await res.json()
      setCreateState({ status: res.ok ? 'done' : 'error', result: data })
      return res.ok ? data : null
    } catch (e) {
      setCreateState({ status: 'error', result: String(e) })
      return null
    } finally {
      setCreating(null)
      setCreateAction(null)
    }
  }

  // sent to simulation + polling its status
  async function handleCreateSim() {
    const data = await handleCreate('agent-agent', 'simulate')
    const experimentId: string | undefined = data?.experiment_id
    if (!experimentId) return

    setSimExport(null)
    setSimState({ status: 'loading', result: { message: 'Simulation running — waiting for agents to finish' } })
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      try {
        const res = await fetch(`/api/simulation-status?experimentId=${encodeURIComponent(experimentId)}`)
        const status = await res.json()
        if (!res.ok) { setSimState({ status: 'error', result: status }); return }
        
        // count completed cohorts / total cohorts
        let completedSim = 0
        for (const cohortStatuses of Object.values(status.statuses ?? {}) as string[][]) {
          if (cohortStatuses.length > 0 && cohortStatuses.every((s) => s === 'SUCCESS')) completedSim++
        }
        const totalSim = Object.keys(status.statuses ?? {}).length
        
        if (status.completed) {
          setSimExport(status.export)
          setSimState({ status: 'done', result: { message: `Simulation complete (experiment_id: ${experimentId})` } })
          return
        }
        setSimState({ status: 'loading', result: { message: `Simulation running: ${completedSim}/${totalSim} cohorts finished` } })
      } catch (e) {
        setSimState({ status: 'error', result: String(e) }); return
      }
    }
    setSimState({ status: 'error', result: 'Timed out waiting for the simulation to complete.' })
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden bg-neutral-950 text-neutral-100">

      {/* Left column — configuration */}
      <div className="lg:flex-3 lg:overflow-y-auto p-8">
        <div className="w-full space-y-5">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Mediator Toolkit</h1>
            <p className="text-base text-neutral-500 mt-1">Create, audit, and test custom mediators.</p>
          </div>
          
          {/* Mediator configuration and prompt editors */}
          <div className="space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-lg font-semibold tracking-tight">Mediator Configuration</h2>
            </div>

            <MediatorSection
              title="Chat Settings"
              mediatorParsed={mediatorParsed}
              onUpdate={updateMediatorField}
              fields={[
                { label: 'Typing Speed (Words Per Minute)', description: "Mediator typing speed. Set to zero for instant messages.", path: ['chat_settings', 'words_per_minute'], type: 'number', min: 1, max: 2000, step: 1 },
                { label: 'Min User Messages Before Responding', description: "After the mediator has sent its first message, this many participant messages must be sent before the mediator is allowed to respond again. Before the mediator's first message, it may respond freely.", path: ['min_participant_messages_before_responding'], type: 'number', min: 0, max: 20, step: 1 },
                { label: 'Temperature', description: "Control the randomness of the model. 0 = deterministic, 1 = unpredictable.", path: ['generation', 'temperature'], type: 'number', min: 0, max: 2, step: 0.1 },
                { label: 'Initial Message', description: "Message sent automatically when the conversation begins.", path: ['chat_settings', 'initial_message'], type: 'text', placeholder: "Hello! I'm here to help with..." },
              ]}
            />

            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-lg font-semibold tracking-tight">Prompt Editors</h2>
            </div>
            <p className="text-sm text-neutral-500">Edit the prompts to optimize the mediator's response. The <span className="text-neutral-400">Response Editor</span> controls what the mediator says; the <span className="text-neutral-400">Should Respond</span> editor prompts the LLM to return true/false on whether it should reply. <a href="https://www.promptingguide.ai/" className="underline hover:text-neutral-300">Learn more about prompt engineering.</a></p>
            
            <div className="rounded-lg border border-neutral-800 overflow-hidden">
              <div className="flex border-b border-neutral-800 bg-neutral-900/60">
                {(['response', 'should-respond'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActivePromptTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${activePromptTab === tab ? 'text-neutral-100 border-b-2 border-neutral-400 -mb-px' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    {tab === 'response' ? 'Response Editor' : 'Should Respond Editor'}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {activePromptTab === 'response' ? (
                  <div className="space-y-4">
                    <MediatorSection
                      title="Response Settings"
                      mediatorParsed={mediatorParsed}
                      onUpdate={updateMediatorField}
                      fields={[
                        { label: 'Context', description: "When the \"Context\" block is included in the prompt editor, it determines what experiment information is injected into the prompt. 'Current' includes only the active group chat; 'All' also includes participant responses from prior stages (e.g. pre-survey).", path: ['context'], type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'current', label: 'Current' }] },
                      ]}
                    />
                    <StructuredPromptEditor
                      label="Response Editor"
                      prompt={(mediatorParsed?.prompt as PromptItem[]) ?? []}
                      stageId=""
                      onUpdate={updateMediatorPrompt}
                    />
                    <StructuredOutputSchema
                      config={structuredOutputConfig}
                      onUpdate={updateStructuredOutputConfig}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <MediatorSection
                      title="ShouldRespond Settings"
                      mediatorParsed={mediatorParsed}
                      onUpdate={updateMediatorField}
                      fields={[
                        { label: 'Context', description: "When the \"Context\" block is included in the prompt editor, it determines what experiment information is injected into the prompt. 'Current' includes only the active group chat; 'All' also includes participant responses from prior stages (e.g. pre-survey).", path: ['should_respond_context'], type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'current', label: 'Current' }] },
                      ]}
                    />
                    <StructuredPromptEditor
                      label="Should Respond Editor"
                      prompt={(mediatorParsed?.should_respond_prompt as PromptItem[]) ?? []}
                      stageId=""
                      onUpdate={updateShouldRespondPrompt}
                    />
               
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right column — preview & actions */}
      <div className="lg:flex-1 lg:overflow-y-auto p-8 space-y-6 border-t border-neutral-800 lg:border-t-0 lg:border-l">
        {/* YAML preview */}
        <div className="space-y-1">
          <div className="border-b border-neutral-800 pb-3 mb-3">
            <h2 className="text-lg font-semibold tracking-tight">Template Configuration</h2>
          </div>
          <div className="space-y-2 gap-2">
            <button
              onClick={downloadMediator}
              className="w-full flex items-center justify-center gap-2 text-md px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-150 cursor-pointer"
            >
              Download Mediator Template (.yaml)
            </button>
            <label className="w-full flex items-center justify-center gap-2 text-md px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-150 cursor-pointer">
              Upload Mediator Template (.yaml)
              <input
                type="file"
                accept=".yaml,.yml"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadMediatorFile(f); e.target.value = '' }}
              />
            </label>
          </div>
          <button
            onClick={() => setShowAsYaml(v => !v)}
            className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {showAsYaml ? '▾ Hide YAML' : '▸ Show YAML'}
          </button>
          {showAsYaml && (
            <textarea
              disabled
              value={(() => { try { return yaml.dump(JSON.parse(mediatorData ?? '')) } catch { return mediatorData ?? '' } })()}
              className="w-full h-96 p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-200 resize-y font-mono"
            />
          )}
        </div>
        
        {/* Actions: create buttons, then experiment id + export */}
        <div className="space-y-3">
          <div className="border-b border-neutral-800 pb-3 mb-3">
            <h2 className="text-lg font-semibold tracking-tight">Mediator Testing</h2>
          </div>
          {/* create buttons on one row */}
          <div className="space-y-3">
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
              loadingLabel="Creating…"
              loading={creating === 'agent-agent' && createAction === 'create'}
              disabled={busy}
              onClick={() => handleCreate('agent-agent', 'create')}
            />
          </div>

          {/* Action results */}
          {createState.result !== null && (
            <ResultBox
              title="Create"
              state={createState}
              links={
                createState.status === 'done' && typeof createState.result === 'object' && createState.result !== null
                  ? createState.result
                  : undefined
              }
            />
          )}

          <div className="border-b border-neutral-800 pb-3 mb-3 mt-6">
            <h2 className="text-lg font-semibold tracking-tight">Mediator Simulation</h2>
          </div>

          {/* agent-agent (simulation) on its own row, with cohort count */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <input
                type="text"
                value={numCohorts}
                onChange={e => {
                  const v = e.target.value
                  if (v === '') return setNumCohorts('')
                  const n = Math.floor(Number(v))
                  if (Number.isFinite(n)) setNumCohorts(String(Math.min(100, Math.max(1, n))))
                }}
                disabled={busy}
                className="w-16 p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-200"
              /> <label className="text-sm text-neutral-400">Cohorts (1-100)</label>            
            </div>
            <div>
              <input
                type="number"
                min={1}
                max={20}
                value={numUtterances}
                onChange={e => {
                  const v = e.target.value
                  if (v === '') return setNumUtterances('')
                  const n = Math.floor(Number(v))
                  if (Number.isFinite(n)) setNumUtterances(String(Math.min(20, Math.max(1, n))))
                }}
                disabled={busy}
                className="w-16 p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-200"
              /> <label className="text-sm text-neutral-400">Utterances (1-20)</label>
            </div>
            <ActionButton
              label="Simulate"
              loadingLabel="Simulating…"
              loading={(creating === 'agent-agent' && createAction === 'simulate') || simState.status === 'loading'}
              disabled={busy}
              onClick={handleCreateSim}
            />
          </div>
        </div>

        {simState.result !== null && (
          <ResultBox title="Simulation" state={simState} />
        )}

        {simState.status === 'done' && simExport !== null && (
          <div className="flex flex-wrap gap-3">
            <ActionButton
              label="Download simulation export (JSON)"
              loadingLabel="…"
              loading={false}
              onClick={() => downloadJson(simExport, `simulation-${(simExport as { experiment?: { id?: string } })?.experiment?.id ?? 'export'}.json`)}
            />
            <ActionButton
              label="Download ConvoKit corpus (zip)"
              loadingLabel="Converting…"
              loading={convokitLoading}
              onClick={downloadConvokit}
            />
          </div>
        )}

      </div>
    </div>
  )
}
