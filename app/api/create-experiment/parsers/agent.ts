import fs from 'fs'
import yaml from 'js-yaml'
import { AGENT_DEFAULT } from '../config'
import { replaceDefaults } from '../utils'
import {
  buildPromptItems,
  buildPersona,
  buildGeneration,
  buildChatSettings,
  buildStructuredOutput,
  type PromptItem,
  type StructuredOutputConfig,
  type GenerationConfig,
  type ChatSettings,
  type Persona,
} from './common'

// ── Types ─────────────────────────────────────────────────────────────────────

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

export interface AgentParticipantTemplate {
  persona: Persona
  promptMap: Record<string, ChatPromptConfig>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _shouldConcedePrompt(tpl: Record<string, any>): PromptItem[] {
  return [{ type: 'TEXT', text: tpl.should_concede_prompt }]
}

function _thoughtPrompt(tpl: Record<string, any>): PromptItem[] {
  return [{ type: 'TEXT', text: tpl.thought_prompt }]
}

function _chatPrompt(tpl: Record<string, any>, stageId: string, stageIdsInOrder: string[]): ChatPromptConfig {
  return {
    id: stageId,
    type: 'chat',
    includeScaffoldingInPrompt: tpl.include_scaffolding_in_prompt,
    concedeStrength: tpl.concede_strength,
    shouldConcedePrompt: _shouldConcedePrompt(tpl),
    thoughtPrompt: _thoughtPrompt(tpl),
    prompt: buildPromptItems(tpl, stageId, stageIdsInOrder),
    shouldRespondPrompt: null,
    minParticipantMessagesBeforeResponding: tpl.min_participant_messages_before_responding,
    structuredOutputConfig: buildStructuredOutput(tpl),
    generationConfig: buildGeneration(tpl),
    chatSettings: buildChatSettings(tpl),
    numRetries: tpl.num_retries,
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

export function buildAgent(stageId: string, agentTemplate: Record<string, any>, stageIdsInOrder: string[]): AgentParticipantTemplate {
  const tpl = replaceDefaults(agentTemplate, loadAgentTemplate(AGENT_DEFAULT))
  return {
    persona: buildPersona(tpl),
    promptMap: { [stageId]: _chatPrompt(tpl, stageId, stageIdsInOrder) },
  }
}
