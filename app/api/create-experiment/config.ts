import path from 'path'

export const SEED = 123

// `npm run dev` used to always target a local Cloud Functions/Firestore
// emulator (127.0.0.1:5001 etc.), which isn't part of this repo and isn't
// running in most dev setups — every Create/Simulate call just failed with
// "fetch failed". Default to the real deployed backend instead; opt into the
// local emulator explicitly (once you actually have it running) by setting
// USE_LOCAL_BACKEND=true.
const LOCAL = process.env.USE_LOCAL_BACKEND === 'true'

export const BASE_URL = LOCAL
 ? 'http://127.0.0.1:5001/convoarena-assistant/us-central1/api/v1'
 : 'https://us-central1-convoarena-assistant.cloudfunctions.net/api/v1'


export const CREATE_PARTICIPANT_URL = LOCAL
 ? 'http://127.0.0.1:5001/convoarena-assistant/us-central1/createParticipant'
 : 'https://us-central1-convoarena-assistant.cloudfunctions.net/createParticipant'


export const FRONTEND_BASE = LOCAL
 ? 'https://localhost:4201'
 : 'https://convoarena-assistant.web.app/'

export const API_KEY = process.env.DL_API_KEY ?? ''

export const PROJECT_ROOT = process.cwd()

export const MEDIATOR_DEFAULT = path.join(PROJECT_ROOT, 'public', 'templates', 'defaults', 'mediator.yaml')
export const ASSISTANT_DEFAULT = path.join(PROJECT_ROOT, 'public', 'templates', 'defaults', 'assistant.yaml')
export const EXPERIMENT_DEFAULT = path.join(PROJECT_ROOT, 'public', 'templates', 'defaults', 'experiment.yaml')
export const COMPETITION_MEDIATOR = path.join(PROJECT_ROOT, 'public', 'templates', 'competition', 'mediator.yaml')

export const STAGE_R1 = 'chat-round-1'
export const PRE_SURVEY_STAGE_ID = "pre-survey"
export const POST_SURVEY_STAGE_ID = "post-survey"

export const COMPLETION_CODE = ''