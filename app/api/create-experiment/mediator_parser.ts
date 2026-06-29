import fs from 'fs'
import yaml from 'js-yaml'
import { MEDIATOR_SHOULD_RESPOND_PROMPT_TEXT, MEDIATOR_OUTPUT_SCHEMA } from './config'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StageContextItem {
  type: 'STAGE_CONTEXT'
  stageId: string
  includePrimaryText: boolean
  includeInfoText: boolean
  includeHelpText: boolean
  includeStageDisplay: boolean
  includeParticipantAnswers: boolean
}

interface TextPromptItem {
  type: 'TEXT'
  text: string
}

type PromptItem = StageContextItem | TextPromptItem

interface StructuredOutputSchemaProperty {
  name: string
  schema: { type: string; description: string }
}

interface StructuredOutputConfig {
  enabled: boolean
  type: 'JSON_SCHEMA'
  appendToPrompt: boolean
  messageField: string
  explanationField: string
  readyToEndField: string
  schema: {
    type: 'OBJECT'
    properties: StructuredOutputSchemaProperty[]
  }
}

interface GenerationConfig {
  temperature: number
  reasoningLevel: string
  includeReasoning: boolean
}

interface ChatSettings {
  minMessagesBeforeResponding: number
  canSelfTriggerCalls: boolean
  initialMessage: string
  wordsPerMinute: number
}

interface ChatPromptConfig {
  id: string
  type: 'chat'
  includeScaffoldingInPrompt: boolean
  prompt: PromptItem[]
  shouldRespondPrompt: PromptItem[]
  minParticipantMessagesBeforeResponding: number
  concedeStrength: number
  structuredOutputConfig: StructuredOutputConfig
  generationConfig: GenerationConfig
  chatSettings: ChatSettings
  numRetries: number
}

interface MediatorPersona {
  id: string
  name: string
  defaultProfile: { name: string; avatar: string; pronouns?: string }
  defaultModelSettings: { apiType: string; modelName: string }
}

export interface AgentMediatorTemplate {
  persona: MediatorPersona
  promptMap: Record<string, ChatPromptConfig>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _stageContextItems(currentStageId: string, stageIdsInOrder: string[], context: string): StageContextItem[] {
  const idx = stageIdsInOrder.indexOf(currentStageId)
  let stagesToInclude: string[]
  if (context === 'all') {
    stagesToInclude = stageIdsInOrder.slice(0, idx + 1)
  } else if (context === 'current') {
    stagesToInclude = [currentStageId]
  } else {
    throw new Error(`Unknown context value ${JSON.stringify(context)}. Must be 'all' or 'current'.`)
  }

  return stagesToInclude.map((sid) => ({
    type: 'STAGE_CONTEXT',
    stageId: sid,
    includePrimaryText: true,
    includeInfoText: false,
    includeHelpText: false,
    includeStageDisplay: true,
    includeParticipantAnswers: true,
  }))
}

function _persona(tpl: Record<string, any>): MediatorPersona {
  const persona = tpl.persona ?? {}
  const model = tpl.model ?? {}
  const name: string = persona.name ?? 'Mediator'
  return {
    id: persona.id ?? 'mediator',
    name,
    defaultProfile: {
      name,
      avatar: persona.avatar ?? '🤖',
      pronouns: persona.pronouns,
    },
    defaultModelSettings: {
      apiType: model.apiType ?? 'GEMINI',
      modelName: model.modelName ?? 'gemini-2.5-flash',
    },
  }
}

function _generation(tpl: Record<string, any>): GenerationConfig {
  const generation = tpl.generation ?? {}
  return {
    temperature: generation.temperature ?? 0.7,
    reasoningLevel: generation.reasoning_level ?? 'off',
    includeReasoning: generation.include_reasoning ?? false,
  }
}

function _chatSettings(tpl: Record<string, any>): ChatSettings {
  const chatSettings = tpl.chat_settings ?? {}
  return {
    minMessagesBeforeResponding: chatSettings.min_messages_before_responding ?? 3,
    canSelfTriggerCalls: chatSettings.can_self_trigger_calls ?? true,
    initialMessage: chatSettings.initial_message ?? '',
    wordsPerMinute: chatSettings.words_per_minute ?? 1000,
  }
}

function _structuredOutput(tpl: Record<string, any>): StructuredOutputConfig {
  const config = tpl.structured_output ?? {}
  const schema: Record<string, { type: string; description: string }> = config.schema ?? MEDIATOR_OUTPUT_SCHEMA
  const properties: StructuredOutputSchemaProperty[] = Object.entries(schema).map(([name, field]) => ({
    name,
    schema: { type: field.type, description: field.description },
  }))
  return {
    enabled: config.enabled ?? true,
    type: 'JSON_SCHEMA',
    appendToPrompt: config.append_to_prompt ?? false,
    messageField: config.message_field ?? 'response',
    explanationField: config.explanation_field ?? 'explanation',
    readyToEndField: config.ready_to_end_field ?? 'readyToEndChat',
    schema: { type: 'OBJECT', properties },
  }
}

function _promptItems(tpl: Record<string, any>, stageId: string, stageIdsInOrder: string[]): PromptItem[] {
  const context: string = tpl.context ?? 'all'
  const prompts: any[] = [...(tpl.prompt ?? [])].sort((a, b) => (a.id ?? 0) - (b.id ?? 0))

  const items: PromptItem[] = []
  for (const promptItem of prompts) {
    const kind: string = promptItem.type
    if (kind === 'CONTEXT') {
      items.push(..._stageContextItems(stageId, stageIdsInOrder, context))
    } else if (kind === 'TEXT') {
      items.push({ type: 'TEXT', text: promptItem.text })
    } else {
      throw new Error(`Unknown prompt item type ${kind}. Must be 'CONTEXT' or 'TEXT'.`)
    }
  }
  return items
}

function _shouldRespondPrompt(tpl: Record<string, any>, stageId: string): PromptItem[] {
  return [
    { type: 'TEXT', text: tpl.should_respond_prompt ?? MEDIATOR_SHOULD_RESPOND_PROMPT_TEXT },
    {
      type: 'STAGE_CONTEXT',
      stageId,
      includePrimaryText: false,
      includeInfoText: false,
      includeHelpText: false,
      includeStageDisplay: true,
      includeParticipantAnswers: false,
    },
    { type: 'TEXT', text: 'Should you respond? Reply ONLY with YES or NO.' },
  ]
}

function _chatPrompt(tpl: Record<string, any>, stageId: string, stageIdsInOrder: string[]): ChatPromptConfig {
  return {
    id: stageId,
    type: 'chat',
    includeScaffoldingInPrompt: tpl.include_scaffolding_in_prompt ?? true,
    prompt: _promptItems(tpl, stageId, stageIdsInOrder),
    shouldRespondPrompt: _shouldRespondPrompt(tpl, stageId),
    minParticipantMessagesBeforeResponding: tpl.min_participant_messages_before_responding ?? 3,
    concedeStrength: tpl.concede_strength ?? 0,
    structuredOutputConfig: _structuredOutput(tpl),
    generationConfig: _generation(tpl),
    chatSettings: _chatSettings(tpl),
    numRetries: tpl.num_retries ?? 2,
  }
}

// ── Public ────────────────────────────────────────────────────────────────────

export function loadMediatorTemplate(templatePath: string): Record<string, any> {
  const raw = fs.readFileSync(templatePath, 'utf8')
  return yaml.load(raw) as Record<string, any>
}

export function parseMediatorTemplate(content: string): Record<string, any> {
  return yaml.load(content) as Record<string, any>
}

export function buildMediator(stageId: string, mediatorTemplate: Record<string, any>, stageIdsInOrder: string[]): AgentMediatorTemplate {
  return {
    persona: _persona(mediatorTemplate),
    promptMap: { [stageId]: _chatPrompt(mediatorTemplate, stageId, stageIdsInOrder) },
  }
}
