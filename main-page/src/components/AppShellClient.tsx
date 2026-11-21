'use client'

import { useCallback, useEffect, useState } from 'react'
import ReleafApp from '@/components/ReleafApp'
import CaretakerApp from '@/components/CaretakerApp'
import PatientLocationReporter from '@/components/PatientLocationReporter'
import { signOutUserAction } from '@/app/(frontend)/sign-in/actions'
import {
  getLinkStatusAction,
  respondLinkRequestAction,
  sendLinkRequestAction,
  unlinkAccountAction,
  type LinkActionResult,
} from '@/app/(frontend)/link-actions'
import type { LinkState, SessionUser } from '@/lib/auth-store'

export type Reminder = {
  id: number
  text: string
  time: string
  days: string
  completed?: boolean
}

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

const fallbackReminders: Reminder[] = [
  { id: 1, text: 'Afternoon walk', time: '3:00 PM', days: 'Daily', completed: false },
  { id: 2, text: 'Evening hydration check', time: '7:30 PM', days: 'Daily', completed: false },
]

export default function AppShellClient({
  user,
  initialLinkState,
  initialReminders,
  initialCheckinDone = false,
}: {
  user: SessionUser
  initialLinkState: LinkState
  initialReminders?: Reminder[]
  initialCheckinDone?: boolean
}) {
  const [reminders, setReminders] = useState<Reminder[]>(() => initialReminders ?? fallbackReminders)
  const [todoChecked, setTodoChecked] = useState<Record<string, boolean>>(() => {
    const initialMap: Record<string, boolean> = {
      checkin: Boolean(initialCheckinDone),
    }
    const source = initialReminders ?? fallbackReminders
    for (const r of source) {
      initialMap[String(r.id)] = Boolean(r.completed)
    }
    return initialMap
  })
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

  const refreshReminders = useCallback(async () => {
    try {
      const res = await fetch('/api/reminders', { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      if (json.ok && Array.isArray(json.reminders)) {
        setReminders(json.reminders)
        setTodoChecked((prev) => {
          const next: Record<string, boolean> = {
            ...prev,
            checkin: Boolean(json.checkinDone),
          }
          for (const r of json.reminders) {
            next[String(r.id)] = Boolean(r.completed)
          }
          return next
        })
      }
    } catch {
      // Ignore transient errors
    }
  }, [])

  // Keep link state & reminders synced across tabs/devices
  useEffect(() => {
    const onFocus = () => {
      void refreshLinkState()
      void refreshReminders()
    }
    window.addEventListener('focus', onFocus)
    const interval = window.setInterval(
      () => {
        void refreshLinkState()
        void refreshReminders()
      },
      linkState.linkedPartner ? 3500 : 5000,
    )

    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(interval)
    }
  }, [linkState.linkedPartner, refreshLinkState, refreshReminders])

  const handleAddReminder = useCallback(
    async (item: { text: string; time?: string; days?: string }) => {
      const tempId = Date.now()
      const optimistic: Reminder = {
        id: tempId,
        text: item.text,
        time: item.time || 'Anytime',
        days: item.days || 'Daily',
        completed: false,
      }
      setReminders((prev) => [...prev, optimistic])

      try {
        const res = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', ...item }),
        })
        const json = await res.json()
        if (json.ok && Array.isArray(json.reminders)) {
          setReminders(json.reminders)
          setTodoChecked((prev) => {
            const next: Record<string, boolean> = { ...prev }
            for (const r of json.reminders) {
              next[String(r.id)] = Boolean(r.completed)
            }
            return next
          })
        }
      } catch (err) {
        console.error('Failed to add reminder:', err)
      }
    },
    [],
  )

  const handleEditReminder = useCallback(async (item: Reminder) => {
    setReminders((prev) => prev.map((r) => (r.id === item.id ? item : r)))

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...item }),
      })
      const json = await res.json()
      if (json.ok && Array.isArray(json.reminders)) {
        setReminders(json.reminders)
      }
    } catch (err) {
      console.error('Failed to edit reminder:', err)
    }
  }, [])

  const handleDeleteReminder = useCallback(async (id: number) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
    setTodoChecked((prev) => {
      const copy = { ...prev }
      delete copy[String(id)]
      return copy
    })

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      })
      const json = await res.json()
      if (json.ok && Array.isArray(json.reminders)) {
        setReminders(json.reminders)
      }
    } catch (err) {
      console.error('Failed to delete reminder:', err)
    }
  }, [])

  const handleToggleReminder = useCallback(async (id: number) => {
    setTodoChecked((prev) => ({
      ...prev,
      [String(id)]: !prev[String(id)],
    }))

    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      })
      const json = await res.json()
      if (json.ok && Array.isArray(json.reminders)) {
        setReminders(json.reminders)
        setTodoChecked((prev) => {
          const next: Record<string, boolean> = { ...prev, checkin: Boolean(json.checkinDone) }
          for (const r of json.reminders) {
            next[String(r.id)] = Boolean(r.completed)
          }
          return next
        })
      }
    } catch (err) {
      console.error('Failed to toggle reminder:', err)
    }
  }, [])

  const handleCheckin = useCallback(async () => {
    setTodoChecked((prev) => ({ ...prev, checkin: true }))
    try {
      await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkin', completed: true }),
      })
    } catch (err) {
      console.error('Failed to record checkin:', err)
    }
  }, [])

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
        onAddReminder={handleAddReminder}
        onEditReminder={handleEditReminder}
        onDeleteReminder={handleDeleteReminder}
        familyMembers={familyMembers}
        setFamilyMembers={setFamilyMembers as React.Dispatch<React.SetStateAction<FamilyMember[]>>}
      />
    )
  }

  return (
    <>
      <PatientLocationReporter
        patientId={user.id}
        patientName={user.name}
        patientCode={linkState.patientCode || user.patientCode}
        enabled={Boolean(linkState.linkedPartner)}
      />
      <ReleafApp
        user={user}
        linkState={linkState}
        onRespondLinkRequest={handleRespondLinkRequest}
        onSignOut={signOutUserAction}
        reminders={reminders}
        todoChecked={todoChecked}
        setTodoChecked={setTodoChecked}
        onAddReminder={handleAddReminder}
        onToggleReminder={handleToggleReminder}
        onCheckin={handleCheckin}
        familyMembers={familyMembers}
        setFamilyMembers={setFamilyMembers as React.Dispatch<React.SetStateAction<FamilyMember[]>>}
      />
    </>
  )
}
