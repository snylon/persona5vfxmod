import { redirect } from 'next/navigation'
import AppShellClient from '@/components/AppShellClient'
import { getLinkStateForUser, getSessionUser } from '@/lib/auth-store'

export type { FamilyMember, Reminder } from '@/components/AppShellClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/sign-in')
  }

  const initialLinkState = await getLinkStateForUser(user.id)

  return <AppShellClient user={user} initialLinkState={initialLinkState} />
}
