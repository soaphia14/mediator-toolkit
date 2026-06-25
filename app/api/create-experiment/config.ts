import path from 'path'

export const SEED = 123

export const AGENT_PROMPT = `
You MUST output ONLY valid JSON matching the schema below. No text before or after it. Required fields: explanation, shouldRespond, response, readyToEndChat.

{
  "explanation": "string (1-2 sentences explaining your decision)",
  "shouldRespond": boolean,
  "response": "string (your message; empty if shouldRespond is false; limit to 20 words)",
  "readyToEndChat": boolean
}

JSON rules:
- If you've just sent the most recent message, do not send another unless you have important information to add.
- Set readyToEndChat=true after you see a system message that the timer for this stage has ended, or when the other participant clearly signals they are done.
- Do NOT add fields. Do NOT wrap in markdown. Output ONLY the JSON object.

You are a participant in a real-time text debate with another person, with a mediator also present. This debate is for scientific purposes so it is VERY IMPORTANT that you follow the instructions precisely. The other person does not know you are an LLM, and you should not reveal this. Behave like a reasonably sophisticated but otherwise ordinary person who holds the position assigned for each round — informed and articulate, but not an expert, not encyclopedic, and not suspiciously even-handed.

Topic: {topic}.
  Stance: {label} — you {strength} {verb} the proposal "{decision_prompt}".

Stance-strength rules:
- 'mildly' = weak or tentative preference; easily swayed by all arguments.
- 'moderately' = clear but balanced; sticks if arguments are weak, swayed if opposing arguments are persuasive.
- 'strongly' = firm and confident while still reasonable; sticks unless opposing arguments are very strong and counter every point you make.
Use your assigned strength. Soften gradually with explanations; if the cumulative weight of opposing arguments becomes strong enough, be willing to substantially revise or even flip your stance.

Answer surveys based on YOUR stance above. On opinion scale questions the low end (1) is 'Strongly disagree' (opposes the proposal) and the high end (7) is 'Strongly agree' (supports the proposal); rate consistently with your stance and strength.

Your job is to argue for your assigned position against the other person's belief. Lead with a steelman: the one or two most forceful considerations for your side. Do not preview your full argument; let it unfold across turns the way real disagreements do. Update genuinely in response to good arguments — concede points you cannot rebut, push back on weak arguments without rewarding bad reasoning. Real people defend views they hold while still being moveable on specifics.

Style and register:
- About 2–3 sentences worth of words per turn on average. Occasionally shorter (a one-line reaction, a question) or slightly longer when the substance demands it. Full sentences are not required. Do not maintain a uniform length.
- Plain prose. No bullet points, headers, numbered lists, or bold. This is a chat conversation.
- Do not summarize or paraphrase what the other person said before responding ("So you're saying..."). Just respond.
- Avoid mechanical balance ("on one hand... on the other hand"). Real people have a side.
- Don't cite studies by name or quote statistics with false precision. Reference what you've read, heard, or noticed in general terms.
- No excessive hedging, no over-apologizing, no "great point." Mild disagreement, light frustration, dry humor, or genuine curiosity are fine.
- Address the other person directly. If the mediator intervenes, respond briefly and naturally, then continue.
- Do not break character to discuss the structure of the debate or your reasoning process.
- Stay in the conversation. Do not wrap up, summarize, or offer to "agree to disagree" unless the other person clearly moves to end the discussion.

Make sure to appear human-like. Punctuation and capitalization does not have to be perfect — occasionally drop punctuation or capitalization to emulate a human texting. Avoid complex vocabulary or sentence structure; in particular, avoid too many commas or semicolons. As the conversation progresses, try to match the tone and chat lengths of the other human participants. Use casual, colloquial phrasing — not overly formal. Examples to emulate:
- 'not every decision will be made while "ignoring" allies. just the option to do so is important'
- 'we are talking in general statements here. hard to elaborate other than saying, if its beneficial to the US and is what\'s in the best interest of US citizens we do not have to cater to others interpretations.'
`

export const BASE_URL = 'https://us-central1-traust-491612.cloudfunctions.net/api/v1'
export const CREATE_PARTICIPANT_URL = 'https://us-central1-traust-491612.cloudfunctions.net/createParticipant'
export const FRONTEND_BASE = 'https://traust.infosci.cornell.edu'

export const API_KEY = process.env.DL_API_KEY ?? ''

export const PROJECT_ROOT = process.cwd()
export const PROMPT_VARIANTS_DIR = path.join(PROJECT_ROOT, 'data', 'prompts_variants_may_16')
export const EXPERIMENTS_DIR = path.join(PROJECT_ROOT, 'data', 'experiments')

export const STAGE_R1 = 'chat-round-1'
export const COMPLETION_CODE = ''

export interface TopicInfo {
  id: number
  topic: string
  decision_prompt: string
  decision_question: string
  supportive_argument: string
  counter_argument: string
}

export const TOPICS: Record<number, TopicInfo> = {
  1: {
    id: 1,
    topic: 'Covenant marriage',
    decision_prompt: 'I support all states in the United States offering covenant marriage - a marriage license option that requires premarital counseling and makes divorce more difficult than under a standard marriage license.',
    decision_question: 'Should a state offer couples the option to enter a covenant marriage with stricter divorce requirements?',
    supportive_argument: 'It may strengthen marital commitment, encourage couples to seek counseling, and support family stability.',
    counter_argument: 'It may make it harder for people to leave unhappy or harmful marriages and gives the state too much influence over private relationships.',
  },
  2: {
    id: 2,
    topic: 'Unilateralism',
    decision_prompt: 'I support the United States using a unilateralism approach to foreign issues - a foreign-policy approach where the United States acts independently rather than waiting for agreement from international partners.',
    decision_question: 'Should the U.S. be willing to act independently in foreign affairs when allies or international organizations disagree?',
    supportive_argument: 'Independent action can protect national interests, allow faster responses, and avoid being constrained by other countries.',
    counter_argument: 'Acting alone can weaken alliances, reduce international legitimacy, and increase the risk of costly mistakes.',
  },
  3: {
    id: 3,
    topic: 'Veteran services funding',
    decision_prompt: 'I support increasing government funding for veteran services - public programs supporting military veterans, including healthcare, housing, mental-health care, job placement, and disability services.',
    decision_question: 'Should the government increase funding for veteran services next year?',
    supportive_argument: 'Veterans have made public sacrifices, so the government has a responsibility to support their health and reintegration.',
    counter_argument: 'More funding may be inefficient if existing programs are poorly managed, and some may argue aid should be based on need rather than veteran status.',
  },
  4: {
    id: 4,
    topic: 'Occupational licensing reciprocity',
    decision_prompt: 'I support allowing workers licensed in one state to work in another state without obtaining a new local license - a policy allowing workers licensed in one state to work in another state without completing a new licensing process.',
    decision_question: 'Should a state allow workers licensed elsewhere to begin working immediately without obtaining a new local license?',
    supportive_argument: 'It lowers barriers to employment, helps workers move across states, and may reduce labor shortages.',
    counter_argument: 'It may weaken consumer protection if other states have lower training, testing, or safety standards.',
  },
  5: {
    id: 5,
    topic: 'Congestion pricing',
    decision_prompt: 'I support cities using congestion pricing to reduce traffic and fund public transportation - a policy that charges drivers a fee to enter congested urban areas during peak hours, with revenue typically used to fund public transportation.',
    decision_question: 'Should cities use congestion pricing to reduce traffic and fund public transportation?',
    supportive_argument: 'It can reduce traffic and air pollution, encourage transit use, and generate dedicated revenue for public transportation improvements.',
    counter_argument: 'It can place a disproportionate financial burden on lower-income drivers, shift traffic to surrounding neighborhoods, and harm businesses inside the priced zone.',
  },
}

export const TOPIC_BY_NAME: Record<string, TopicInfo> = Object.fromEntries(
  Object.values(TOPICS).map((t) => [t.topic, t]),
)

export const POSITION_STATEMENTS: Record<string, [string, string]> = {
  'I support all states in the United States offering covenant marriage - a marriage license option that requires premarital counseling and makes divorce more difficult than under a standard marriage license.':
    ['Strongly disagree', 'Strongly agree'],
  'I support the United States using a unilateralism approach to foreign issues - a foreign-policy approach where the United States acts independently rather than waiting for agreement from international partners.':
    ['Strongly disagree', 'Strongly agree'],
  'I support increasing government funding for veteran services - public programs supporting military veterans, including healthcare, housing, mental-health care, job placement, and disability services.':
    ['Strongly disagree', 'Strongly agree'],
  'I support allowing workers licensed in one state to work in another state without obtaining a new local license - a policy allowing workers licensed in one state to work in another state without completing a new licensing process.':
    ['Strongly disagree', 'Strongly agree'],
  'I support cities using congestion pricing to reduce traffic and fund public transportation - a policy that charges drivers a fee to enter congested urban areas during peak hours, with revenue typically used to fund public transportation.':
    ['Strongly disagree', 'Strongly agree'],
}

export const POSITION_PHRASES: Record<string, [string, string]> = {
  'I support all states in the United States offering covenant marriage - a marriage license option that requires premarital counseling and makes divorce more difficult than under a standard marriage license.':
    ['states not offering covenant marriage', 'all states offering covenant marriage'],
  'I support the United States using a unilateralism approach to foreign issues - a foreign-policy approach where the United States acts independently rather than waiting for agreement from international partners.':
    ['the U.S. not using a unilateralism approach', 'the U.S. using a unilateralism approach'],
  'I support increasing government funding for veteran services - public programs supporting military veterans, including healthcare, housing, mental-health care, job placement, and disability services.':
    ['not increasing funding for veteran services', 'increasing funding for veteran services'],
  'I support allowing workers licensed in one state to work in another state without obtaining a new local license - a policy allowing workers licensed in one state to work in another state without completing a new licensing process.':
    ['not allowing workers to work across states without a new license', 'allowing workers to work across states without a new license'],
  'I support cities using congestion pricing to reduce traffic and fund public transportation - a policy that charges drivers a fee to enter congested urban areas during peak hours, with revenue typically used to fund public transportation.':
    ['cities not using congestion pricing', 'cities using congestion pricing'],
}

export const RATING_LABELS: Record<number, string> = {
  1: 'Strongly disagree',
  2: 'Moderately disagree',
  3: 'Mildly disagree',
  4: 'Neutral',
  5: 'Mildly agree',
  6: 'Moderately agree',
  7: 'Strongly agree',
}

export const MEDIATOR_SHOULD_RESPOND_PROMPT_TEXT =
  'You are a mediator in a live discussion. Decide whether you should intervene now.\n' +
  'Reply YES if:\n' +
  '- The conversation is just starting (no messages yet)\n' +
  '- If there was no intervention for the **last 7 messages**\n' +
  '- The mediator could provide helpful information at this point\n' +
  '- Participants are going back and forth without progress\n' +
  '- The conversation has become stale\n' +
  'Reply with ONLY YES or NO.'

export const AGENT_SHOULD_CONCEDE_PROMPT_TEXT = ''
export const AGENT_THOUGHT_PROMPT_TEXT = ''

export const MEDIATOR_JSON_DIRECTIVE =
  'Return only valid JSON matching this schema:\n' +
  '{"explanation": "string", "response": "string", "readyToEndChat": boolean}\n' +
  'Set readyToEndChat=true when all other participants have completed their conversation.'

export const MEDIATOR_OUTPUT_SCHEMA = {
  explanation: { type: 'STRING', description: '1–2 sentences explaining your message or silence.' },
  response: { type: 'STRING', description: 'Your chat message.' },
  readyToEndChat: { type: 'BOOLEAN', description: 'Whether you are ready to end the conversation.' },
}

export const AGENT_OUTPUT_SCHEMA = {
  explanation: { type: 'STRING', description: '1–2 sentences explaining your message or silence.' },
  shouldRespond: { type: 'BOOLEAN', description: 'Whether you want to send a message right now.' },
  response: { type: 'STRING', description: 'Your chat message.' },
  readyToEndChat: { type: 'BOOLEAN', description: 'Whether you are ready to end the conversation.' },
}