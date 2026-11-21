import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { cookies } from 'next/headers'

export type UserRole = 'caregiver' | 'patient'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: UserRole
  patientCode?: string
}

export type StoredUser = SessionUser & {
  password: string
  linkedUserId?: string
  linkedAt?: string
  createdAt: string
}

export type LinkRequest = {
  id: string
  caregiverId: string
  caregiverName: string
  caregiverEmail: string
  patientId: string
  patientCode: string
  patientName: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export type LinkedPartner = {
  id: string
  name: string
  email: string
  role: UserRole
  patientCode?: string
  linkedAt?: string
  createdAt?: string
}

export type LinkState = {
  patientCode?: string
  linkedPartner: LinkedPartner | null
  incomingRequests: LinkRequest[]
  outgoingRequests: LinkRequest[]
}

export const SESSION_COOKIE_NAME = 'user_session'

const DATA_DIR = path.join(process.cwd(), '.data')
const USERS_FILE = path.join(DATA_DIR, 'users.json')
const LINK_REQUESTS_FILE = path.join(DATA_DIR, 'link-requests.json')
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

function generatePatientCode(existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const bytes = crypto.randomBytes(4)
    let suffix = ''
    for (let i = 0; i < 4; i++) {
      suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
    }
    const candidate = `RLF-${suffix}`
    if (!existingCodes.has(candidate)) return candidate
  }
  return `RLF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return (Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : parsed) as T
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code
    if (code === 'ENOENT') return fallback
    throw error
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
}

async function readUsers(): Promise<StoredUser[]> {
  return readJsonFile<StoredUser[]>(USERS_FILE, [])
}

async function writeUsers(users: StoredUser[]): Promise<void> {
  await writeJsonFile(USERS_FILE, users)
}

async function readLinkRequests(): Promise<LinkRequest[]> {
  return readJsonFile<LinkRequest[]>(LINK_REQUESTS_FILE, [])
}

async function writeLinkRequests(requests: LinkRequest[]): Promise<void> {
  await writeJsonFile(LINK_REQUESTS_FILE, requests)
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const normalized = email.trim().toLowerCase()
  const users = await readUsers()
  return users.find((user) => user.email.toLowerCase() === normalized)
}

export async function createUser(input: {
  name: string
  email: string
  password: string
  role: UserRole
}): Promise<StoredUser> {
  const users = await readUsers()
  const existingCodes = new Set(users.map((u) => u.patientCode).filter(Boolean) as string[])
  const newUser: StoredUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    role: input.role,
    patientCode: input.role === 'patient' ? generatePatientCode(existingCodes) : undefined,
    createdAt: new Date().toISOString(),
  }
  users.push(newUser)
  await writeUsers(users)
  return newUser
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SessionUser>
    if (
      typeof parsed?.id === 'string' &&
      typeof parsed?.name === 'string' &&
      typeof parsed?.email === 'string' &&
      (parsed.role === 'caregiver' || parsed.role === 'patient')
    ) {
      return {
        id: parsed.id,
        name: parsed.name,
        email: parsed.email,
        role: parsed.role,
        patientCode: typeof parsed.patientCode === 'string' ? parsed.patientCode : undefined,
      }
    }
    return null
  } catch {
    return null
  }
}

export async function getLinkStateForUser(userId: string): Promise<LinkState> {
  const users = await readUsers()
  let user = users.find((u) => u.id === userId)

  // Backfill a Patient ID for any patient created before patientCode was added
  if (user && user.role === 'patient' && !user.patientCode) {
    const existingCodes = new Set(users.map((u) => u.patientCode).filter(Boolean) as string[])
    user.patientCode = generatePatientCode(existingCodes)
    await writeUsers(users)
  }

  if (!user) {
    return {
      linkedPartner: null,
      incomingRequests: [],
      outgoingRequests: [],
    }
  }

  const linkedUser = user.linkedUserId
    ? users.find((u) => u.id === user.linkedUserId) ?? null
    : null

  const linkedPartner: LinkedPartner | null = linkedUser
    ? {
        id: linkedUser.id,
        name: linkedUser.name,
        email: linkedUser.email,
        role: linkedUser.role,
        patientCode: linkedUser.patientCode,
        linkedAt: user.linkedAt ?? linkedUser.linkedAt,
        createdAt: linkedUser.createdAt,
      }
    : null

  const requests = await readLinkRequests()
  const incomingRequests = requests.filter(
    (req) => req.patientId === user.id && req.status === 'pending',
  )
  const outgoingRequests = requests.filter(
    (req) => req.caregiverId === user.id && req.status === 'pending',
  )

  return {
    patientCode: user.patientCode,
    linkedPartner,
    incomingRequests,
    outgoingRequests,
  }
}

export async function sendLinkRequest(
  caregiverId: string,
  patientCodeInput: string,
): Promise<{ ok: boolean; error?: string; message?: string; state: LinkState }> {
  const users = await readUsers()
  const caregiver = users.find((u) => u.id === caregiverId)
  if (!caregiver || caregiver.role !== 'caregiver') {
    return {
      ok: false,
      error: 'Only caregiver accounts can send link requests.',
      state: await getLinkStateForUser(caregiverId),
    }
  }

  if (caregiver.linkedUserId) {
    return {
      ok: false,
      error: 'Your caregiver account is already linked to a patient.',
      state: await getLinkStateForUser(caregiverId),
    }
  }

  const rawNormalized = patientCodeInput.trim().toUpperCase().replace(/\s+/g, '')
  if (!rawNormalized) {
    return {
      ok: false,
      error: 'Please enter a patient ID.',
      state: await getLinkStateForUser(caregiverId),
    }
  }
  const normalizedCode = rawNormalized.startsWith('RLF-') ? rawNormalized : `RLF-${rawNormalized}`

  // Ensure all patients have a code before searching
  let mutatedUsers = false
  const existingCodes = new Set(users.map((u) => u.patientCode).filter(Boolean) as string[])
  for (const u of users) {
    if (u.role === 'patient' && !u.patientCode) {
      u.patientCode = generatePatientCode(existingCodes)
      existingCodes.add(u.patientCode)
      mutatedUsers = true
    }
  }
  if (mutatedUsers) await writeUsers(users)

  const patient = users.find(
    (u) => u.role === 'patient' && u.patientCode?.toUpperCase() === normalizedCode,
  )
  if (!patient || !patient.patientCode) {
    return {
      ok: false,
      error: 'No patient found with that ID. Check the ID next to their name on their home page.',
      state: await getLinkStateForUser(caregiverId),
    }
  }

  if (patient.linkedUserId) {
    return {
      ok: false,
      error: 'That patient is already linked to another caregiver.',
      state: await getLinkStateForUser(caregiverId),
    }
  }

  const requests = await readLinkRequests()
  const existingPending = requests.find(
    (r) =>
      r.caregiverId === caregiver.id &&
      r.patientId === patient.id &&
      r.status === 'pending',
  )
  if (existingPending) {
    return {
      ok: true,
      message: `Invite already sent to ${patient.name} (${patient.patientCode}). Waiting for them to accept.`,
      state: await getLinkStateForUser(caregiverId),
    }
  }

  const newRequest: LinkRequest = {
    id: crypto.randomUUID(),
    caregiverId: caregiver.id,
    caregiverName: caregiver.name,
    caregiverEmail: caregiver.email,
    patientId: patient.id,
    patientCode: patient.patientCode,
    patientName: patient.name,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  requests.push(newRequest)
  await writeLinkRequests(requests)

  return {
    ok: true,
    message: `Invite sent to ${patient.name} (${patient.patientCode})! Waiting for them to accept.`,
    state: await getLinkStateForUser(caregiverId),
  }
}

export async function respondToLinkRequest(
  patientId: string,
  requestId: string,
  decision: 'accept' | 'decline',
): Promise<{ ok: boolean; error?: string; message?: string; state: LinkState }> {
  const users = await readUsers()
  const requests = await readLinkRequests()

  const patient = users.find((u) => u.id === patientId && u.role === 'patient')
  const request = requests.find((r) => r.id === requestId && r.patientId === patientId)

  if (!patient || !request || request.status !== 'pending') {
    return {
      ok: false,
      error: 'That link invite is no longer available.',
      state: await getLinkStateForUser(patientId),
    }
  }

  if (decision === 'decline') {
    request.status = 'declined'
    await writeLinkRequests(requests)
    return {
      ok: true,
      message: `Declined invite from ${request.caregiverName}.`,
      state: await getLinkStateForUser(patientId),
    }
  }

  const caregiver = users.find((u) => u.id === request.caregiverId && u.role === 'caregiver')
  if (!caregiver) {
    request.status = 'declined'
    await writeLinkRequests(requests)
    return {
      ok: false,
      error: 'That caregiver account is no longer available.',
      state: await getLinkStateForUser(patientId),
    }
  }

  if (patient.linkedUserId || caregiver.linkedUserId) {
    request.status = 'declined'
    await writeLinkRequests(requests)
    return {
      ok: false,
      error: 'One of the accounts is already linked.',
      state: await getLinkStateForUser(patientId),
    }
  }

  const linkedNow = new Date().toISOString()
  patient.linkedUserId = caregiver.id
  patient.linkedAt = linkedNow
  caregiver.linkedUserId = patient.id
  caregiver.linkedAt = linkedNow
  request.status = 'accepted'

  // Close any other pending requests involving either user
  for (const r of requests) {
    if (
      r.id !== request.id &&
      r.status === 'pending' &&
      (r.patientId === patient.id || r.caregiverId === caregiver.id)
    ) {
      r.status = 'declined'
    }
  }

  await writeUsers(users)
  await writeLinkRequests(requests)

  return {
    ok: true,
    message: `Linked with ${caregiver.name}! All features are now unlocked.`,
    state: await getLinkStateForUser(patientId),
  }
}

export async function unlinkUsers(
  userId: string,
): Promise<{ ok: boolean; error?: string; message?: string; state: LinkState }> {
  const users = await readUsers()
  const user = users.find((u) => u.id === userId)

  if (!user || !user.linkedUserId) {
    return {
      ok: false,
      error: 'Your account is not currently linked.',
      state: await getLinkStateForUser(userId),
    }
  }

  const partner = users.find((u) => u.id === user.linkedUserId)
  const partnerName = partner?.name || 'your patient'

  delete user.linkedUserId
  delete user.linkedAt

  if (partner && partner.linkedUserId === user.id) {
    delete partner.linkedUserId
    delete partner.linkedAt
  }

  await writeUsers(users)

  return {
    ok: true,
    message: `Unlinked from ${partnerName}. Link up again to use these features.`,
    state: await getLinkStateForUser(userId),
  }
}
