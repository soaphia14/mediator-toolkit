import path from 'path'
import { BASE_URL, API_KEY, FRONTEND_BASE, STAGE_R1, TopicInfo } from './config'
import { parseMediatorTemplate, buildMediator } from './mediator_parser'
import { buildAgent, loadAgentTemplate } from './agent_parser'
import { buildStages } from './stages'
import { resolveTopic, fillAgentStance, agentConfig, createParticipant } from './utils'

export async function generate(participantId: string, mediatorTemplateContent: string, hasAgent = false) {
  const mediatorTemplate = parseMediatorTemplate(mediatorTemplateContent)
  const topicName = mediatorTemplate.topic as string

  const topicInfo = resolveTopic(topicName) as TopicInfo
  const stages = buildStages(topicInfo.decision_prompt)
  const stageIdsInOrder = stages.map((s) => s.id)
  const mediatorR1 = buildMediator(STAGE_R1, mediatorTemplate, stageIdsInOrder)

  const agentTpl = hasAgent ? fillAgentStance(loadAgentTemplate(path.join(process.cwd(), 'public', 'agent-example.yaml')), topicInfo) : null
  const agentR1 = agentTpl ? buildAgent(STAGE_R1, agentTpl, stageIdsInOrder) : null

  const authHeaders = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  const expRes = await fetch(`${BASE_URL}/experiments`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: hasAgent ? `[human-agent] T${topicInfo.id}` : `[human-human] T${topicInfo.id}`,
      description: `Debate (${topicInfo.topic}). topic="${topicInfo.decision_prompt}"; `,
      stages,
      agentMediators: [mediatorR1],
      agentParticipants: hasAgent ? [agentR1] : [],
    }),
  })
  if (!expRes.ok) {
    const err = await expRes.text()
    throw new Error(`create_experiment failed: ${err}`)
  }
  const expData = await expRes.json()
  const expId: string = expData.experiment?.id ?? expData.id

  const cohortRes = await fetch(`${BASE_URL}/experiments/${expId}/cohorts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `[toolkit] T${topicInfo.id}`,
      description: `Test link for ${topicInfo.topic}.`,
      participantConfig: {
        minParticipantsPerCohort: 2,
        maxParticipantsPerCohort: 2,
        includeAllParticipantsInCohortCount: true,
        botProtection: true,
      },
    }),
  })
  if (!cohortRes.ok) {
    const err = await cohortRes.text()
    throw new Error(`create_cohort failed: ${err}`)
  }
  const cohortData = await cohortRes.json()
  const cohortId: string = cohortData.cohort?.id ?? cohortData.id

  if (hasAgent && agentR1) {
    await createParticipant(expId, cohortId, agentConfig(agentR1))
  }

  const baseUrl = `${FRONTEND_BASE}/#/e/${expId}/c/${cohortId}`

  return {
    participant: participantId,
    topic: topicInfo.topic,
    experimentId: expId,
    cohortId,
    url: baseUrl,
    participantUrl: `${baseUrl}?PROLIFIC_PID=${participantId}`,
    cohortLink: baseUrl,
    experimentLink: `${FRONTEND_BASE}/#/e/${expId}`,
  }
}
