// These must be defined in a config.ts file in this directory
import { RATING_LABELS, TOPIC_BY_NAME, CREATE_PARTICIPANT_URL } from './config'
import type { AgentParticipantTemplate } from './agent_parser'

export interface TopicInfo {
  topic: string
  decision_prompt: string
}

function _stanceFromRating(rating: number): [string, string] {
  if (rating === 4) return [Math.random() < 0.5 ? 'support' : 'counter', 'mildly']
  const side = rating > 4 ? 'support' : 'counter'
  const distance = Math.abs(rating - 4)
  let strength: string
  if (distance >= 3) strength = 'strongly'
  else if (distance === 2) strength = 'moderately'
  else strength = 'mildly'
  return [side, strength]
}

export function fillAgentStance(agentTemplate: Record<string, any>, topicInfo: TopicInfo): Record<string, any> {
  const rating = Math.floor(Math.random() * 7) + 1
  const [side, strength] = _stanceFromRating(rating)
  const [label, action] = side === 'support' ? ['AGREEMENT', 'support'] : ['DISAGREEMENT', 'oppose']

  const substitutions: Record<string, string> = {
    '{topic_name}': topicInfo.topic,
    '{statement}': topicInfo.decision_prompt,
    '{stance_label}': label,
    '{stance_action}': action,
    '{stance_strength}': strength,
  }
  for (const item of agentTemplate.prompt ?? []) {
    if (item.type === 'TEXT') {
      for (const [token, value] of Object.entries(substitutions)) {
        item.text = item.text.replaceAll(token, value)
      }
    }
  }
  return agentTemplate
}

export function formatRating(value: number): string {
  const label = RATING_LABELS[value]
  return label ? `${value} - ${label}` : String(value)
}

export function resolveTopic(topicName: string): TopicInfo {
  const byNameLower: Record<string, TopicInfo> = Object.fromEntries(
    Object.entries(TOPIC_BY_NAME).map(([name, t]) => [name.toLowerCase(), t]),
  )
  if (!topicName || !(topicName.toLowerCase() in byNameLower)) {
    const known = Object.keys(TOPIC_BY_NAME).sort().join(', ')
    throw new Error(`Unknown topic name ${JSON.stringify(topicName)}. Known topics: ${known}`)
  }
  return byNameLower[topicName.toLowerCase()]
}

export function parseSlotToMs(slot: string): [Date, number] {
  const dt = new Date(slot)
  return [dt, dt.getTime()]
}

export function wrapChars(statement: string, charsPerLine = 30): string {
  const lines: string[] = []
  let current = ''
  for (const word of statement.split(' ')) {
    if (!word) continue
    if (current && current.length + 1 + word.length > charsPerLine) {
      lines.push(current)
      current = word
    } else {
      current = current ? `${current} ${word}` : word
    }
  }
  if (current) lines.push(current)
  return lines.join('\n') || statement
}

export function agentConfig(template: AgentParticipantTemplate): Record<string, any> {
  const model = template.persona.defaultModelSettings
  return {
    agentId: template.persona.id,
    promptContext: '',
    modelSettings: { apiType: model.apiType, modelName: model.modelName },
  }
}

export async function createParticipant(experimentId: string, cohortId: string, agentConfig: Record<string, any>) {
  const res = await fetch(CREATE_PARTICIPANT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: { experimentId, cohortId, isAnonymous: true, agentConfig },
    }),
  })
  const body = await res.json()
  if (!res.ok || body.error) throw new Error(`createParticipant failed: ${body.error ?? res.status}`)
  return body.result ?? body
}
