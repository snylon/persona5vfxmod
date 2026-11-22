import { NextResponse } from 'next/server'
import { getLinkStateForUser, getSessionUser } from '@/lib/auth-store'
import {
  cancelOutdoorsAccess,
  deletePictureSubmission,
  getCaregiverPictureState,
  getPatientPictureState,
  requestOutdoorsAccess,
  resetPatientPictureSession,
  reviewOutdoorsAccess,
  reviewPictureSubmission,
  startPatientPictureSession,
  submitPatientPicture,
  type PictureDayMode,
  type PictureDayPrompt,
} from '@/lib/picture-day-store'

export const dynamic = 'force-dynamic'

async function getLinkedContext() {
  const session = await getSessionUser()
  if (!session) {
    return { error: 'Please sign in first.', status: 401 as const }
  }
  const linkState = await getLinkStateForUser(session.id)
  if (!linkState.linkedPartner) {
    return { error: 'Please link up with your caregiver or patient first.', status: 403 as const }
  }
  return {
    session,
    partner: linkState.linkedPartner,
  }
}

export async function GET() {
  try {
    const ctx = await getLinkedContext()
    if ('error' in ctx) {
      return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status })
    }

    if (ctx.session.role === 'patient') {
      const state = await getPatientPictureState(ctx.session.id, ctx.partner.id)
      return NextResponse.json(
        { ok: true, role: 'patient', state },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const state = await getCaregiverPictureState(ctx.session.id, ctx.partner.id)
    return NextResponse.json(
      { ok: true, role: 'caregiver', state },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('GET /picture-day error:', error)
    return NextResponse.json(
      { ok: false, error: 'Failed to load Picture Day state.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getLinkedContext()
    if ('error' in ctx) {
      return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status })
    }

    const body = (await request.json()) as Record<string, unknown>
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'start') {
      if (ctx.session.role !== 'patient') {
        return NextResponse.json(
          { ok: false, error: 'Only patients can start Picture Day.' },
          { status: 403 },
        )
      }
      const mode: PictureDayMode = body.mode === 'outdoors' ? 'outdoors' : 'indoors'
      const prompts = Array.isArray(body.prompts) ? (body.prompts as PictureDayPrompt[]) : []
      if (prompts.length === 0) {
        return NextResponse.json({ ok: false, error: 'Missing prompts.' }, { status: 400 })
      }
      const state = await startPatientPictureSession(ctx.session.id, ctx.partner.id, mode, prompts)
      return NextResponse.json({ ok: true, state })
    }

    if (action === 'reset') {
      if (ctx.session.role !== 'patient') {
        return NextResponse.json(
          { ok: false, error: 'Only patients can reset Picture Day.' },
          { status: 403 },
        )
      }
      const state = await resetPatientPictureSession(ctx.session.id, ctx.partner.id)
      return NextResponse.json({ ok: true, state })
    }

    if (action === 'submit') {
      if (ctx.session.role !== 'patient') {
        return NextResponse.json(
          { ok: false, error: 'Only patients can submit pictures.' },
          { status: 403 },
        )
      }
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
      const promptIndex = typeof body.promptIndex === 'number' ? body.promptIndex : -1
      const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : ''
      if (!sessionId || promptIndex < 0 || !imageDataUrl) {
        return NextResponse.json(
          { ok: false, error: 'Missing picture submission data.' },
          { status: 400 },
        )
      }
      const result = await submitPatientPicture(ctx.session.id, ctx.partner.id, {
        sessionId,
        promptIndex,
        imageDataUrl,
      })
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (action === 'review') {
      if (ctx.session.role !== 'caregiver') {
        return NextResponse.json(
          { ok: false, error: 'Only caregivers can review pictures.' },
          { status: 403 },
        )
      }
      const submissionId = typeof body.submissionId === 'string' ? body.submissionId : ''
      const decision = body.decision === 'approve' ? 'approve' : body.decision === 'reject' ? 'reject' : null
      if (!submissionId || !decision) {
        return NextResponse.json({ ok: false, error: 'Invalid review request.' }, { status: 400 })
      }
      const result = await reviewPictureSubmission(
        ctx.session.id,
        ctx.partner.id,
        submissionId,
        decision,
      )
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (action === 'delete-picture') {
      if (ctx.session.role !== 'caregiver') {
        return NextResponse.json(
          { ok: false, error: 'Only caregivers can delete pictures.' },
          { status: 403 },
        )
      }
      const submissionId = typeof body.submissionId === 'string' ? body.submissionId : ''
      if (!submissionId) {
        return NextResponse.json({ ok: false, error: 'Missing picture id.' }, { status: 400 })
      }
      const result = await deletePictureSubmission(
        ctx.session.id,
        ctx.partner.id,
        submissionId,
      )
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (action === 'request-outdoors') {
      if (ctx.session.role !== 'patient') {
        return NextResponse.json(
          { ok: false, error: 'Only patients can request outdoor access.' },
          { status: 403 },
        )
      }
      const result = await requestOutdoorsAccess(ctx.session.id, ctx.partner.id)
      return NextResponse.json({ ok: true, requestId: result.request.id, state: result.state })
    }

    if (action === 'review-outdoors') {
      if (ctx.session.role !== 'caregiver') {
        return NextResponse.json(
          { ok: false, error: 'Only caregivers can review outdoor access requests.' },
          { status: 403 },
        )
      }
      const requestId = typeof body.requestId === 'string' ? body.requestId : ''
      const decision = body.decision === 'approve' ? 'approve' : body.decision === 'deny' ? 'deny' : null
      if (!requestId || !decision) {
        return NextResponse.json(
          { ok: false, error: 'Invalid outdoor access review request.' },
          { status: 400 },
        )
      }
      const result = await reviewOutdoorsAccess(
        ctx.session.id,
        ctx.partner.id,
        requestId,
        decision,
      )
      return NextResponse.json(result, { status: result.ok ? 200 : 400 })
    }

    if (action === 'cancel-outdoors') {
      if (ctx.session.role !== 'patient') {
        return NextResponse.json(
          { ok: false, error: 'Only patients can cancel outdoor access requests.' },
          { status: 403 },
        )
      }
      const requestId = typeof body.requestId === 'string' ? body.requestId : ''
      if (!requestId) {
        return NextResponse.json({ ok: false, error: 'Missing request id.' }, { status: 400 })
      }
      await cancelOutdoorsAccess(ctx.session.id, ctx.partner.id, requestId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: 'Unknown Picture Day action.' }, { status: 400 })
  } catch (error) {
    console.error('POST /picture-day error:', error)
    return NextResponse.json(
      { ok: false, error: 'Could not complete Picture Day request.' },
      { status: 500 },
    )
  }
}
