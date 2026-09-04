import path from 'path'

export const SEED = 123

// Local dev normally targets a locally-running Deliberate Lab stack
// (Functions emulator on :5001, frontend on :4201). Override with
// USE_LOCAL_BACKEND=false to point this app at the deployed production
// backend instead (e.g. if that local stack isn't running).
const LOCAL = process.env.USE_LOCAL_BACKEND === 'false'
  ? false
  : process.env.NODE_ENV === 'development'

// The Deliberate Lab experiment engine lives in its own Firebase project
// (traust-491612 — see .firebaserc in that project, and api/export-experiment
// which already targets it), separate from this toolkit's own project
// (convoarena-assistant, used for auth/saved templates). These URLs used the
// wrong project id, which is why every Create/Simulate call 404'd locally
// (no function is loaded under the convoarena-assistant namespace) and got
// "invalid API key" in production (hitting the wrong project's deployment).
export const BASE_URL = LOCAL
 ? 'http://127.0.0.1:5001/traust-491612/us-central1/api/v1'
 : 'https://us-central1-traust-491612.cloudfunctions.net/api/v1'


export const CREATE_PARTICIPANT_URL = LOCAL
 ? 'http://127.0.0.1:5001/traust-491612/us-central1/createParticipant'
 : 'https://us-central1-traust-491612.cloudfunctions.net/createParticipant'


export const FRONTEND_BASE = LOCAL
 ? 'http://localhost:4201'
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