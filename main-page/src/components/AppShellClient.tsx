'use client'

import { useCallback, useEffect, useState } from 'react'
import ReleafApp from '@/components/ReleafApp'
import CaretakerApp from '@/components/CaretakerApp'
import { signOutUserAction } from '@/app/(frontend)/sign-in/actions'
import {
  getLinkStatusAction,
  respondLinkRequestAction,
  sendLinkRequestAction,
  unlinkAccountAction,
  type LinkActionResult,
} from '@/app/(frontend)/link-actions'
import type { LinkState, SessionUser } from '@/lib/auth-store'

export type Reminder = { id: number; text: string; time: string; days: string }

export type FamilyMember = {
  id: string
  name: string
  role: string
  phone: string
  photoDataUrl?: string
  x: number
  y: number
  variant: 'apple' | 'berry' | 'peach' | 'plum' | 'pear' | 'lemon'
  isCurrent?: boolean
}

const initialReminders: Reminder[] = [
  { id: 1, text: 'Afternoon walk', time: '3:00 PM', days: 'Daily' },
  { id: 2, text: 'Evening hydration check', time: '7:30 PM', days: 'Daily' },
]

export default function AppShellClient({
  user,
  initialLinkState,
}: {
  user: SessionUser
  initialLinkState: LinkState
}) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)
  const [todoChecked, setTodoChecked] = useState<Record<string, boolean>>({})
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[] | null>(null)
  const [linkState, setLinkState] = useState<LinkState>(initialLinkState)

  const refreshLinkState = useCallback(async () => {
    try {
      const fresh = await getLinkStatusAction()
      setLinkState(fresh)
    } catch {
      // Ignore transient network errors during background poll
    }
  }, [])

  // Keep link state synced across tabs/devices (for invites, acceptances, and unlinking)
  useEffect(() => {
    const onFocus = () => {
      void refreshLinkState()
    }
    window.addEventListener('focus', onFocus)
    const interval = window.setInterval(
      () => {
        void refreshLinkState()
      },
      linkState.linkedPartner ? 8000 : 4000,
    )

    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(interval)
    }
  }, [linkState.linkedPartner, refreshLinkState])

  const handleSendLinkRequest = useCallback(
    async (patientCode: string): Promise<LinkActionResult> => {
      const result = await sendLinkRequestAction(patientCode)
      setLinkState(result.state)
      return result
    },
    [],
  )

  const handleRespondLinkRequest = useCallback(
    async (requestId: string, decision: 'accept' | 'decline'): Promise<LinkActionResult> => {
      const result = await respondLinkRequestAction(requestId, decision)
      setLinkState(result.state)
      return result
    },
    [],
  )

  const handleUnlink = useCallback(async (): Promise<LinkActionResult> => {
    const result = await unlinkAccountAction()
    setLinkState(result.state)
    return result
  }, [])

  if (user.role === 'caregiver') {
    return (
      <CaretakerApp
        user={user}
        linkState={linkState}
        onSendLinkRequest={handleSendLinkRequest}
        onUnlink={handleUnlink}
        onSignOut={signOutUserAction}
        reminders={reminders}
        setReminders={setReminders}
        todoChecked={todoChecked}
        familyMembers={familyMembers}
        setFamilyMembers={setFamilyMembers as React.Dispatch<React.SetStateAction<FamilyMember[]>>}
      />
    )
  }

  return (
    <ReleafApp
      user={user}
      linkState={linkState}
      onRespondLinkRequest={handleRespondLinkRequest}
      onSignOut={signOutUserAction}
      reminders={reminders}
      todoChecked={todoChecked}
      setTodoChecked={setTodoChecked}
      familyMembers={familyMembers}
      setFamilyMembers={setFamilyMembers as React.Dispatch<React.SetStateAction<FamilyMember[]>>}
    />
  )
}
