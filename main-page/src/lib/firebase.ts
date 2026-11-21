import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getDatabase, type Database } from 'firebase/database'

export type PatientLocationPayload = {
  lat: number
  lng: number
  accuracy: number | null
  heading: number | null
  speed: number | null
  updatedAt: number
  patientName: string
  patientCode?: string
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.databaseURL && (firebaseConfig.apiKey || firebaseConfig.projectId))
}

let cachedDb: Database | null = null

export function getRealtimeDb(): Database | null {
  if (!isFirebaseConfigured()) return null
  if (cachedDb) return cachedDb

  const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  cachedDb = getDatabase(app)
  return cachedDb
}

export function getPatientLocationPath(patientId: string): string {
  // Firebase RTDB keys cannot contain . $ # [ ] /
  const safeId = patientId.replace(/[.$#[\]/]/g, '_')
  return `locations/${safeId}`
}
