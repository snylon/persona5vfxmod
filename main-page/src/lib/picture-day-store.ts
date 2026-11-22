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

export type OutdoorsAccessRequest = {
  id: string
  patientId: string
  caregiverId: string
  // 'pending' while the caregiver hasn't decided; 'approved' lets the patient
  // start one outdoor Picture Day session; 'denied' sends them back to the menu.
  status: 'pending' | 'approved' | 'denied'
  createdAt: string
  decidedAt?: string
}

export type PatientPictureState = {
  session: PictureDaySession | null
  currentSubmissionStatus: 'none' | 'pending' | 'rejected'
  approvedPromptIndices: number[]
  lastApprovedTitle?: string
  outdoorsRequest?: OutdoorsAccessRequest | null
}

export type CaregiverPictureState = {
  pending: PictureDaySubmission[]
  approved: PictureDaySubmission[]
  outdoorsRequest?: OutdoorsAccessRequest | null
}

type PictureDayStoreData = {
  sessions: PictureDaySession[]
  submissions: PictureDaySubmission[]
  outdoorRequests: OutdoorsAccessRequest[]
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
      outdoorRequests: Array.isArray(parsed.outdoorRequests) ? parsed.outdoorRequests : [],
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') {
      return { sessions: [], submissions: [], outdoorRequests: [] }
    }
    throw error
  }
}

async function writeStore(data: PictureDayStoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), 'utf8')
}

// Most recent outdoors-access request for a linked pair, regardless of status.
// The patient polls this to learn the caregiver's decision; the caregiver UI
// surfaces it only while it is still 'pending'.
function latestOutdoorsRequest(
  store: PictureDayStoreData,
  patientId: string,
  caregiverId: string,
): OutdoorsAccessRequest | null {
  return (
    store.outdoorRequests
      .filter((r) => r.patientId === patientId && r.caregiverId === caregiverId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  )
}

function buildPatientState(
  store: PictureDayStoreData,
  patientId: string,
  caregiverId: string,
): PatientPictureState {
  const outdoorsRequest = latestOutdoorsRequest(store, patientId, caregiverId)

  const activeSession =
    store.sessions
      .filter((s) => s.patientId === patientId && s.caregiverId === caregiverId && s.active)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null

  if (!activeSession) {
    return {
      session: null,
      currentSubmissionStatus: 'none',
      approvedPromptIndices: [],
      outdoorsRequest,
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
  // Indoors patients never wait — they advance immediately on submit.
  // Only outdoors sessions gate on caregiver approval.
  const currentSubmissionStatus: 'none' | 'pending' | 'rejected' =
    activeSession.mode === 'outdoors' && latestForStep?.status === 'pending'
      ? 'pending'
      : activeSession.mode === 'outdoors' && latestForStep?.status === 'rejected'
        ? 'rejected'
        : 'none'

  return {
    session: activeSession,
    currentSubmissionStatus,
    approvedPromptIndices,
    lastApprovedTitle: latestApproved?.promptTitle,
    outdoorsRequest,
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

  // Starting an outdoor session consumes the one-time outdoor access grant
  // (and clears any lingering request) so the next outdoor attempt needs fresh
  // approval. Indoor sessions are unaffected.
  if (mode === 'outdoors') {
    store.outdoorRequests = store.outdoorRequests.filter(
      (r) => !(r.patientId === patientId && r.caregiverId === caregiverId),
    )
  }

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
  // For outdoors, block a second submission while one is already pending.
  // For indoors, the patient advances immediately so no blocking is needed.
  if (alreadyPending && session.mode === 'outdoors') {
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

  // Indoors: advance the step immediately without waiting for caregiver review.
  if (session.mode === 'indoors') {
    session.currentStep = input.promptIndex + 1
  }

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

  return {
    pending,
    approved,
    outdoorsRequest: latestOutdoorsRequest(store, patientId, caregiverId),
  }
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

// ── Outdoors access requests ─────────────────────────────────────────────────
//
// Selecting "Outdoors" in the Picture Day menu does not start a session
// directly. The patient asks the linked caregiver for one-time outdoor access;
// only an approval unlocks a single outdoor session. This mirrors the existing
// per-picture review flow but gates mode entry instead of a single prompt.

export async function requestOutdoorsAccess(
  patientId: string,
  caregiverId: string,
): Promise<{ ok: boolean; error?: string; request: OutdoorsAccessRequest; state: PatientPictureState }> {
  const store = await readStore()

  // An already-approved request is a standing grant: hand it back so the
  // patient can start immediately without re-asking. It is consumed (removed)
  // when an outdoor session actually starts, so one approval = one access.
  const approved = store.outdoorRequests.find(
    (r) =>
      r.patientId === patientId && r.caregiverId === caregiverId && r.status === 'approved',
  )
  if (approved) {
    return { ok: true, request: approved, state: buildPatientState(store, patientId, caregiverId) }
  }

  // Reuse an already-pending request so backing out (or signing out) and
  // re-asking resumes the same wait instead of stacking duplicates. The
  // request stays pending until the caregiver decides, so the caregiver always
  // gets a chance to act on it.
  const pending = store.outdoorRequests.find(
    (r) => r.patientId === patientId && r.caregiverId === caregiverId && r.status === 'pending',
  )
  if (pending) {
    return { ok: true, request: pending, state: buildPatientState(store, patientId, caregiverId) }
  }

  const now = new Date().toISOString()
  const request: OutdoorsAccessRequest = {
    id: crypto.randomUUID(),
    patientId,
    caregiverId,
    status: 'pending',
    createdAt: now,
  }

  // No usable request remains for this pair (any leftover was denied), so clear
  // it and start a fresh pending one.
  store.outdoorRequests = store.outdoorRequests.filter(
    (r) => !(r.patientId === patientId && r.caregiverId === caregiverId),
  )
  store.outdoorRequests.push(request)
  await writeStore(store)

  return { ok: true, request, state: buildPatientState(store, patientId, caregiverId) }
}

export async function reviewOutdoorsAccess(
  caregiverId: string,
  patientId: string,
  requestId: string,
  decision: 'approve' | 'deny',
): Promise<{ ok: boolean; error?: string; message?: string; state: CaregiverPictureState }> {
  const store = await readStore()
  const request = store.outdoorRequests.find(
    (r) =>
      r.id === requestId && r.caregiverId === caregiverId && r.patientId === patientId,
  )

  if (!request) {
    return {
      ok: false,
      error: 'Outdoor access request not found.',
      state: buildCaregiverState(store, caregiverId, patientId),
    }
  }

  if (request.status !== 'pending') {
    return {
      ok: false,
      error: 'This request has already been reviewed.',
      state: buildCaregiverState(store, caregiverId, patientId),
    }
  }

  request.status = decision === 'approve' ? 'approved' : 'denied'
  request.decidedAt = new Date().toISOString()
  await writeStore(store)

  return {
    ok: true,
    message:
      decision === 'approve'
        ? 'Outdoor access approved — they can start their outdoor picture day.'
        : 'Outdoor access denied.',
    state: buildCaregiverState(store, caregiverId, patientId),
  }
}

export async function cancelOutdoorsAccess(
  patientId: string,
  caregiverId: string,
  requestId: string,
): Promise<{ ok: boolean }> {
  const store = await readStore()
  const index = store.outdoorRequests.findIndex(
    (r) =>
      r.id === requestId &&
      r.patientId === patientId &&
      r.caregiverId === caregiverId &&
      r.status === 'pending',
  )

  if (index >= 0) {
    store.outdoorRequests.splice(index, 1)
    await writeStore(store)
  }

  return { ok: true }
}

export async function deletePictureSubmission(
  caregiverId: string,
  patientId: string,
  submissionId: string,
): Promise<{ ok: boolean; error?: string; message?: string; state: CaregiverPictureState }> {
  const store = await readStore()
  const index = store.submissions.findIndex(
    (sub) =>
      sub.id === submissionId && sub.caregiverId === caregiverId && sub.patientId === patientId,
  )

  if (index < 0) {
    return {
      ok: false,
      error: 'Picture not found.',
      state: buildCaregiverState(store, caregiverId, patientId),
    }
  }

  store.submissions.splice(index, 1)
  await writeStore(store)

  return {
    ok: true,
    message: 'Picture deleted.',
    state: buildCaregiverState(store, caregiverId, patientId),
  }
}
