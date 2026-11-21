import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export type PictureDayMode = 'indoors' | 'outdoors'

export type PictureDayPrompt = {
  object: string
  title: string
  guidance: string
}

export type PictureDaySession = {
  id: string
  patientId: string
  caregiverId: string
  mode: PictureDayMode
  prompts: PictureDayPrompt[]
  currentStep: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export type PictureDaySubmission = {
  id: string
  sessionId: string
  patientId: string
  caregiverId: string
  mode: PictureDayMode
  promptIndex: number
  promptObject: string
  promptTitle: string
  imageDataUrl: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt?: string
}

export type PatientPictureState = {
  session: PictureDaySession | null
  currentSubmissionStatus: 'none' | 'pending' | 'rejected'
  approvedPromptIndices: number[]
  lastApprovedTitle?: string
}

export type CaregiverPictureState = {
  pending: PictureDaySubmission[]
  approved: PictureDaySubmission[]
}

type PictureDayStoreData = {
  sessions: PictureDaySession[]
  submissions: PictureDaySubmission[]
}

const DATA_DIR = path.join(process.cwd(), '.data')
const STORE_FILE = path.join(DATA_DIR, 'picture-day.json')

async function readStore(): Promise<PictureDayStoreData> {
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<PictureDayStoreData>
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      return { sessions: [], submissions: [] }
    }
    throw error
  }
}

async function writeStore(data: PictureDayStoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), 'utf8')
}

function buildPatientState(
  store: PictureDayStoreData,
  patientId: string,
  caregiverId: string,
): PatientPictureState {
  const activeSession =
    store.sessions
      .filter((s) => s.patientId === patientId && s.caregiverId === caregiverId && s.active)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null

  if (!activeSession) {
    return {
      session: null,
      currentSubmissionStatus: 'none',
      approvedPromptIndices: [],
    }
  }

  const sessionSubs = store.submissions.filter((sub) => sub.sessionId === activeSession.id)
  const approvedPromptIndices = Array.from(
    new Set(sessionSubs.filter((s) => s.status === 'approved').map((s) => s.promptIndex)),
  ).sort((a, b) => a - b)

  const latestApproved = sessionSubs
    .filter((s) => s.status === 'approved')
    .sort((a, b) => (b.reviewedAt || b.createdAt).localeCompare(a.reviewedAt || a.createdAt))[0]

  const stepSubs = sessionSubs
    .filter((s) => s.promptIndex === activeSession.currentStep)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const latestForStep = stepSubs[0]
  const currentSubmissionStatus: 'none' | 'pending' | 'rejected' =
    latestForStep?.status === 'pending'
      ? 'pending'
      : latestForStep?.status === 'rejected'
        ? 'rejected'
        : 'none'

  return {
    session: activeSession,
    currentSubmissionStatus,
    approvedPromptIndices,
    lastApprovedTitle: latestApproved?.promptTitle,
  }
}

export async function getPatientPictureState(
  patientId: string,
  caregiverId: string,
): Promise<PatientPictureState> {
  const store = await readStore()
  return buildPatientState(store, patientId, caregiverId)
}

export async function startPatientPictureSession(
  patientId: string,
  caregiverId: string,
  mode: PictureDayMode,
  prompts: PictureDayPrompt[],
): Promise<PatientPictureState> {
  const store = await readStore()
  const now = new Date().toISOString()

  for (const existing of store.sessions) {
    if (existing.patientId === patientId && existing.caregiverId === caregiverId && existing.active) {
      existing.active = false
      existing.updatedAt = now
    }
  }

  const session: PictureDaySession = {
    id: crypto.randomUUID(),
    patientId,
    caregiverId,
    mode,
    prompts,
    currentStep: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  store.sessions.push(session)
  await writeStore(store)

  return buildPatientState(store, patientId, caregiverId)
}

export async function resetPatientPictureSession(
  patientId: string,
  caregiverId: string,
): Promise<PatientPictureState> {
  const store = await readStore()
  const now = new Date().toISOString()

  for (const existing of store.sessions) {
    if (existing.patientId === patientId && existing.caregiverId === caregiverId && existing.active) {
      existing.active = false
      existing.updatedAt = now
    }
  }

  await writeStore(store)
  return buildPatientState(store, patientId, caregiverId)
}

export async function submitPatientPicture(
  patientId: string,
  caregiverId: string,
  input: {
    sessionId: string
    promptIndex: number
    imageDataUrl: string
  },
): Promise<{ ok: boolean; error?: string; state: PatientPictureState }> {
  const store = await readStore()
  const session = store.sessions.find(
    (s) =>
      s.id === input.sessionId &&
      s.patientId === patientId &&
      s.caregiverId === caregiverId &&
      s.active,
  )

  if (!session) {
    return {
      ok: false,
      error: 'Picture Day session not found. Please start a new session.',
      state: buildPatientState(store, patientId, caregiverId),
    }
  }

  if (input.promptIndex !== session.currentStep) {
    return {
      ok: false,
      error: 'Please wait for the current picture to be approved before moving on.',
      state: buildPatientState(store, patientId, caregiverId),
    }
  }

  const prompt = session.prompts[input.promptIndex]
  if (!prompt) {
    return {
      ok: false,
      error: 'This Picture Day session is already complete.',
      state: buildPatientState(store, patientId, caregiverId),
    }
  }

  const alreadyPending = store.submissions.some(
    (sub) =>
      sub.sessionId === session.id &&
      sub.promptIndex === input.promptIndex &&
      sub.status === 'pending',
  )
  if (alreadyPending) {
    return {
      ok: false,
      error: 'Your picture is already waiting for caregiver approval.',
      state: buildPatientState(store, patientId, caregiverId),
    }
  }

  const now = new Date().toISOString()
  const submission: PictureDaySubmission = {
    id: crypto.randomUUID(),
    sessionId: session.id,
    patientId,
    caregiverId,
    mode: session.mode,
    promptIndex: input.promptIndex,
    promptObject: prompt.object,
    promptTitle: prompt.title,
    imageDataUrl: input.imageDataUrl,
    status: 'pending',
    createdAt: now,
  }

  store.submissions.push(submission)
  session.updatedAt = now
  await writeStore(store)

  return {
    ok: true,
    state: buildPatientState(store, patientId, caregiverId),
  }
}

function buildCaregiverState(
  store: PictureDayStoreData,
  caregiverId: string,
  patientId: string,
): CaregiverPictureState {
  const pairSubs = store.submissions.filter(
    (sub) => sub.caregiverId === caregiverId && sub.patientId === patientId,
  )

  const pending = pairSubs
    .filter((sub) => sub.status === 'pending')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const approved = pairSubs
    .filter((sub) => sub.status === 'approved')
    .sort((a, b) => (b.reviewedAt || b.createdAt).localeCompare(a.reviewedAt || a.createdAt))

  return { pending, approved }
}

export async function getCaregiverPictureState(
  caregiverId: string,
  patientId: string,
): Promise<CaregiverPictureState> {
  const store = await readStore()
  return buildCaregiverState(store, caregiverId, patientId)
}

export async function reviewPictureSubmission(
  caregiverId: string,
  patientId: string,
  submissionId: string,
  decision: 'approve' | 'reject',
): Promise<{ ok: boolean; error?: string; message?: string; state: CaregiverPictureState }> {
  const store = await readStore()
  const submission = store.submissions.find(
    (sub) =>
      sub.id === submissionId &&
      sub.caregiverId === caregiverId &&
      sub.patientId === patientId,
  )

  if (!submission) {
    return {
      ok: false,
      error: 'Picture submission not found.',
      state: buildCaregiverState(store, caregiverId, patientId),
    }
  }

  if (submission.status !== 'pending') {
    return {
      ok: false,
      error: 'This picture has already been reviewed.',
      state: buildCaregiverState(store, caregiverId, patientId),
    }
  }

  const now = new Date().toISOString()
  submission.status = decision === 'approve' ? 'approved' : 'rejected'
  submission.reviewedAt = now

  if (decision === 'approve') {
    const session = store.sessions.find((s) => s.id === submission.sessionId)
    if (session && session.currentStep === submission.promptIndex) {
      session.currentStep = submission.promptIndex + 1
      session.updatedAt = now
    }
  }

  await writeStore(store)

  return {
    ok: true,
    message:
      decision === 'approve'
        ? `Approved "${submission.promptTitle}"! The next prompt is now unlocked.`
        : `Asked for a new picture for "${submission.promptTitle}".`,
    state: buildCaregiverState(store, caregiverId, patientId),
  }
}
