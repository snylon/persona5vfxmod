'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { hashPassword, verifyPassword } from '@/lib/crypto'
import {
  createUser,
  findUserByEmail,
  SESSION_COOKIE_NAME,
  type SessionUser,
  type UserRole,
} from '@/lib/auth-store'

export type AuthActionState = {
  success: boolean
  error: string | null
}

async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  })
}

export async function registerUserAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')
  const rawRole = String(formData.get('role') ?? '').trim()

  if (!name || !email || !password || !confirmPassword) {
    return { success: false, error: 'All fields are required.' }
  }

  if (rawRole !== 'caregiver' && rawRole !== 'patient') {
    return { success: false, error: 'Please select whether you are a Caregiver or a Patient.' }
  }
  const role: UserRole = rawRole

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' }
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' }
  }

  try {
    const existing = await findUserByEmail(email)
    if (existing) {
      return { success: false, error: 'A user with this email already exists.' }
    }

    const hashedPassword = hashPassword(password)
    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      role,
    })

    await setSessionCookie({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      patientCode: user.patientCode,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return { success: false, error: 'An unexpected error occurred while creating your account.' }
  }

  redirect('/')
}

export async function signInUserAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  try {
    const user = await findUserByEmail(email)
    if (!user) {
      return { success: false, error: 'Invalid email or password.' }
    }

    const isValid = verifyPassword(password, user.password)
    if (!isValid) {
      return { success: false, error: 'Invalid email or password.' }
    }

    await setSessionCookie({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      patientCode: user.patientCode,
    })
  } catch (error) {
    console.error('Sign-in error:', error)
    return { success: false, error: 'An unexpected error occurred while signing in.' }
  }

  redirect('/')
}

export async function signOutUserAction() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  redirect('/sign-in')
}
