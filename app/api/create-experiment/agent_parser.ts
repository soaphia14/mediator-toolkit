import fs from 'fs'
import yaml from 'js-yaml'
import { AGENT_SHOULD_CONCEDE_PROMPT_TEXT, AGENT_THOUGHT_PROMPT_TEXT, AGENT_OUTPUT_SCHEMA } from './config'

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

interface ProfileInfoPromptItem {
  type: 'PROFILE_INFO'
}

interface ProfileContextPromptItem {
  type: 'PROFILE_CONTEXT'
}

type PromptItem = StageContextItem | TextPromptItem | ProfileInfoPromptItem | ProfileContextPromptItem

interface StructuredOutputSchemaProperty {
  name: string
  schema: { type: string; description: string }
}

interface StructuredOutputConfig {
  enabled: boolean
  type: 'JSON_SCHEMA'
  appendToPrompt: boolean
  shouldRespondField: string
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
  concedeStrength: number
  shouldConcedePrompt: PromptItem[]
  thoughtPrompt: PromptItem[]
  prompt: PromptItem[]
  shouldRespondPrompt: PromptItem[] | null
  minParticipantMessagesBeforeResponding: number
  structuredOutputConfig: StructuredOutputConfig
  generationConfig: GenerationConfig
  chatSettings: ChatSettings
  numRetries: number
}

interface ParticipantPersona {
  id: string
  name: string
  defaultProfile: { name: string; avatar: string; pronouns?: string }
  defaultModelSettings: { apiType: string; modelName: string }
}

export interface AgentParticipantTemplate {
  persona: ParticipantPersona
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

function _persona(tpl: Record<string, any>): ParticipantPersona {
  const persona = tpl.persona ?? {}
  const model = tpl.model ?? {}
  const name: string = persona.name ?? 'Agent'
  return {
    id: persona.id ?? 'partner-agent',
    name,
    defaultProfile: {
      name,
      avatar: persona.avatar ?? '👤',
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
    wordsPerMinute: chatSettings.words_per_minute ?? 50,
  }
}

function _structuredOutput(tpl: Record<string, any>): StructuredOutputConfig {
  const config = tpl.structured_output ?? {}
  const schema: Record<string, { type: string; description: string }> = config.schema ?? AGENT_OUTPUT_SCHEMA
  const properties: StructuredOutputSchemaProperty[] = Object.entries(schema).map(([name, field]) => ({
    name,
    schema: { type: field.type, description: field.description },
  }))
  return {
    enabled: config.enabled ?? true,
    type: 'JSON_SCHEMA',
    appendToPrompt: config.append_to_prompt ?? false,
    shouldRespondField: config.should_respond_field ?? 'shouldRespond',
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
    } else if (kind === 'PROFILE_INFO') {
      items.push({ type: 'PROFILE_INFO' })
    } else if (kind === 'PROFILE_CONTEXT') {
      items.push({ type: 'PROFILE_CONTEXT' })
    } else if (kind === 'TEXT') {
      items.push({ type: 'TEXT', text: promptItem.text })
    } else {
      throw new Error(`Unknown prompt item type ${kind}. Must be 'CONTEXT', 'PROFILE_INFO', 'PROFILE_CONTEXT', or 'TEXT'.`)
    }
  }
  return items
}

function _shouldConcedePrompt(tpl: Record<string, any>): PromptItem[] {
  return [{ type: 'TEXT', text: tpl.should_concede_prompt ?? AGENT_SHOULD_CONCEDE_PROMPT_TEXT }]
}

function _thoughtPrompt(tpl: Record<string, any>): PromptItem[] {
  return [{ type: 'TEXT', text: tpl.thought_prompt ?? AGENT_THOUGHT_PROMPT_TEXT }]
}

function _chatPrompt(tpl: Record<string, any>, stageId: string, stageIdsInOrder: string[]): ChatPromptConfig {
  return {
    id: stageId,
    type: 'chat',
    includeScaffoldingInPrompt: tpl.include_scaffolding_in_prompt ?? true,
    concedeStrength: tpl.concede_strength ?? 0,
    shouldConcedePrompt: _shouldConcedePrompt(tpl),
    thoughtPrompt: _thoughtPrompt(tpl),
    prompt: _promptItems(tpl, stageId, stageIdsInOrder),
    shouldRespondPrompt: null,
    minParticipantMessagesBeforeResponding: tpl.min_participant_messages_before_responding ?? 3,
    structuredOutputConfig: _structuredOutput(tpl),
    generationConfig: _generation(tpl),
    chatSettings: _chatSettings(tpl),
    numRetries: tpl.num_retries ?? 2,
  }
}

// ── Public ────────────────────────────────────────────────────────────────────

export function loadAgentTemplate(templatePath: string): Record<string, any> {
  const raw = fs.readFileSync(templatePath, 'utf8')
  return yaml.load(raw) as Record<string, any>
}

export function parseAgentTemplate(content: string): Record<string, any> {
  return yaml.load(content) as Record<string, any>
}

export function buildAgent(stageId: string, AgentTemplate: Record<string, any>, stageIdsInOrder: string[]): AgentParticipantTemplate {
  return {
    persona: _persona(AgentTemplate),
    promptMap: { [stageId]: _chatPrompt(AgentTemplate, stageId, stageIdsInOrder) },
  }
}
