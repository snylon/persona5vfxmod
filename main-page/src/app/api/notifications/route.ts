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

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get('role')
  if (role !== 'caretaker' && role !== 'patient') {
    return NextResponse.json({ error: 'role must be caretaker or patient' }, { status: 400 })
  }
  const pending = queues[role].splice(0) // consume all
  return NextResponse.json({ notifications: pending })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.to || !body.title) {
    return NextResponse.json({ error: 'missing to / title' }, { status: 400 })
  }
  const { to, title, body: text = '', action } = body
  if (to !== 'caretaker' && to !== 'patient') {
    return NextResponse.json({ error: 'to must be caretaker or patient' }, { status: 400 })
  }
  const note: PendingNotification = { id: nextId++, title, body: text, action, ts: Date.now() }
  queues[to].push(note)
  return NextResponse.json({ ok: true, id: note.id })
}
