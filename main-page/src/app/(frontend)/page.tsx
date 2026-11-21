'use client'

import { useState } from 'react'
import ReleafApp from '@/components/ReleafApp'
import CaretakerApp from '@/components/CaretakerApp'

export type Reminder = { id: number; text: string; time: string; days: string }

// FamilyMember type mirrored here so page.tsx can hold the state
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

export default function HomePage() {
  const [view, setView] = useState<'patient' | 'caretaker'>('patient')
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders)

  // Shared todo checked state: 'checkin' | reminder id (as string) → boolean
  const [todoChecked, setTodoChecked] = useState<Record<string, boolean>>({})

  // Shared family tree members (null = not yet loaded from localStorage)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[] | null>(null)

  if (view === 'caretaker') {
    return (
      <CaretakerApp
        onSwitch={() => setView('patient')}
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
      onSwitch={() => setView('caretaker')}
      reminders={reminders}
      todoChecked={todoChecked}
      setTodoChecked={setTodoChecked}
      familyMembers={familyMembers}
      setFamilyMembers={setFamilyMembers as React.Dispatch<React.SetStateAction<FamilyMember[]>>}
    />
  )
}
