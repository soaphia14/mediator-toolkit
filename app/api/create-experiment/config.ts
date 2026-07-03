import path from 'path'

export const SEED = 123

export const BASE_URL = 'https://us-central1-traust-491612.cloudfunctions.net/api/v1'
export const CREATE_PARTICIPANT_URL = 'https://us-central1-traust-491612.cloudfunctions.net/createParticipant'
export const FRONTEND_BASE = 'https://traust.infosci.cornell.edu'

export const API_KEY = process.env.DL_API_KEY ?? ''

export const PROJECT_ROOT = process.cwd()

export const MEDIATOR_DEFAULT = path.join(PROJECT_ROOT, 'public', 'templates', 'defaults', 'mediator.yaml')
export const EXPERIMENT_DEFAULT = path.join(PROJECT_ROOT, 'public', 'templates', 'defaults', 'experiment.yaml')

export const STAGE_R1 = 'chat-round-1'
export const POST_SURVEY_STAGE_ID = "post-survey"

export const COMPLETION_CODE = ''

export const POLL_INTERVAL_S = 10
export const SIM_MAX_WAIT_S = 1800