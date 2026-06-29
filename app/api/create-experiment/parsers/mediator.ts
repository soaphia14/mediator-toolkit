import fs from 'fs'
import yaml from 'js-yaml'
import { MEDIATOR_DEFAULT } from '../config'
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
  prompt: PromptItem[]
  shouldRespondPrompt: PromptItem[]
  minParticipantMessagesBeforeResponding: number
  concedeStrength: number
  structuredOutputConfig: StructuredOutputConfig
  generationConfig: GenerationConfig
  chatSettings: ChatSettings
  numRetries: number
}

export interface AgentMediatorTemplate {
  persona: Persona
  promptMap: Record<string, ChatPromptConfig>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _shouldRespondPrompt(tpl: Record<string, any>, stageId: string): PromptItem[] {
  return [
    { type: 'TEXT', text: tpl.should_respond_prompt },
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
    includeScaffoldingInPrompt: tpl.include_scaffolding_in_prompt,
    prompt: buildPromptItems(tpl, stageId, stageIdsInOrder),
    shouldRespondPrompt: _shouldRespondPrompt(tpl, stageId),
    minParticipantMessagesBeforeResponding: tpl.min_participant_messages_before_responding,
    concedeStrength: tpl.concede_strength,
    structuredOutputConfig: buildStructuredOutput(tpl),
    generationConfig: buildGeneration(tpl),
    chatSettings: buildChatSettings(tpl),
    numRetries: tpl.num_retries,
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
  const tpl = replaceDefaults(mediatorTemplate, loadMediatorTemplate(MEDIATOR_DEFAULT))
  return {
    persona: buildPersona(tpl),
    promptMap: { [stageId]: _chatPrompt(tpl, stageId, stageIdsInOrder) },
  }
}
