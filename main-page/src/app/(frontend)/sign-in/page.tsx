import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth-store'
import SignInForm from './SignInForm'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const user = await getSessionUser()
  if (user) {
    redirect('/')
  }

  return (
    <div className="app-shell">
      <div className="flex h-full w-full flex-1 flex-col overflow-y-auto px-5 py-7">
        <div className="my-auto w-full">
          <Suspense
            fallback={<div className="text-center text-xs text-[#8a9583]">Loading form...</div>}
          >
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
