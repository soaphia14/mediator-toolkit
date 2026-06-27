export enum ApiKeyType {
  GEMINI = 'GEMINI',
  OPENAI = 'OPENAI',
  CLAUDE = 'CLAUDE',
  OLLAMA = 'OLLAMA',
}

export const API_KEY_TYPE_LABELS: Record<ApiKeyType, string> = {
  [ApiKeyType.GEMINI]: 'Gemini',
  [ApiKeyType.OPENAI]: 'OpenAI',
  [ApiKeyType.CLAUDE]: 'Claude',
  [ApiKeyType.OLLAMA]: 'Ollama',
}

export type ReasoningLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high'

export const REASONING_LEVEL_OPTIONS: { value: ReasoningLevel; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]
