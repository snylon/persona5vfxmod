import { NextResponse } from 'next/server'
import { getLinkStateForUser, getSessionUser } from '@/lib/auth-store'
import {
  addReminder,
  deleteReminder,
  getRemindersForUser,
  recordDailyCheckin,
  toggleReminder,
  updateReminder,
} from '@/lib/reminders-store'

export const dynamic = 'force-dynamic'

async function getAuthContext() {
  const session = await getSessionUser()
  if (!session) {
    return { error: 'Please sign in first.', status: 401 as const }
  }
  const linkState = await getLinkStateForUser(session.id)
  return {
    session,
    partnerId: linkState.linkedPartner?.id ?? null,
  }
}

export async function GET() {
  try {
    const ctx = await getAuthContext()
    if ('error' in ctx) {
      return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status })
    }

    const data = await getRemindersForUser(ctx.session.id, ctx.partnerId, ctx.session.role)
    return NextResponse.json(
      { ok: true, reminders: data.reminders, checkinDone: data.checkinDone },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('GET /api/reminders error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load reminders.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getAuthContext()
    if ('error' in ctx) {
      return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status })
    }

    const body = await request.json().catch(() => ({}))
    const { action } = body

    let result: { reminders: import('@/lib/reminders-store').StoredReminder[]; checkinDone: boolean }

    switch (action) {
      case 'add': {
        const text = String(body.text || '').trim()
        if (!text) {
          return NextResponse.json({ ok: false, error: 'Task text is required.' }, { status: 400 })
        }
        result = await addReminder(ctx.session.id, ctx.partnerId, ctx.session.role, {
          text,
          time: body.time ? String(body.time) : undefined,
          days: body.days ? String(body.days) : undefined,
        })
        break
      }

      case 'update': {
        const id = Number(body.id)
        if (!id) {
          return NextResponse.json({ ok: false, error: 'Valid reminder id is required.' }, { status: 400 })
        }
        result = await updateReminder(ctx.session.id, ctx.partnerId, ctx.session.role, {
          id,
          text: body.text !== undefined ? String(body.text) : undefined,
          time: body.time !== undefined ? String(body.time) : undefined,
          days: body.days !== undefined ? String(body.days) : undefined,
          completed: typeof body.completed === 'boolean' ? body.completed : undefined,
        })
        break
      }

      case 'toggle': {
        const id = Number(body.id)
        if (!id) {
          return NextResponse.json({ ok: false, error: 'Valid reminder id is required.' }, { status: 400 })
        }
        result = await toggleReminder(
          ctx.session.id,
          ctx.partnerId,
          ctx.session.role,
          id,
          typeof body.completed === 'boolean' ? body.completed : undefined,
        )
        break
      }

      case 'delete': {
        const id = Number(body.id)
        if (!id) {
          return NextResponse.json({ ok: false, error: 'Valid reminder id is required.' }, { status: 400 })
        }
        result = await deleteReminder(ctx.session.id, ctx.partnerId, ctx.session.role, id)
        break
      }

      case 'checkin': {
        const completed = typeof body.completed === 'boolean' ? body.completed : true
        result = await recordDailyCheckin(ctx.session.id, ctx.partnerId, ctx.session.role, completed)
        break
      }

      default:
        return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 })
    }

    return NextResponse.json(
      { ok: true, reminders: result.reminders, checkinDone: result.checkinDone },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('POST /api/reminders error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to update reminders.' },
      { status: 500 },
    )
  }
}
