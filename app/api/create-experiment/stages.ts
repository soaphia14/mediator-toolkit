import { wrapChars } from './utils'
import { POSITION_PHRASES, STAGE_R1, POSITION_STATEMENTS } from './config'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Descriptions {
  primaryText: string
  infoText: string
  helpText: string
}

interface Progress {
  minParticipants: number
  waitForAllParticipants: boolean
  showParticipantProgress: boolean
  maxWaitTimeMs?: number
  agentJoinTimeMs?: number
  lockCohortAtTwoParticipants?: boolean
  waitStageHasTimer?: boolean
}

interface ScaleQuestion {
  id: string
  kind: 'scale'
  questionTitle: string
  lowerValue: number
  lowerText: string
  upperValue: number
  upperText: string
}

interface TextQuestion {
  id: string
  kind: 'text'
  questionTitle: string
}

interface McItem {
  id: string
  imageId: string
  text: string
}

interface McQuestion {
  id: string
  kind: 'mc'
  questionTitle: string
  options: McItem[]
}

type SurveyQuestion = ScaleQuestion | TextQuestion | McQuestion

interface ChatStageConfig {
  id: string
  kind: 'chat'
  name: string
  descriptions: Descriptions
  progress: Progress
  discussions: unknown[]
  timeLimitInMinutes: number
  requireFullTime: boolean
}

interface SurveyStageConfig {
  id: string
  kind: 'survey'
  name: string
  descriptions: Descriptions
  progress: Progress
  questions: SurveyQuestion[]
}

interface ProfileStageConfig {
  id: string
  kind: 'profile'
  name: string
  descriptions: Descriptions
  progress: Progress
  profileType: string
}

export type StageConfig = ChatStageConfig | SurveyStageConfig | ProfileStageConfig

// ── Helpers ───────────────────────────────────────────────────────────────────

function _chatStage(stageId: string, decisionPrompt: string): ChatStageConfig {
  return {
    id: stageId,
    kind: 'chat',
    name: 'Debate',
    descriptions: {
      primaryText: `Statement: "${decisionPrompt}"`,
      infoText: '',
      helpText: '',
    },
    progress: {
      minParticipants: 2,
      waitForAllParticipants: false,
      showParticipantProgress: true,
      maxWaitTimeMs: 210000,
      agentJoinTimeMs: 130000,
      lockCohortAtTwoParticipants: false,
      waitStageHasTimer: false,
    },
    discussions: [],
    timeLimitInMinutes: 9,
    requireFullTime: true,
  }
}

function _presurveyStage(stageId: string, topicLabel: string, decisionPrompt: string, suffix: string, againstStmt: string, supportStmt: string): SurveyStageConfig {
  return {
    id: stageId,
    kind: 'survey',
    name: `Pre-Discussion Survey (${topicLabel})`,
    descriptions: { primaryText: 'Answer a few questions before the discussion', infoText: '', helpText: '' },
    progress: {
      minParticipants: 1,
      waitForAllParticipants: false,
      showParticipantProgress: true,
      maxWaitTimeMs: 10000,
      agentJoinTimeMs: 5000,
      lockCohortAtTwoParticipants: false,
      waitStageHasTimer: false,
    },
    questions: [
      {
        id: `pre_q1_${suffix}`,
        kind: 'scale',
        questionTitle: `Please rate your view on the following statement.\n\n"${decisionPrompt}"`,
        lowerValue: 1,
        lowerText: wrapChars(againstStmt),
        upperValue: 7,
        upperText: wrapChars(supportStmt),
      },
      {
        id: `pre_q1_${suffix}.5`,
        kind: 'text',
        questionTitle: 'Briefly describe the main reasons behind your view.',
      },
    ],
  }
}

function _roundOpinionBlock(decisionPrompt: string, suffix: string, againstStmt: string, supportStmt: string): SurveyQuestion[] {
  return [
    {
      id: `q1_${suffix}`,
      kind: 'mc',
      questionTitle: 'Did the discussion in this round change the way you thought about the original statement?',
      options: [
        { id: 'no', imageId: '', text: 'Not at all. I did not change my view.' },
        { id: 'maybe', imageId: '', text: 'Somewhat. My view changed a little, but I am still leaning the same way.' },
        { id: 'yes', imageId: '', text: 'Very much so. My view changed a lot.' },
      ],
    },
    {
      id: `q2_${suffix}`,
      kind: 'text',
      questionTitle: 'If your view shifted after this discussion, how did it shift? If not, what kept it the same?',
    },
    {
      id: `q2.5_${suffix}`,
      kind: 'scale',
      questionTitle: `Please re-rate your view on the following statement now.\n\n"${decisionPrompt}"`,
      lowerValue: 1,
      lowerText: wrapChars(againstStmt),
      upperValue: 7,
      upperText: wrapChars(supportStmt),
    },
    {
      id: `q3_${suffix}`,
      kind: 'scale',
      questionTitle: "How informative was this round's discussion for you?",
      lowerValue: 1,
      lowerText: 'Not informative\n(I learned nothing new)',
      upperValue: 7,
      upperText: 'Very informative\n(I learned a lot)',
    },
    {
      id: `q4_${suffix}`,
      kind: 'scale',
      questionTitle: 'Overall, how willing was the other person you spoke with to engage in meaningful conversation?',
      lowerValue: 1,
      lowerText: 'Not at all (did not\nlisten to my perspective)',
      upperValue: 7,
      upperText: 'Very willing (consistently\nacknowledged my perspective)',
    },
  ]
}

function _mediatorBlock(suffix: string, disagreePhrase: string, agreePhrase: string): SurveyQuestion[] {
  return [
    {
      id: `q5_${suffix}`,
      kind: 'scale',
      questionTitle: 'How impactful was the information provided by the mediator?',
      lowerValue: 1,
      lowerText: 'Not at all (It did not\nimpact the conversation)',
      upperValue: 7,
      upperText: 'Very helpful (It greatly\nimpacted the conversation)',
    },
    {
      id: `q6_${suffix}`,
      kind: 'mc',
      questionTitle: 'Did the mediator favor any side?',
      options: [
        { id: 'yes', imageId: '', text: 'Yes' },
        { id: 'no', imageId: '', text: 'No' },
      ],
    },
    {
      id: `q7_${suffix}`,
      kind: 'mc',
      questionTitle: 'If so, which side did the mediator favor?',
      options: [
        { id: 'no', imageId: '', text: 'No. It did not seem to favor any side overall.' },
        { id: 'yes_agree', imageId: '', text: `Yes. It definitely favored: ${agreePhrase}.` },
        { id: 'yes_disagree', imageId: '', text: `Yes. It definitely favored: ${disagreePhrase}.` },
      ],
    },
    {
      id: `q8_${suffix}`,
      kind: 'scale',
      questionTitle: 'How biased did the mediator seem to you overall?',
      lowerValue: 1,
      lowerText: 'Not at all biased',
      upperValue: 7,
      upperText: 'Extremely biased',
    },
  ]
}

function _postsurveyStage(stageId: string, topicLabel: string, decisionPrompt: string, suffix: string, againstStmt: string, supportStmt: string): SurveyStageConfig {
  const [disagreePhrase, agreePhrase] = POSITION_PHRASES[decisionPrompt]
  return {
    id: stageId,
    kind: 'survey',
    name: `Post-Discussion Survey (${topicLabel})`,
    descriptions: { primaryText: `Answer a few questions about the discussion on "${decisionPrompt}"`, infoText: '', helpText: '' },
    progress: {
      minParticipants: 1,
      waitForAllParticipants: false,
      showParticipantProgress: true,
      maxWaitTimeMs: 10000,
      agentJoinTimeMs: 5000,
      lockCohortAtTwoParticipants: false,
      waitStageHasTimer: false,
    },
    questions: [
      ..._roundOpinionBlock(decisionPrompt, suffix, againstStmt, supportStmt),
      ..._mediatorBlock(suffix, disagreePhrase, agreePhrase),
    ],
  }
}

// note: not currently used; will be included in a multi-mediator version
// function _postExperimentSurveyStage(p1: string, p2: string): SurveyStageConfig { ... }

// ── Public ────────────────────────────────────────────────────────────────────

export function buildStages(decisionPromptR1: string): StageConfig[] {
  const [againstR1, supportR1] = POSITION_STATEMENTS[decisionPromptR1]

  return [
    {
      id: 'profile',
      kind: 'profile',
      name: 'Profile Setup',
      descriptions: { primaryText: 'Set up your profile', infoText: '', helpText: '' },
      progress: {
        minParticipants: 1,
        waitForAllParticipants: false,
        showParticipantProgress: false,
        maxWaitTimeMs: 10000,
        agentJoinTimeMs: 5000,
        lockCohortAtTwoParticipants: false,
        waitStageHasTimer: false,
      },
      profileType: 'ANONYMOUS_ANIMAL',
    },
    _presurveyStage('pre-survey', 'Topic 1', decisionPromptR1, 'a', againstR1, supportR1),
    _chatStage(STAGE_R1, decisionPromptR1),
    _postsurveyStage('post-survey', 'Topic 1', decisionPromptR1, 'a', againstR1, supportR1),

    // dl.InfoStageConfig({
    //   id: 'debriefing',
    //   kind: 'info',
    //   name: 'Debriefing',
    //   descriptions: { primaryText: 'Please read this carefully before continuing.', infoText: '', helpText: '' },
    //   progress: { minParticipants: 1, waitForAllParticipants: false, showParticipantProgress: false },
    //   infoLines: [
    //     '## Study debriefing',
    //     'Thank you for taking part in this study.',
    //     'We want to let you know that the other participant in your discussion may have been either another human participant or an AI agent.',
    //     'Our goal is to run human-human discussions. However, if one participant was late or unavailable, we may have replaced that participant with an AI agent so the study could continue.',
    //     'We did this to keep the study running smoothly and to understand how people discuss topics in different conversation settings.',
    //     'You may withdraw your data from the study at any time by contacting the research team.',
    //   ],
    // }),
    // dl.InfoStageConfig({
    //   id: 'completion-page',
    //   kind: 'info',
    //   name: 'Completion Page',
    //   descriptions: { primaryText: 'Follow the instructions to complete the study and receive credit.', infoText: '', helpText: '' },
    //   progress: { minParticipants: 1, waitForAllParticipants: false, showParticipantProgress: false },
    //   infoLines: [
    //     `Step 1. Copy the completion code: **${COMPLETION_CODE}**`,
    //     'Step 2. Click **End experiment** in the bottom right corner.',
    //     'Step 3. Paste the completion code in the survey and the Prolific study.',
    //   ],
    // }),
  ]
}
