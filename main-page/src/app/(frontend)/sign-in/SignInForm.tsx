'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { registerUserAction, signInUserAction, type AuthActionState } from './actions'
import type { UserRole } from '@/lib/auth-store'

const initialState: AuthActionState = {
  success: false,
  error: null,
}

export default function SignInForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const defaultMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode)
  const [role, setRole] = useState<UserRole>('patient')

  useEffect(() => {
    const currentMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
    setMode(currentMode)
  }, [searchParams])

  const [signInState, signInAction, isPendingSignIn] = useActionState(
    signInUserAction,
    initialState,
  )
  const [signUpState, signUpAction, isPendingSignUp] = useActionState(
    registerUserAction,
    initialState,
  )

  const isPending = mode === 'signin' ? isPendingSignIn : isPendingSignUp
  const currentError = mode === 'signin' ? signInState?.error : signUpState?.error

  return (
    <div className="mx-auto w-full max-w-[356px]">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#e8efdc] text-[#5e7c4c] shadow-xs">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 3C9 2 2 7 5 15s17 5 15-12Z" />
            <path d="M3 22 15 9" />
          </svg>
        </div>
        <div className="font-['Manrope'] text-[28px] font-extrabold tracking-[-1.2px] text-[#344d3e]">
          releaf<span className="text-[#8ead73]">.</span>
        </div>
        <p className="mt-1 text-[11px] text-[#83907c]">
          Calm everyday support for patients &amp; caregivers
        </p>
      </div>

      {/* Sign In / Sign Up Toggle Tabs (matching LevelUp) */}
      <div
        role="tablist"
        aria-label="Authentication mode"
        className="mb-4 grid grid-cols-2 gap-1.5 rounded-[14px] border border-[#e3e9db] bg-[#eef3e6] p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          onClick={() => {
            setMode('signin')
            router.replace('/sign-in')
          }}
          className={`min-h-10 rounded-[11px] font-['Manrope'] text-[11px] font-bold tracking-[0.9px] transition ${
            mode === 'signin'
              ? 'bg-white text-[#41583c] shadow-xs'
              : 'text-[#7c8974] hover:text-[#4d6247]'
          }`}
        >
          SIGN IN
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          onClick={() => {
            setMode('signup')
            router.replace('/sign-in?mode=signup')
          }}
          className={`min-h-10 rounded-[11px] font-['Manrope'] text-[11px] font-bold tracking-[0.9px] transition ${
            mode === 'signup'
              ? 'bg-white text-[#41583c] shadow-xs'
              : 'text-[#7c8974] hover:text-[#4d6247]'
          }`}
        >
          SIGN UP
        </button>
      </div>

      <div className="rounded-[24px] border border-[#e5eadf] bg-white p-6 shadow-[0_12px_35px_rgba(52,77,62,0.06)]">
        <h1 className="font-['Manrope'] text-[22px] font-bold tracking-[-0.5px] text-[#36493a]">
          {mode === 'signin' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="mt-1 text-[12px] leading-relaxed text-[#879381]">
          {mode === 'signin'
            ? 'Enter your credentials to access your Releaf account.'
            : 'Choose your role and set up your space in Releaf.'}
        </p>

        {currentError && (
          <div
            role="alert"
            className="mt-4 rounded-[12px] border border-[#ebc8cb] bg-[#fdf3f4] px-3.5 py-2.5 text-[12px] font-medium text-[#9d5259]"
          >
            ⚠ {currentError}
          </div>
        )}

        <form
          action={mode === 'signin' ? signInAction : signUpAction}
          className="mt-5 flex flex-col gap-3.5"
        >
          {mode === 'signup' && (
            <>
              <div>
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-[1px] text-[#8d9885]">
                  I AM SIGNING UP AS
                </span>
                <input type="hidden" name="role" value={role} />
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Account role">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'patient'}
                    onClick={() => setRole('patient')}
                    className={`flex flex-col items-start rounded-[15px] border p-3 text-left transition ${
                      role === 'patient'
                        ? 'border-[#8eab76] bg-[#edf4e5] shadow-xs'
                        : 'border-[#e4e9dd] bg-[#fafbf8] hover:border-[#cad6be]'
                    }`}
                  >
                    <span
                      className={`mb-2 grid h-8 w-8 place-items-center rounded-[10px] ${
                        role === 'patient'
                          ? 'bg-[#7d9c64] text-white'
                          : 'bg-[#e9efe2] text-[#738564]'
                      }`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 3C9 2 2 7 5 15s17 5 15-12Z" />
                        <path d="M3 22 15 9" />
                      </svg>
                    </span>
                    <strong className="font-['Manrope'] text-[13px] font-bold text-[#3f543b]">
                      Patient
                    </strong>
                    <span className="mt-0.5 text-[10px] leading-snug text-[#7e8c76]">
                      Daily check-in, games, family tree &amp; journal
                    </span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'caregiver'}
                    onClick={() => setRole('caregiver')}
                    className={`flex flex-col items-start rounded-[15px] border p-3 text-left transition ${
                      role === 'caregiver'
                        ? 'border-[#7da6b5] bg-[#e6f1f4] shadow-xs'
                        : 'border-[#e4e9dd] bg-[#fafbf8] hover:border-[#c2d4da]'
                    }`}
                  >
                    <span
                      className={`mb-2 grid h-8 w-8 place-items-center rounded-[10px] ${
                        role === 'caregiver'
                          ? 'bg-[#6996a7] text-white'
                          : 'bg-[#e3edf0] text-[#668996]'
                      }`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <circle cx="9" cy="8" r="3.5" />
                        <path d="M2.5 20c0-3.8 2.8-6.5 6.5-6.5s6.5 2.7 6.5 6.5" />
                        <path d="M16.5 11a3 3 0 1 1 0 6" />
                        <path d="M21.5 20c0-2.4-1.5-4.3-3.5-5" />
                      </svg>
                    </span>
                    <strong className="font-['Manrope'] text-[13px] font-bold text-[#3b5763]">
                      Caregiver
                    </strong>
                    <span className="mt-0.5 text-[10px] leading-snug text-[#718b94]">
                      Reminders, picture review &amp; care settings
                    </span>
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[1px] text-[#8d9885]">
                  DISPLAY NAME
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder={role === 'caregiver' ? 'e.g. Alex Lewis' : 'e.g. Jamie Lewis'}
                  className="w-full rounded-[13px] border border-[#dfe5d7] bg-[#fafbf8] px-3.5 py-2.5 text-[13px] text-[#354437] outline-none placeholder:text-[#adb6a5] focus:border-[#93ae7d]"
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[1px] text-[#8d9885]">
              EMAIL ADDRESS
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="w-full rounded-[13px] border border-[#dfe5d7] bg-[#fafbf8] px-3.5 py-2.5 text-[13px] text-[#354437] outline-none placeholder:text-[#adb6a5] focus:border-[#93ae7d]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[1px] text-[#8d9885]">
              PASSWORD
            </span>
            <input
              type="password"
              name="password"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              className="w-full rounded-[13px] border border-[#dfe5d7] bg-[#fafbf8] px-3.5 py-2.5 text-[13px] text-[#354437] outline-none placeholder:text-[#adb6a5] focus:border-[#93ae7d]"
            />
          </label>

          {mode === 'signup' && (
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[1px] text-[#8d9885]">
                CONFIRM PASSWORD
              </span>
              <input
                type="password"
                name="confirmPassword"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full rounded-[13px] border border-[#dfe5d7] bg-[#fafbf8] px-3.5 py-2.5 text-[13px] text-[#354437] outline-none placeholder:text-[#adb6a5] focus:border-[#93ae7d]"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 flex min-h-12 w-full items-center justify-center rounded-[14px] bg-[#5f7d4d] px-4 font-['Manrope'] text-[13px] font-bold tracking-[0.4px] text-white shadow-xs transition hover:bg-[#526e41] disabled:opacity-65"
          >
            {isPending
              ? 'Processing...'
              : mode === 'signin'
                ? 'Log in to Releaf'
                : role === 'caregiver'
                  ? 'Create Caregiver account'
                  : 'Create Patient account'}
          </button>
        </form>
      </div>
    </div>
  )
}
