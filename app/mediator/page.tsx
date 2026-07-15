'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import * as yaml from 'js-yaml'
import { TOPICS } from '../lib/topics'
import { ApiKeyType, API_KEY_TYPE_LABELS, REASONING_LEVEL_OPTIONS } from '../lib/types'
import { StructuredPromptEditor, PromptItemType, type PromptItem, type TextPromptItem } from '../components/StructuredPromptEditor'
import { MediatorSection } from '../components/MediatorSection'
import { ActionButton, ResultBox, type ActionState } from '../components/ExperimentActions'
import { create } from 'domain'
import { StructuredOutputSchema, type StructuredOutputConfig } from '../components/StructuredOutputSchema'
import { startTour } from '../lib/tour'

const idle: ActionState = { status: 'idle', result: null }

function PromptEditorDescription({ description }: { description?: string }) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2.5 text-sm text-neutral-500 space-y-1.5">
      <p className="font-medium text-neutral-400">Prompt Purpose</p>
      {description}
    </div>
  )
}


function PromptBlockLegend({ textOnly }: { textOnly?: boolean }) {
  const legend = (bg: string, label: string) => (
    <span className={`inline-block rounded ${bg} px-1.5 py-0.5 text-neutral-900 font-medium whitespace-nowrap justify-self-start`}>{label}</span>
  )
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2.5 text-sm text-neutral-500 space-y-1.5">
      <p className="font-medium text-neutral-400">Available prompt blocks</p>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 items-baseline">
        <span className="font-medium text-neutral-300">Freeform Text</span>
        <span>{textOnly ? 'instructions for gathering information about the topic, participants, or anything else before each discussion' : 'custom instructions you write directly'}</span>
        {legend('bg-[#fde8c8]', 'Topic')}
        <span>replaced with the experiment topic at runtime</span>
        {legend('bg-[#dce1fd]', 'Pre-conversation Context')}
        <span>participant responses from all stages before the discussion</span>
        {!textOnly && <>
          {legend('bg-[#dce1fd]', 'Conversation Context')}
          <span>the current discussion transcript</span>
          {legend('bg-[#f9d8f5]', 'Profile Info')}
          <span>the mediator's profile data</span>
          {legend('bg-[#d8f9e0]', 'Initialization Result')}
          <span>the output of the initialization prompt</span>
        </>}
      </div>
    </div>
  )
}

const topicMap = (name: string) => name.toLowerCase().replaceAll(' ', '_')

const POLL_INTERVAL_MS = 10_000
const MAX_POLLS = 180 // poll every 10s for 30 minutes

export default function Home() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [simQuota, setSimQuota] = useState<{ used: number; limit: number } | null>(null)

  // saving
  const [savedTemplates, setSavedTemplates] = useState<{ id: string; name: string }[]>([])
  const [templateName, setTemplateName] = useState('Mediator Template 1')
  const [lastSavedContent, setLastSavedContent] = useState<string | null>(null)
  const [lastSavedName, setLastSavedName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function fetchSavedTemplates() {
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return
      const res = await fetch('/api/mediators', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const data = await res.json()
      setSavedTemplates(data.templates)
      if (data.count > 0) {
        const first = data.templates[0]
        const loadRes = await fetch(`/api/mediators/load?id=${encodeURIComponent(first.id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (loadRes.ok) {
          const loaded = await loadRes.json()
          setMediatorData(loaded.content)
          setTemplateName(loaded.name)
          setLastSavedContent(loaded.content)
          setLastSavedName(loaded.name)
        }
      } else {
        setTemplateName('Mediator Template 1')
      }
    } catch (e) {
      console.warn('fetchSavedTemplates failed:', e)
    }
  }

  async function handleSave() {
    if (!templateName.trim()) return
    const token = await auth.currentUser?.getIdToken()
    if (!token) return

    setSaving(true)
    try {
      const res = await fetch('/api/mediators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: templateName.trim(), content: mediatorData }),
      })
      if (res.ok) {
        setLastSavedContent(mediatorData)
        setLastSavedName(templateName.trim())
        await fetchSavedTemplates()
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleLoad(id: string, name: string) {
    if (isDirty) {
      const ok = window.confirm('You have unsaved changes. Load a different template and discard them?')
      if (!ok) return
    }
    const token = await auth.currentUser?.getIdToken()
    if (!token) return
    const res = await fetch(`/api/mediators/load?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    setMediatorData(data.content)
    setTemplateName(data.name)
    setLastSavedContent(data.content)
    setLastSavedName(data.name)
  }

  async function fetchQuota() {
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return
      const res = await fetch('/api/quota', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const data = await res.json()
      setSimQuota({ used: data.used, limit: data.limit })
    } catch (e) {
      console.warn('fetchQuota failed:', e)
    }
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/')
      } else {
        setAuthReady(true)
        setUserEmail(user.email)
        fetchQuota()
        fetchSavedTemplates()
      }
    })
  }, [router])

  const [mediatorData, setMediatorData] = useState<string | null>(null)
  const isDirty = mediatorData !== null && (mediatorData !== lastSavedContent || templateName !== lastSavedName)
  const [topicId, setTopicId] = useState<number>(Number(Object.keys(TOPICS)[0]))

  async function loadDefaultTemplate() {
    const [defaultsText, topicText] = await Promise.all([
      fetch('/templates/defaults/mediator.yaml').then(res => res.text()),
      fetch('/templates/competition/mediator.yaml').then(res => res.text()),
    ])
    const merged = { ...(yaml.load(defaultsText) as object), ...(yaml.load(topicText) as object) }
    setMediatorData(JSON.stringify(merged, null, 2))
    setLastSavedContent(null)
    setLastSavedName(null)
  }

  useEffect(() => {
    loadDefaultTemplate()
  }, [topicId])
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  useEffect(() => {
    if (authReady && !localStorage.getItem('tourLoaded')) {
      localStorage.setItem('tourLoaded', '1')
      startTour()
    }
  }, [authReady])

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
  const [activePromptTab, setActivePromptTab] = useState<'response' | 'should-respond' | 'preload'>('response')
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

  const updatePreloadContextPrompt = (prompt: PromptItem[]) => {
    const reindexed = prompt.map((item, i) => ({ ...item, id: i }))
    setMediatorData(prev => {
      try {
        const data = JSON.parse(prev ?? '')
        data.preload_context_prompt = reindexed
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
    setCreateAction(action)
    try {
      let idToken: string | undefined
      if (action === 'simulate') {
        idToken = await auth.currentUser?.getIdToken()
      }
      const res = await fetch('/api/create-experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediatorTemplate: mediatorData, mode, topic: topicMap(TOPICS[topicId].topic), numCohorts, numUtterances, action, idToken }),
      })
      const data = await res.json()
      setCreateState({ status: res.ok ? 'done' : 'error', result: data })
      if (res.ok && action === 'simulate') fetchQuota()
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

  if (!authReady) return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-neutral-500 text-sm">
      Loading...
    </div>
  )


  return (
    <div className="flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden bg-neutral-950 text-neutral-100">

      {/* Left column — configuration */}
      <div className="lg:flex-3 lg:overflow-y-auto p-8">
        <div className="w-full space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Mediator Toolkit</h1>
              <p className="text-base text-neutral-500 mt-1">Create, audit, and test custom mediators.</p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              {userEmail && <span className="text-sm text-neutral-400">{userEmail}</span>}
              <button
                onClick={() => {
                  if (isDirty && !window.confirm('You have unsaved changes. Sign out anyway?')) return
                  signOut(auth).then(() => router.replace('/'))
                }}
                className="text-sm px-3 py-1.5 rounded-md border border-neutral-600 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                Sign out
              </button>
              <button onClick={startTour} className="text-sm px-3 py-1.5 rounded-md border border-neutral-600 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200 transition-colors cursor-pointer" id="tour-show">
                Take a tour
              </button>
            </div>
          </div>

          {/* Save / Load */}
          <div className="flex items-center gap-2">
            <input
              id="tour-template-name"
              type="text"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="Template name"
              className="flex-1 px-3 py-1.5 rounded-md border border-neutral-700 bg-neutral-900 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
            />
            <button
              id="tour-save"
              onClick={handleSave}
              disabled={saving}
              className={`px-3 py-1.5 rounded-md border text-sm transition-colors cursor-pointer disabled:opacity-50 ${saving
                  ? 'border-neutral-700 bg-neutral-900 text-neutral-400'
                  : isDirty
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300'
                }`}
            >
              {saving ? 'Saving…' : isDirty ? 'Save *' : 'Saved'}
            </button>
            <button
              id="tour-load-default"
              onClick={() => {
                if (window.confirm('Load the default template? Any unsaved changes will be lost.')) {
                  loadDefaultTemplate()
                }
              }}
              className="px-3 py-1.5 rounded-md border border-neutral-700 bg-neutral-900 text-sm text-neutral-500 hover:border-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
            >
              Load Default
            </button>
            {savedTemplates.length > 0 && (
              <select
                defaultValue=""
                onChange={e => {
                  const t = savedTemplates.find(t => t.id === e.target.value)
                  if (t) handleLoad(t.id, t.name)
                  e.target.value = ''
                }}
                className="px-3 py-1.5 rounded-md border border-neutral-700 bg-neutral-900 text-sm text-neutral-300 hover:border-neutral-500 transition-colors cursor-pointer"
              >
                <option value="" disabled>Load saved…</option>
                {savedTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Mediator configuration and prompt editors */}
          <div className="space-y-4">
            <div className="border-b border-neutral-800 pb-3">
              <h2 className="text-lg font-semibold tracking-tight">Mediator Configuration</h2>
            </div>

            <div id="tour-chat-settings">
              <MediatorSection
                title="Mediator Parameters"
                mediatorParsed={mediatorParsed}
                onUpdate={updateMediatorField}
                fields={[
                  { label: 'Typing Speed (Words Per Minute)', description: "Mediator typing speed. Set to zero for instant messages.", path: ['chat_settings', 'words_per_minute'], type: 'number', min: 1, max: 2000, step: 1 },
                  { label: 'Min User Messages Before Responding', description: "After the mediator has sent its first message, this many participant messages must be sent before the mediator is allowed to respond again.", path: ['min_participant_messages_before_responding'], type: 'number', min: 0, max: 20, step: 1 },
                  { label: 'Temperature', description: "Control the randomness of the model. 0 = deterministic, 1 = unpredictable.", path: ['generation', 'temperature'], type: 'number', min: 0, max: 2, step: 0.1 },
                  { label: 'Initial Message', description: "Message sent automatically when the conversation begins.", path: ['chat_settings', 'initial_message'], type: 'text', placeholder: "Hello! I'm here to help with..." },
                ]}
              />
            </div>
            <div id="tour-prompt-editors" className="space-y-4">
              <div className="border-b border-neutral-800 pb-3">
                <h2 className="text-lg font-semibold tracking-tight">Prompt Editors</h2>
              </div>
              <p className="text-sm text-neutral-500">Edit the prompts to optimize the mediator's response. The <span className="text-neutral-400">Intervention Prompt</span> controls what the mediator says; the <span className="text-neutral-400">Should Intervene</span> prompts the LLM to return true/false on whether it should intervene. The <span className="text-neutral-400">Initialization Prompt</span> instructs the LLM to gather information that can be used in discussions. <a href="https://www.promptingguide.ai/" target="_blank" className="underline hover:text-neutral-300">Learn more about prompt engineering.</a></p>
            </div>

            <div className="rounded-lg border border-neutral-800 overflow-hidden">
              <div className="flex border-b border-neutral-800 bg-neutral-900/60">
                {(['response', 'should-respond', 'preload'] as const).map(tab => (
                  <button
                    key={tab}
                    id={`tour-prompt-tab-${tab}`}
                    onClick={() => setActivePromptTab(tab)}
                    className={`px-4 py-2.5 text-sm font-medium transition-colors ${activePromptTab === tab ? 'text-neutral-100 border-b-2 border-neutral-400 -mb-px' : 'text-neutral-500 hover:text-neutral-300'}`}
                  >
                    {tab === 'response' ? 'Intervention Prompt' : tab === 'should-respond' ? 'Should Intervene' : 'Initialization Prompt'}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {activePromptTab === 'response' ? (
                  <div className="space-y-4">
                    <PromptEditorDescription description="A prompt that determines your mediator's interventions during the discussion.  The mediator uses this prompt to generate a message that is sent to participants.  It does so every time the Should Intervene Prompt decides the mediator should intervene." />
                    <PromptBlockLegend />
                    {/* <MediatorSection
                      title="Response Settings"
                      mediatorParsed={mediatorParsed}
                      onUpdate={updateMediatorField}
                      fields={[
                        { label: 'Context', description: "When the \"Context\" block is included in the prompt editor, it determines what experiment information is injected into the prompt. 'Current' includes only the active group chat; 'All' also includes participant responses from prior stages (e.g. pre-survey).", path: ['context'], type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'current', label: 'Current' }] },
                      ]}
                    /> */}
                    <StructuredPromptEditor
                      label="Intervention Prompt Editor"
                      prompt={(mediatorParsed?.prompt as PromptItem[]) ?? []}
                      stageId=""
                      onUpdate={updateMediatorPrompt}
                    />
                    {/* <StructuredOutputSchema
                      config={structuredOutputConfig}
                      onUpdate={updateStructuredOutputConfig}
                    /> */}
                  </div>
                ) : activePromptTab === 'should-respond' ? (
                  <div className="space-y-4">
                    <PromptEditorDescription description="Your mediator uses this prompt after each message in the discussion to decide whether this is a good time to intervene.  When the answer is YES, the mediator uses the Intervention Prompt to generate a message and sends it to the participants. When the answer is 'NO' the mediator waits for the next participant message. Message sent automatically when the conversation begins." />
                    <PromptBlockLegend />
                    {/* <MediatorSection
                      title="ShouldRespond Settings"
                      mediatorParsed={mediatorParsed}
                      onUpdate={updateMediatorField}
                      fields={[
                        { label: 'Context', description: "When the \"Context\" block is included in the prompt editor, it determines what experiment information is injected into the prompt. 'Current' includes only the active group chat; 'All' also includes participant responses from prior stages (e.g. pre-survey).", path: ['should_respond_context'], type: 'select', options: [{ value: 'all', label: 'All' }, { value: 'current', label: 'Current' }] },
                      ]}
                    /> */}
                    <StructuredPromptEditor
                      label="Should Intervene Prompt Editor"
                      prompt={(mediatorParsed?.should_respond_prompt as PromptItem[]) ?? []}
                      stageId=""
                      onUpdate={updateShouldRespondPrompt}
                    />

                  </div>
                ) : activePromptTab === 'preload' ? (
                  <div className="space-y-4 pb-96">
                    <PromptEditorDescription description="A prompt that is run at the start of the conversation to gather information about the topic, participants, or anything else.  This information that can be subsequently accessed by your mediator during the conversation (via the Initialization Result variable)." />
                    <PromptBlockLegend textOnly />
                    <StructuredPromptEditor
                      label="Initialization Prompt Editor"
                      prompt={(mediatorParsed?.preload_context_prompt as PromptItem[]) ?? []}
                      stageId=""
                      onUpdate={updatePreloadContextPrompt}
                      textOnly={true}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right column — preview & actions */}
      <div className="lg:flex-1 lg:overflow-y-auto p-8 space-y-6 border-t border-neutral-800 lg:border-t-0 lg:border-l">
        {/* YAML preview */}
        <div className="space-y-1" id='tour-template-download'>
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
            <label id="tour-template-upload" className="w-full flex items-center justify-center gap-2 text-md px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:border-neutral-600 transition-all duration-150 cursor-pointer">
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
          <div className="space-y-3" id="tour-create">
            <div className="border-b border-neutral-800 pb-3 mb-3">
              <h2 className="text-lg font-semibold tracking-tight">Mediator Testing</h2>
            </div>
            {/* create buttons on one row */}
            <div className="space-y-3">
              <ActionButton
                label="Create (human-agent)"
                loadingLabel="Creating…"
                loading={creating === 'human-agent'}
                disabled={busy}
                onClick={() => handleCreate('human-agent')}
              />
              <ActionButton
                label="Create (human-human)"
                loadingLabel="Creating…"
                loading={creating === 'human-human'}
                disabled={busy}
                onClick={() => handleCreate('human-human')}
              />
              <ActionButton
                label="Create (agent-agent)"
                loadingLabel="Creating…"
                loading={creating === 'agent-agent' && createAction === 'create'}
                disabled={busy}
                onClick={() => handleCreate('agent-agent', 'create')}
              />
            </div>
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

          <div className="space-y-3" id="tour-simulate">
            <div className="border-b border-neutral-800 pb-3 mb-3 mt-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Mediator Simulation</h2>
            </div>
            {simQuota && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${simQuota.used >= simQuota.limit ? 'bg-red-500' : 'bg-neutral-500'}`}
                    style={{ width: `${Math.min(100, (simQuota.used / simQuota.limit) * 100)}%` }}
                  />
                </div>
                <span className={`text-xs tabular-nums ${simQuota.used >= simQuota.limit ? 'text-red-400' : 'text-neutral-500'}`}>
                  {simQuota.used}/{simQuota.limit} today
                </span>
              </div>
            )}
            {/* agent-agent (simulation) on its own row, with cohort count */}
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <input
                  type="text"
                  min={1}
                  max={30}
                  value={numCohorts}
                  onChange={e => {
                    const v = e.target.value
                    if (v === '') return setNumCohorts('')
                    const n = Math.floor(Number(v))
                    if (Number.isFinite(n)) setNumCohorts(String(Math.min(30, Math.max(1, n))))
                  }}
                  disabled={busy}
                  className="w-16 p-2 rounded-lg border border-neutral-700 bg-neutral-900 text-sm text-neutral-200"
                /> <label className="text-sm text-neutral-400">Cohorts (1-30)</label>
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
                disabled={busy || (simQuota !== null && simQuota.used >= simQuota.limit)}
                onClick={handleCreateSim}
              />
            </div>
          </div>
        </div>

        {simState.result !== null && (
          <ResultBox title="Simulation" state={simState} showMessage />
        )}

        {simState.status === 'done' && simExport !== null && (
          <div className="flex flex-wrap gap-3">
            {/* <ActionButton
              label="Download simulation export (JSON)"
              loadingLabel="…"
              loading={false}
              onClick={() => downloadJson(simExport, `simulation-${(simExport as { experiment?: { id?: string } })?.experiment?.id ?? 'export'}.json`)}
            /> */}
            <ActionButton
              label="Download ConvoKit corpus (zip)"
              loadingLabel="Converting…"
              loading={convokitLoading}
              onClick={downloadConvokit}
            />
            <a
              href="https://colab.research.google.com/drive/1Mw1DNmqr5XDCPnH9zXZDVY0cM_-HZnlr#scrollTo=sQZqO5iVkTlU"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-5 py-2.5 rounded-lg border border-neutral-700 bg-neutral-900 text-base font-medium text-neutral-200 hover:bg-neutral-800 hover:border-neutral-600 active:scale-[0.98] transition-all duration-150 text-center cursor-pointer"
            >
              Notebook to analyze the data
            </a>
          </div>
        )}

      </div>
    </div>
  )
}
