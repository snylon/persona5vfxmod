import fs from 'node:fs/promises'
import path from 'node:path'

export type StoredReminder = {
  id: number
  patientId: string
  caregiverId?: string
  text: string
  time: string
  days: string
  completed: boolean
  completedAt?: string
  createdAt: string
  updatedAt: string
}

type RemindersStoreData = {
  reminders: StoredReminder[]
  initialized: Record<string, boolean>
  checkins: Record<string, Record<string, boolean>> // patientId -> dateKey -> boolean
}

const DATA_DIR = path.join(process.cwd(), '.data')
const STORE_FILE = path.join(DATA_DIR, 'reminders.json')

function getTodayDateKey(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function deduplicateAndEnsureUniqueIds(reminders: StoredReminder[]): { reminders: StoredReminder[]; mutated: boolean } {
  let mutated = false
  const seenTexts = new Map<string, StoredReminder>()
  const deduped: StoredReminder[] = []

  for (const r of reminders) {
    const key = `${r.patientId}::${r.text.trim().toLowerCase()}::${r.time.trim()}`
    if (seenTexts.has(key)) {
      mutated = true
      continue
    }
    seenTexts.set(key, r)
    deduped.push(r)
  }

  const seenIds = new Set<number>()
  let nextId = Date.now()
  for (const r of deduped) {
    if (seenIds.has(r.id)) {
      r.id = nextId++
      mutated = true
    }
    seenIds.add(r.id)
  }

  return { reminders: deduped, mutated }
}

async function readStore(): Promise<RemindersStoreData> {
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<RemindersStoreData>
    const rawReminders = Array.isArray(parsed.reminders) ? parsed.reminders : []
    const { reminders: cleanedReminders, mutated } = deduplicateAndEnsureUniqueIds(rawReminders)
    const storeData: RemindersStoreData = {
      reminders: cleanedReminders,
      initialized: parsed.initialized && typeof parsed.initialized === 'object' ? parsed.initialized : {},
      checkins: parsed.checkins && typeof parsed.checkins === 'object' ? parsed.checkins : {},
    }
    if (mutated) {
      void writeStore(storeData).catch(() => {})
    }
    return storeData
  } catch {
    return {
      reminders: [],
      initialized: {},
      checkins: {},
    }
  }
}

async function writeStore(data: RemindersStoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  const tmp = `${STORE_FILE}.tmp.${Date.now()}`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, STORE_FILE)
}

function resolvePatientId(userId: string, partnerId?: string | null, userRole?: string): string {
  if (userRole === 'patient') {
    return userId
  }
  if (userRole === 'caregiver' && partnerId) {
    return partnerId
  }
  return partnerId || userId
}

/**
 * Returns all reminders and check-in status for the user/patient.
 * Seeds initial default reminders on first access for a patient.
 */
export async function getRemindersForUser(
  userId: string,
  partnerId?: string | null,
  userRole?: string,
): Promise<{ reminders: StoredReminder[]; checkinDone: boolean }> {
  const store = await readStore()
  const targetPatientId = resolvePatientId(userId, partnerId, userRole)

  // If caregiver is linked to patient, migrate any reminders created by caregiver before linking
  let mutated = false
  if (partnerId && targetPatientId === partnerId) {
    for (const r of [...store.reminders]) {
      if (r.patientId === userId) {
        const alreadyExists = store.reminders.some(
          (existing) => existing.patientId === partnerId && existing.text.trim().toLowerCase() === r.text.trim().toLowerCase()
        )
        if (!alreadyExists) {
          r.patientId = partnerId
          r.caregiverId = userId
          mutated = true
        } else {
          store.reminders = store.reminders.filter((item) => item !== r)
          mutated = true
        }
      }
    }
  }

  // Seed default reminders on first access for this patient
  if (!store.initialized[targetPatientId]) {
    store.initialized[targetPatientId] = true
    const hasExisting = store.reminders.some((r) => r.patientId === targetPatientId)
    if (!hasExisting) {
      const now = new Date().toISOString()
      store.reminders.push(
        {
          id: 1,
          patientId: targetPatientId,
          caregiverId: userRole === 'caregiver' ? userId : undefined,
          text: 'Afternoon walk',
          time: '3:00 PM',
          days: 'Daily',
          completed: false,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 2,
          patientId: targetPatientId,
          caregiverId: userRole === 'caregiver' ? userId : undefined,
          text: 'Evening hydration check',
          time: '7:30 PM',
          days: 'Daily',
          completed: false,
          createdAt: now,
          updatedAt: now,
        },
      )
    }
    mutated = true
  }

  if (mutated) {
    await writeStore(store)
  }

  const patientReminders = store.reminders.filter((r) => r.patientId === targetPatientId)
  const todayKey = getTodayDateKey()
  const checkinDone = Boolean(store.checkins[targetPatientId]?.[todayKey])

  return {
    reminders: patientReminders,
    checkinDone,
  }
}

export async function addReminder(
  userId: string,
  partnerId: string | null | undefined,
  userRole: string | undefined,
  data: { text: string; time?: string; days?: string },
): Promise<{ reminders: StoredReminder[]; checkinDone: boolean }> {
  const store = await readStore()
  const targetPatientId = resolvePatientId(userId, partnerId, userRole)
  const now = new Date().toISOString()

  const newReminder: StoredReminder = {
    id: Date.now(),
    patientId: targetPatientId,
    caregiverId: userRole === 'caregiver' ? userId : undefined,
    text: data.text.trim(),
    time: data.time?.trim() || 'Anytime',
    days: data.days?.trim() || 'Daily',
    completed: false,
    createdAt: now,
    updatedAt: now,
  }

  store.reminders.push(newReminder)
  store.initialized[targetPatientId] = true
  await writeStore(store)

  return getRemindersForUser(userId, partnerId, userRole)
}

export async function updateReminder(
  userId: string,
  partnerId: string | null | undefined,
  userRole: string | undefined,
  data: { id: number; text?: string; time?: string; days?: string; completed?: boolean },
): Promise<{ reminders: StoredReminder[]; checkinDone: boolean }> {
  const store = await readStore()
  const targetPatientId = resolvePatientId(userId, partnerId, userRole)
  const now = new Date().toISOString()

  const item = store.reminders.find((r) => r.id === data.id && r.patientId === targetPatientId)
  if (item) {
    if (typeof data.text === 'string') item.text = data.text.trim()
    if (typeof data.time === 'string') item.time = data.time.trim() || 'Anytime'
    if (typeof data.days === 'string') item.days = data.days.trim() || 'Daily'
    if (typeof data.completed === 'boolean') {
      item.completed = data.completed
      item.completedAt = data.completed ? now : undefined
    }
    item.updatedAt = now
    await writeStore(store)
  }

  return getRemindersForUser(userId, partnerId, userRole)
}

export async function toggleReminder(
  userId: string,
  partnerId: string | null | undefined,
  userRole: string | undefined,
  reminderId: number,
  completedOverride?: boolean,
): Promise<{ reminders: StoredReminder[]; checkinDone: boolean }> {
  const store = await readStore()
  const targetPatientId = resolvePatientId(userId, partnerId, userRole)
  const now = new Date().toISOString()

  const item = store.reminders.find((r) => r.id === reminderId && r.patientId === targetPatientId)
  if (item) {
    item.completed = typeof completedOverride === 'boolean' ? completedOverride : !item.completed
    item.completedAt = item.completed ? now : undefined
    item.updatedAt = now
    await writeStore(store)
  }

  return getRemindersForUser(userId, partnerId, userRole)
}

export async function deleteReminder(
  userId: string,
  partnerId: string | null | undefined,
  userRole: string | undefined,
  reminderId: number,
): Promise<{ reminders: StoredReminder[]; checkinDone: boolean }> {
  const store = await readStore()
  const targetPatientId = resolvePatientId(userId, partnerId, userRole)

  store.reminders = store.reminders.filter(
    (r) => !(r.id === reminderId && r.patientId === targetPatientId),
  )
  await writeStore(store)

  return getRemindersForUser(userId, partnerId, userRole)
}

export async function recordDailyCheckin(
  userId: string,
  partnerId: string | null | undefined,
  userRole: string | undefined,
  completed = true,
): Promise<{ reminders: StoredReminder[]; checkinDone: boolean }> {
  const store = await readStore()
  const targetPatientId = resolvePatientId(userId, partnerId, userRole)
  const todayKey = getTodayDateKey()

  if (!store.checkins[targetPatientId]) {
    store.checkins[targetPatientId] = {}
  }
  store.checkins[targetPatientId][todayKey] = completed
  await writeStore(store)

  return getRemindersForUser(userId, partnerId, userRole)
}
