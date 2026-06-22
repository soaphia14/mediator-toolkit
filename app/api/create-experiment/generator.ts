import { BASE_URL, API_KEY, FRONTEND_BASE, STAGE_R1, TopicInfo } from './config'
import { parseMediatorTemplate, buildMediator } from './parser'
import { buildStages } from './stages'
import { resolveTopic, makeRandomPromptContext } from './utils'

async function addAgentPersona(
  experimentId: string,
  agentId: string,
  promptContext = '',
  modelName = 'gemini-2.5-flash',
  apiType = 'GEMINI',
) {
  const res = await fetch('https://us-central1-traust-491612.cloudfunctions.net/addAgentPersona', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        experimentId,
        agentId,
        promptContext,
        defaultModelSettings: { apiType, modelName },
      },
    }),
  })
  const body = await res.json()
  if (!res.ok || body.error) throw new Error(`addAgentPersona failed: ${body.error ?? res.status}`)
  return body.result ?? body
}

export async function generate(participantId: string, mediatorTemplateContent: string, hasAgent = false) {
  const mediatorTemplate = parseMediatorTemplate(mediatorTemplateContent)
  const topicName = mediatorTemplate.topic as string

  const topicInfo = resolveTopic(topicName) as TopicInfo
  const stages = buildStages(topicInfo.decision_prompt, participantId, hasAgent)
  const stageIdsInOrder = stages.map((s) => s.id)
  const mediatorR1 = buildMediator(STAGE_R1, mediatorTemplate, stageIdsInOrder)

  const authHeaders = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  }

  const expRes = await fetch(`${BASE_URL}/experiments`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `[human-human] T${topicInfo.id}`,
      description: `Debate (${topicInfo.topic}). topic="${topicInfo.decision_prompt}"; `,
      stages,
      agentMediators: [mediatorR1],
      agentParticipants: [],
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

  if (hasAgent) {
    await addAgentPersona(expId, 'partner-agent-A', makeRandomPromptContext(topicInfo))
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
