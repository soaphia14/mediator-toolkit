import path from 'path'
import { BASE_URL, API_KEY, FRONTEND_BASE, STAGE_R1, AGENT_DEFAULT, EXPERIMENT_DEFAULT } from './config'
import { parseMediatorTemplate, buildMediator } from './parsers/mediator'
import { buildAgent } from './parsers/agent'
import type { AgentParticipantTemplate } from './parsers/agent'
import { buildTopic, buildStages, buildExperiment } from './parsers/experiment'
import { loadTemplate, replaceDefaults, fillAgentStance, agentConfig, createParticipant, excludeNone } from './utils'

export async function generate(p1: string, p2: string, mediatorTemplateContent: string, topic: string, hasAgent = false) {
  const experimentTemplate = replaceDefaults(
    loadTemplate(path.join(process.cwd(), 'public', 'templates', 'topics', topic, 'experiment.yaml')),
    loadTemplate(EXPERIMENT_DEFAULT),
  )
  const topicInfo = buildTopic(experimentTemplate.topic)

  const stages = buildStages(experimentTemplate, topicInfo)
  const stageIdsInOrder = stages.map((s) => s.id)

  // here use the first available chat stage id - currently we only support one mediator and one chat
  // TODO: make it more flexible to support multiple chat stages and multiple mediators in the future
  const chatStageId = stages.find((s) => s.kind === 'chat')?.id ?? STAGE_R1

  const mediatorTemplate = parseMediatorTemplate(mediatorTemplateContent)
  const mediatorR1 = buildMediator(chatStageId, mediatorTemplate, stageIdsInOrder)

  let agentR1: AgentParticipantTemplate | null = null
  let agentStance: Record<string, any> | null = null
  if (hasAgent) {
    const [agentTpl, stance] = fillAgentStance(
      loadTemplate(AGENT_DEFAULT),
      topicInfo,
    )
    agentStance = stance
    agentR1 = buildAgent(chatStageId, agentTpl, stageIdsInOrder)
  }

  const [template, cohortAlias] = buildExperiment(experimentTemplate, topicInfo, stages, stageIdsInOrder, mediatorR1, agentR1)

  const authHeaders = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  const expRes = await fetch(`${BASE_URL}/experiments`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ template: excludeNone(template) }),
  })
  if (!expRes.ok) throw new Error(`create_experiment failed: ${await expRes.text()}`)
  const result = await expRes.json()
  const expId: string = result.experiment.id

  const exportRes = await fetch(`${BASE_URL}/experiments/${expId}/export`, { method: 'GET', headers: authHeaders })
  if (!exportRes.ok) throw new Error(`export_experiment failed: ${await exportRes.text()}`)
  const expData = await exportRes.json()
  const generated: Record<string, string> = {}
  for (const c of expData.experiment.cohortDefinitions) generated[c.alias] = c.generatedCohortId
  const genCohortId = generated[cohortAlias]

  if (agentR1) {
    await createParticipant(expId, genCohortId, agentConfig(agentR1))
  }

  const baseUrl = `${FRONTEND_BASE}/#/e/${expId}/c/${genCohortId}`
  const p1Url = `${baseUrl}?PROLIFIC_PID=${p1}`
  const p2Url = !agentR1 ? `${baseUrl}?PROLIFIC_PID=${p2}` : '' // only provide p2_url if there is no agent

  return {
    participant_1: p1,
    participant_2: agentR1 ? 'agent' : p2,
    topic: topicInfo.name,
    experiment_id: expId,
    cohort_id: genCohortId,
    url: baseUrl,
    p1_url: p1Url,
    p2_url: p2Url,
    agent_stance: agentStance,
  }
}
