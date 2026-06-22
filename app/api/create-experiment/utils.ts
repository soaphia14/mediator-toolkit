// These must be defined in a config.ts file in this directory
import { AGENT_PROMPT, RATING_LABELS, TOPIC_BY_NAME } from './config'

export interface TopicInfo {
  topic: string
  decision_prompt: string
}

interface StanceFields {
  label: string
  verb: string
}

function _stanceFields(side: string): StanceFields {
  if (side === 'support') return { label: 'AGREEMENT', verb: 'support' }
  return { label: 'DISAGREEMENT', verb: 'oppose' }
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

export function makeRandomPromptContext(topicInfo: TopicInfo): string {
  const rating = Math.floor(Math.random() * 7) + 1
  const [side, strength] = _stanceFromRating(rating)
  const stance = _stanceFields(side)

  const substitutions: Record<string, string> = {
    '{topic}': topicInfo.topic,
    '{decision_prompt}': topicInfo.decision_prompt,
    '{label}': stance.label,
    '{verb}': stance.verb,
    '{strength}': strength,
  }
  let out = AGENT_PROMPT
  for (const [token, value] of Object.entries(substitutions)) {
    out = out.replaceAll(token, value)
  }
  return out
}

export function formatRating(value: number): string {
  const label = RATING_LABELS[value]
  return label ? `${value} - ${label}` : String(value)
}

export function resolveTopic(topicName: string): TopicInfo {
  if (!(topicName in TOPIC_BY_NAME)) {
    const known = Object.keys(TOPIC_BY_NAME).sort().join(', ')
    throw new Error(`Unknown topic name ${JSON.stringify(topicName)}. Known topics: ${known}`)
  }
  return TOPIC_BY_NAME[topicName]
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

export function pidToAgentId(p1: string): Record<string, string> {
  return { [p1]: 'partner-agent-A' }
}
