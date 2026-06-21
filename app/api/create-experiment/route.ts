const BASE_URL = 'https://us-central1-traust-491612.cloudfunctions.net/api/v1'

// ── Defaults (replace with your real question.csv values and .txt file contents) ──
const QUESTION = {
  side1: 'No, pineapple does not belong on pizza',
  side2: 'Yes, pineapple belongs on pizza',
  text:  'Should pineapple be on pizza?',
}
// TODO: replace with contents of ./constants/{qid}a.txt
const MEDIATOR_INITIAL_INFO = 'The following participants will discuss the topic. Facilitate a productive conversation.'
// TODO: replace with contents of ./constants/control.txt
const MEDIATOR_PROMPT = `You are an AI Mediator facilitating a structured discussion among students debating:\n${QUESTION.text}\nGuide the conversation constructively.`

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildDynamicStageContextItems(stageIdsInOrder: string[], currentStageId: string) {
  const idx = stageIdsInOrder.indexOf(currentStageId)
  return stageIdsInOrder.slice(0, idx + 1).map((sid) => ({
    type: 'STAGE_CONTEXT',
    stageId: sid,
    includePrimaryText: true,
    includeInfoText: false,
    includeHelpText: false,
    includeStageDisplay: true,
    includeParticipantAnswers: true,
  }))
}

function buildAgentStructuredOutputConfig() {
  return {
    enabled: true,
    type: 'JSON_SCHEMA',
    appendToPrompt: false,
    shouldRespondField: 'shouldRespond',
    messageField: 'response',
    explanationField: 'explanation',
    readyToEndField: 'readyToEndChat',
    schema: {
      type: 'OBJECT',
      properties: [
        {
          name: 'explanation',
          schema: { type: 'STRING', description: '1–2 sentences explaining why you are sending this message, or why you are staying silent, based on your persona and the chat context.' },
        },
        {
          name: 'shouldRespond',
          schema: { type: 'BOOLEAN', description: "Whether you want to send a message right now. Set to false to stay silent this turn; set to true to send the message in the 'response' field." },
        },
        {
          name: 'response',
          schema: { type: 'STRING', description: 'Your chat message (empty if you prefer to stay silent).' },
        },
        {
          name: 'readyToEndChat',
          schema: { type: 'BOOLEAN', description: 'Whether or not you are ready to end the conversation.' },
        },
      ],
    },
  }
}

function buildAgentPartnerPromptMap(stages: { id: string; kind: string }[], alias: string, topic: string) {
  const stageIdsInOrder = stages.map((s) => s.id)
  const promptMap: Record<string, unknown> = {}

  for (const stage of stages) {
    const dynamicContextItems = buildDynamicStageContextItems(stageIdsInOrder, stage.id)

    if (stage.kind === 'chat') {
      promptMap[stage.id] = {
        id: stage.id,
        type: 'chat',
        includeScaffoldingInPrompt: true,
        prompt: [
          {
            type: 'TEXT',
            text: `
Personality: You like pineapple on pizza and will argue that stance.

You MUST output ONLY valid JSON that matches the schema below.
Your entire response MUST be a single JSON object with NO text before or after it.
You MUST NOT include any fields other than: explanation, shouldRespond, response, readyToEndChat.
You MUST NOT include comments, markdown, quotes, or natural language outside the JSON.

The required JSON structure is:

{
  "explanation": "string",
  "shouldRespond": true,
  "response": "string",
  "readyToEndChat": false
}

Behavior rules:
- You are simulating a human participant in a live discussion.
- "explanation" must be 1–2 sentences explaining why your simulated participant is responding or staying silent.
- "shouldRespond" must be true or false.
- If "shouldRespond" is true, "response" must contain the participant's chat message (1–2 natural sentences).
- EXTREMELY IMPORTANT: If you decide to respond, limit your response to 20 words.
- If you've sent the most recent message in the chat, do not send another unless you have important information to build off your message.
- If "shouldRespond" is false, "response" must be an empty string.
- "readyToEndChat" must be true or false.
- Do NOT invent any additional fields.
- Do NOT wrap the JSON in backticks or markdown.
- Do NOT output anything except the JSON object.
`,
          },
          { type: 'PROFILE_INFO' },
          { type: 'PROFILE_CONTEXT' },
          ...dynamicContextItems,
        ],
        structuredOutputConfig: buildAgentStructuredOutputConfig(),
        generationConfig: { temperature: 0.7, reasoningLevel: 'off', includeReasoning: false },
        chatSettings: { minMessagesBeforeResponding: 1, canSelfTriggerCalls: true, initialMessage: '' },
        shouldRespondPrompt: null,
        shouldConcedePrompt: [
          {
            type: 'TEXT',
            text: `You are evaluating whether the agent participant ${alias} should concede to the opposing argument based on the full conversation context.\n\n Rate the opposing argument from 0 to 1 of 0 being very weak and 1 being very strong. Also include a short one sentence (<=20 words) reasoning for the rating. A concession means:\n- The opposing side has clearly won the current dispute.\n- The agent's position is no longer reasonably defensible.\n- Remaining counterarguments are weak or insufficient.\n\nOutput MUST be STRICT valid JSON only.\nFormat: Return ONLY a single JSON object on one line, with no markdown fences, noprose, no extra keys: {"concessionScore": <float between 0 and 1>, "concessionScoreReason": <one short line>}`,
          },
          {
            type: 'STAGE_CONTEXT',
            stageId: stage.id,
            includePrimaryText: false,
            includeInfoText: false,
            includeHelpText: false,
            includeStageDisplay: true,
            includeParticipantAnswers: false,
          },
        ],
        concedeStrength: 5,
        numRetries: 2,
      }
    } else if (stage.kind === 'survey' && stage.id === 'post-survey') {
      promptMap[stage.id] = {
        id: stage.id,
        type: 'survey',
        includeScaffoldingInPrompt: true,
        includeConcessionInPrompt: true,
        prompt: [
          {
            type: 'TEXT',
            text: `You are ${alias}.\n\nYou are completing the final post-discussion survey about:\n\n${topic}\n\nAnswer survey questions based on your genuine final position after the discussion given the concession information in the chat history.\n\nGuidelines:\n- Reflect any opinion changes that occurred during the discussion.\n- Be consistent with arguments you made previously.\n- Answer honestly rather than defending earlier positions.\n- Do not roleplay a moderator or facilitator.\n- Keep answers concise unless the question asks for detail.`,
          },
          { type: 'PROFILE_INFO' },
          { type: 'PROFILE_CONTEXT' },
          ...dynamicContextItems,
        ],
        generationConfig: { temperature: 0.3, reasoningLevel: 'off', includeReasoning: false },
        numRetries: 2,
      }
    }
  }

  return promptMap
}

async function addAgentPersona(experimentId: string, agentId: string, promptContext = '') {
  const res = await fetch('https://us-central1-traust-491612.cloudfunctions.net/addAgentPersona', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        experimentId,
        agentId,
        promptContext,
        defaultModelSettings: { apiType: 'GEMINI', modelName: 'gemini-2.5-flash' },
      },
    }),
  })
  const body = await res.json()
  if (!res.ok || body.error) throw new Error(`addAgentPersona failed: ${body.error ?? res.status}`)
  return body.result ?? body
}

async function addAgentToCohort(experimentId: string, cohortId: string, agentId = 'partner-agent') {
  const res = await fetch('https://us-central1-traust-491612.cloudfunctions.net/createParticipant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: {
        experimentId,
        cohortId,
        isAnonymous: true,
        agentConfig: {
          agentId,
          promptContext: '',
          modelSettings: { apiType: 'GEMINI', modelName: 'gemini-2.5-flash' },
        },
      },
    }),
  })
  const body = await res.json()
  if (!res.ok || body.error) throw new Error(`createParticipant failed: ${body.error ?? res.status}`)
  return body.result ?? body
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST() {
  const apiKey = process.env.DL_API_KEY
  if (!apiKey) return Response.json({ error: 'DL_API_KEY not set' }, { status: 500 })

  const authHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  const personA = 'Human'
  const personB = 'AGENT'
  const round = '1'
  const hasAgentPartner = [personA, personB].some((p) => p.trim().toUpperCase() === 'AGENT')
  const requiredHumans = hasAgentPartner ? 1 : 2

  const { side1, side2, text: qText } = QUESTION

  const stages = [
    {
      id: 'profile',
      kind: 'profile',
      name: 'Profile Setup',
      descriptions: { primaryText: 'Set up your profile', infoText: '', helpText: '' },
      progress: { minParticipants: 1, waitForAllParticipants: false, showParticipantProgress: false },
      profileType: 'ANONYMOUS_ANIMAL',
    },
    {
      id: 'pre-survey',
      kind: 'survey',
      name: 'Pre-Discussion Survey',
      descriptions: { primaryText: 'Answer a few questions before the discussion', infoText: '', helpText: '' },
      progress: { minParticipants: 1, waitForAllParticipants: false, showParticipantProgress: false },
      questions: [
        { id: 'q1', kind: 'text', questionTitle: 'What is your netID?' },
        { id: 'q2', kind: 'scale', questionTitle: qText, lowerValue: 1, lowerText: side1, upperValue: 7, upperText: side2 },
        { id: 'q2.5', kind: 'text', questionTitle: 'Briefly describe your opinion on the question and why you feel this way.' },
      ],
    },
    {
      id: 'discussion',
      kind: 'chat',
      name: 'Discussion',
      descriptions: {
        primaryText: `Discuss the topic "${qText}" and come to a consensus!`,
        infoText: 'You have 3 minutes to come to a consensus.',
        helpText: '',
      },
      progress: {
        minParticipants: requiredHumans,
        waitForAllParticipants: false,
        showParticipantProgress: true,
        maxWaitTimeMs: 10000,
        agentJoinTimeMs: 5000,
        lockCohortAtTwoParticipants: false,
        waitStageHasTimer: true,
        pIdToAgentId: { test1: 'partner-agent-A', test2: 'partner-agent-B' },
      },
      timeLimitInMinutes: 3,
      discussions: [
        { id: 'main', description: `Group discussion for "${qText}"\nYou must stay on this topic to receive extra credit.` },
      ],
    },
    {
      id: 'post-survey',
      kind: 'survey',
      name: 'Post-Discussion Survey',
      descriptions: { primaryText: 'Answer a few questions after the discussion', infoText: '', helpText: '' },
      progress: { minParticipants: 1, waitForAllParticipants: false, showParticipantProgress: false },
      questions: [
        {
          id: 'q0', kind: 'mc',
          questionTitle: 'Did the discussion change the way you thought about the question?',
          options: [
            { id: 'no', text: 'Not at all.', imageId: '' },
            { id: 'maybe', text: 'Somewhat.' + side1, imageId: '' },
            { id: 'yes', text: 'Very much so.' + side2, imageId: '' },
          ],
        },
        { id: 'q1', kind: 'scale', questionTitle: 'What is your stance on the topic after the discussion?', lowerValue: 1, lowerText: side1, upperValue: 7, upperText: side2 },
        { id: 'q1.1', kind: 'text', questionTitle: 'Briefly describe your opinion.' },
        { id: 'q1.2', kind: 'text', questionTitle: 'Did your opinion change in any way after the discussion? How?' },
        { id: 'q2', kind: 'scale', questionTitle: 'How informative was this discussion for you?', lowerValue: 1, lowerText: 'Not informative (I learned nothing new)', upperValue: 7, upperText: 'Very informative (I learned a lot)' },
        { id: 'q2.5', kind: 'text', questionTitle: 'Do you recall one thing you learned (if anything)?' },
        { id: 'q3', kind: 'scale', questionTitle: 'How willing was the other person to engage in meaningful conversation?', lowerValue: 1, lowerText: 'Not at all (did not listen to my perspective)', upperValue: 7, upperText: 'Very willing (consistently acknowledged my perspective)' },
        { id: 'q3.5', kind: 'text', questionTitle: 'Please explain your answer to the question above.' },
        { id: 'q4', kind: 'text', questionTitle: 'Were you happy with how the mediator guided the conversation? Why or why not?' },
        { id: 'q5', kind: 'scale', questionTitle: 'How impactful was the information provided by the mediator?', lowerValue: 1, lowerText: 'Not at all (it did not impact the conversation)', upperValue: 7, upperText: 'Very helpful (it greatly impacted the conversation)' },
        {
          id: 'q6', kind: 'mc',
          questionTitle: 'Did the mediator favor any side?',
          options: [
            { id: 'yes', text: 'Yes', imageId: '' },
            { id: 'no', text: 'No', imageId: '' },
          ],
        },
        {
          id: 'q7', kind: 'mc',
          questionTitle: 'If so, which side?',
          options: [
            { id: 'no', text: 'No. It did not seem to favor any side overall.', imageId: '' },
            { id: 'yes1', text: 'Yes. It definitely favored: ' + side1, imageId: '' },
            { id: 'yes2', text: 'Yes. It definitely favored: ' + side2, imageId: '' },
          ],
        },
      ],
    },
  ]

  const agentMediator = {
    persona: {
      id: 'helper-agent',
      name: '🤖 Mediator',
      defaultModelSettings: { apiType: 'GEMINI', modelName: 'gemini-2.5-flash' },
    },
    promptMap: {
      discussion: {
        id: 'discussion',
        type: 'chat',
        includeScaffoldingInPrompt: true,
        prompt: [
          { type: 'TEXT', text: MEDIATOR_INITIAL_INFO },
          { type: 'STAGE_CONTEXT', stageId: 'discussion', includePrimaryText: false, includeInfoText: false, includeHelpText: false, includeStageDisplay: true, includeParticipantAnswers: true },
          { type: 'TEXT', text: MEDIATOR_PROMPT },
          { type: 'TEXT', text: 'Start every conversation with "Welcome to the conversation!"' },
          {
            type: 'TEXT',
            text: '--- Response format ---\nReturn only valid JSON, according to the following schema:\n{\n  "type": "object",\n  "properties": {\n    "explanation": {\n      "description": "1-2 sentences explaining why you are sending this message, or why you are staying silent, based on your persona and the chat context.",\n      "type": "string"\n    },\n    "response": {\n      "description": "Your chat message.",\n      "type": "string"\n    },\n    "readyToEndChat": {\n      "description": "Whether or not you completed your goals and are ready to end the conversation.",\n      "type": "boolean"\n    }\n  },\n  "required": ["explanation", "response", "readyToEndChat"]\n}',
          },
        ],
        shouldRespondPrompt: [
          {
            type: 'TEXT',
            text: "You are a mediator in a live discussion. Review the conversation transcript below and decide whether you should intervene. You want to ensure the conversation includes everyone and progresses naturally.\n\nReply YES if\n:- The conversation is just started (there's no messages in the chat) \n- The mediator could provide helpful information at this point in the conversation\n- Participants are going back and forth without making progress for a while\n- The conversation has become stale or reached a dead end.\n\nReply with ONLY the word YES or NO. Do not provide any reasoning or explanation.",
          },
          { type: 'STAGE_CONTEXT', stageId: 'discussion', includePrimaryText: false, includeInfoText: false, includeHelpText: false, includeStageDisplay: true, includeParticipantAnswers: false },
          { type: 'TEXT', text: 'Based on the transcript above, should the mediator respond? Reply ONLY with YES or NO.' },
        ],
        shouldConcedePrompt: null,
        concedeStrength: 0,
        minParticipantMessagesBeforeResponding: 3,
        structuredOutputConfig: {
          enabled: true,
          type: 'JSON_SCHEMA',
          appendToPrompt: false,
          messageField: 'response',
          explanationField: 'explanation',
          readyToEndField: 'readyToEndChat',
          schema: {
            type: 'OBJECT',
            properties: [
              { name: 'explanation', schema: { type: 'STRING', description: '1-2 sentences explaining why you are sending this message, or why you are staying silent.' } },
              { name: 'response', schema: { type: 'STRING', description: 'Your chat message.' } },
              { name: 'readyToEndChat', schema: { type: 'BOOLEAN', description: 'Whether you are ready to end the conversation.' } },
            ],
          },
        },
        generationConfig: { temperature: 0.7, reasoningLevel: 'off', includeReasoning: false },
        chatSettings: { minMessagesBeforeResponding: 0, canSelfTriggerCalls: true, initialMessage: '', wordsPerMinute: 1000, agentWordsPerMinute: 80 },
        numRetries: 2,
      },
    },
  }

  const experimentBody: Record<string, unknown> = {
    name: `${personA}, ${personB} (${round}): ${qText}`,
    description: `${side1} vs ${side2}`,
    stages,
    agentMediators: [agentMediator],
    unlockTimeMs: Date.now(),
    unlockDurationMs: 100000000000,
    charities: { 'charity-id': { mission: '...' } },
  }

  if (hasAgentPartner) {
    experimentBody.agentParticipants = [
      {
        persona: {
          id: 'partner-agent',
          name: '🤖 Partner',
          defaultModelSettings: { apiType: 'GEMINI', modelName: 'gemini-2.5-flash' },
        },
        promptMap: buildAgentPartnerPromptMap(stages, '🤖 Partner', qText),
      },
    ]
  }

  // Assumes POST /experiments — adjust if the SDK uses a different path
  const expRes = await fetch(`${BASE_URL}/experiments`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(experimentBody),
  })
  if (!expRes.ok) {
    const err = await expRes.text()
    return Response.json({ error: `create_experiment failed: ${err}` }, { status: expRes.status })
  }
  const expData = await expRes.json()
  const expId: string = expData.experiment?.id ?? expData.id

  const cohortRes = await fetch(`${BASE_URL}/experiments/${expId}/cohorts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Cohort',
      description: 'Default',
      participantConfig: {
        minParticipantsPerCohort: requiredHumans,
        maxParticipantsPerCohort: requiredHumans,
        includeAllParticipantsInCohortCount: true,
        botProtection: true,
      },
    }),
  })
  if (!cohortRes.ok) {
    const err = await cohortRes.text()
    return Response.json({ error: `create_cohort failed: ${err}` }, { status: cohortRes.status })
  }
  const cohortData = await cohortRes.json()
  const cohortId: string = cohortData.cohort?.id ?? cohortData.id

  await addAgentPersona(expId, 'partner-agent-A', 'You like pineapple pizza. make that your entire personality.')
  await addAgentPersona(expId, 'partner-agent-B', 'You like cats and kitties. make that your entire personality.')
  if (hasAgentPartner) await addAgentToCohort(expId, cohortId, 'partner-agent')

  return Response.json({
    experimentId: expId,
    cohortId,
    cohortLink: `https://traust.infosci.cornell.edu/#/e/${expId}/c/${cohortId}`,
    experimentLink: `https://traust.infosci.cornell.edu/#/e/${expId}`,
  })
}
