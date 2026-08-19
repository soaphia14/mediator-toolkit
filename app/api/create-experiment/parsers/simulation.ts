import yaml from 'js-yaml'

// ── Types ─────────────────────────────────────────────────────────────────────

// One named chunk of the chat stage description. Mirrors `Block` in
// components/BlockCustomization.tsx and `StageDescriptionBlock` in the
// ConvoArena backend.
export interface SimulationBlock {
  name: string
  description: string
}

export interface SimulationTemplate {
  description: string
  blocks: SimulationBlock[]
  maxUtterance?: number
  maxTime?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _positiveNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? n : undefined
}

// Blocks arrive from a hand-editable YAML file, so tolerate missing fields
// rather than failing the whole run. A block without a name has nothing to
// label it in the prompt, so it is dropped.
function _blocks(value: unknown): SimulationBlock[] {
  if (!Array.isArray(value)) return []
  return value
    .map((b) => ({
      name: String((b as SimulationBlock)?.name ?? '').trim(),
      description: String((b as SimulationBlock)?.description ?? ''),
    }))
    .filter((b) => b.name !== '')
}

// ── Public ────────────────────────────────────────────────────────────────────

export function parseSimulationTemplate(content: string): SimulationTemplate {
  const tpl = (yaml.load(content) ?? {}) as Record<string, unknown>
  return {
    description: String(tpl.description ?? ''),
    blocks: _blocks(tpl.blocks),
    maxUtterance: _positiveNumber(tpl.max_utterance),
    maxTime: _positiveNumber(tpl.max_time),
  }
}

/**
 * Hands the chat stage over to the simulation template.
 *
 * The conversation description becomes the stage's primary text so it leads the
 * stage description in the agent prompt, with the blocks listed under it. The
 * topic YAML's own primary text is dropped either way: when the simulation has
 * no description the backend skips the `* Stage description:` line entirely,
 * leaving only the block list under `[Stage: ...]`.
 */
export function applySimulationToChatStage(
  chatStage: Record<string, any>,
  simulation: SimulationTemplate,
): void {
  chatStage.descriptions = {
    ...chatStage.descriptions,
    primaryText: simulation.description,
    blocks: simulation.blocks,
  }
  if (simulation.maxUtterance != null) chatStage.numUtterances = simulation.maxUtterance
  if (simulation.maxTime != null) chatStage.timeLimitInMinutes = simulation.maxTime
}
