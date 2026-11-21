'use server'

import {
  getLinkStateForUser,
  getSessionUser,
  respondToLinkRequest,
  sendLinkRequest,
  unlinkUsers,
  type LinkState,
} from '@/lib/auth-store'

export type LinkActionResult = {
  ok: boolean
  error?: string
  message?: string
  state: LinkState
}

const emptyState: LinkState = {
  linkedPartner: null,
  incomingRequests: [],
  outgoingRequests: [],
}

export async function getLinkStatusAction(): Promise<LinkState> {
  const session = await getSessionUser()
  if (!session) return emptyState
  return getLinkStateForUser(session.id)
}

export async function sendLinkRequestAction(patientCode: string): Promise<LinkActionResult> {
  const session = await getSessionUser()
  if (!session) {
    return { ok: false, error: 'Please sign in first.', state: emptyState }
  }
  return sendLinkRequest(session.id, patientCode)
}

export async function respondLinkRequestAction(
  requestId: string,
  decision: 'accept' | 'decline',
): Promise<LinkActionResult> {
  const session = await getSessionUser()
  if (!session) {
    return { ok: false, error: 'Please sign in first.', state: emptyState }
  }
  return respondToLinkRequest(session.id, requestId, decision)
}

export async function unlinkAccountAction(): Promise<LinkActionResult> {
  const session = await getSessionUser()
  if (!session) {
    return { ok: false, error: 'Please sign in first.', state: emptyState }
  }
  return unlinkUsers(session.id)
}
