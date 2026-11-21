'use client'

import { useEffect, useRef } from 'react'
import { ref, set } from 'firebase/database'
import {
  getPatientLocationPath,
  getRealtimeDb,
  type PatientLocationPayload,
} from '@/lib/firebase'

const MIN_WRITE_INTERVAL_MS = 3000

/**
 * Silent background GPS reporter for linked patient accounts.
 * Renders nothing so the patient never sees any GPS tracking UI.
 */
export default function PatientLocationReporter({
  patientId,
  patientName,
  patientCode,
  enabled,
}: {
  patientId: string
  patientName: string
  patientCode?: string
  enabled: boolean
}) {
  const lastSentAtRef = useRef(0)

  useEffect(() => {
    if (!enabled || !patientId) return
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return

    const db = getRealtimeDb()
    if (!db) return

    const locationRef = ref(db, getPatientLocationPath(patientId))

    const pushPosition = (position: GeolocationPosition, force = false) => {
      const now = Date.now()
      if (!force && now - lastSentAtRef.current < MIN_WRITE_INTERVAL_MS) return
      lastSentAtRef.current = now

      const payload: PatientLocationPayload = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy:
          typeof position.coords.accuracy === 'number' && Number.isFinite(position.coords.accuracy)
            ? Math.round(position.coords.accuracy)
            : null,
        heading:
          typeof position.coords.heading === 'number' && Number.isFinite(position.coords.heading)
            ? position.coords.heading
            : null,
        speed:
          typeof position.coords.speed === 'number' && Number.isFinite(position.coords.speed)
            ? position.coords.speed
            : null,
        updatedAt: now,
        patientName,
        ...(patientCode ? { patientCode } : {}),
      }

      void set(locationRef, payload).catch(() => {
        // Keep patient experience completely silent if Firebase write fails
      })
    }

    // Grab an immediate initial fix, then stream live movement updates
    navigator.geolocation.getCurrentPosition(
      (pos) => pushPosition(pos, true),
      () => {
        // Silent failure on patient side
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )

    const watchId = navigator.geolocation.watchPosition(
      (pos) => pushPosition(pos),
      () => {
        // Silent failure on patient side
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [enabled, patientId, patientName, patientCode])

  return null
}
