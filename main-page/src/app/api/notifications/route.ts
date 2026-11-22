/**
 * Simple in-process notification queue.
 * GET  /api/notifications?role=caretaker   — poll for pending notifications
 * POST /api/notifications                  — push a notification to a role
 * Body: { to: 'caretaker'|'patient', title: string, body: string, action?: string }
 *
 * Notifications are consumed on GET (cleared after delivery).
 */

import { NextRequest, NextResponse } from 'next/server'

type PendingNotification = {
  id: number
  title: string
  body: string
  action?: string
  ts: number
}

// Global queues — survive for the lifetime of the Node process.
const queues: Record<string, PendingNotification[]> = {
  caretaker: [],
  patient: [],
}
let nextId = 1

function normalizeRole(role: string | null): 'caretaker' | 'patient' | null {
  if (!role) return null
  const r = role.toLowerCase().trim()
  if (r === 'caretaker' || r === 'family' || r === 'caregiver') return 'caretaker'
  if (r === 'patient') return 'patient'
  return null
}

export async function GET(req: NextRequest) {
  const rawRole = req.nextUrl.searchParams.get('role')
  const role = normalizeRole(rawRole)
  if (!role) {
    return NextResponse.json({ error: 'role must be family/caretaker or patient' }, { status: 400 })
  }
  const pending = queues[role].splice(0) // consume all
  return NextResponse.json({ notifications: pending })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.to || !body.title) {
    return NextResponse.json({ error: 'missing to / title' }, { status: 400 })
  }
  const { to: rawTo, title, body: text = '', action } = body
  const to = normalizeRole(rawTo)
  if (!to) {
    return NextResponse.json({ error: 'to must be family/caretaker or patient' }, { status: 400 })
  }
  const note: PendingNotification = { id: nextId++, title, body: text, action, ts: Date.now() }
  queues[to].push(note)
  return NextResponse.json({ ok: true, id: note.id })
}
