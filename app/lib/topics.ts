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
