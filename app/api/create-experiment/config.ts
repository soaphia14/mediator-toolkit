import path from 'path'


export const SEED = 123


const LOCAL = process.env.NODE_ENV === 'development'


export const BASE_URL = LOCAL
? 'http://127.0.0.1:5001/convoarenadev/us-central1/api/v1'
: 'https://us-central1-convoarenadev.cloudfunctions.net/api/v1'




export const CREATE_PARTICIPANT_URL = LOCAL
? 'http://127.0.0.1:5001/convoarenadev/us-central1/createParticipant'
: 'https://us-central1-convoarenadev.cloudfunctions.net/createParticipant'




export const FRONTEND_BASE = LOCAL
? 'https://localhost:4201'
: 'https://convoarenadev.web.app/'
