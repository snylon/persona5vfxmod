'use client'

import { useEffect, useRef } from 'react'
import { ref, set } from 'firebase/database'
import {
  getPatientLocationPath,
  getRealtimeDb,
  type PatientLocationPayload,
} from '@/lib/firebase'

const MIN_WRITE_INTERVAL_MS = 2500

interface NativeBridge {
  registerPatient?: (id: string, code?: string, name?: string) => void
  getLatestLocation?: () => string | null
}

/**
 * High-reliability background GPS reporter for patient accounts.
 *
 * Uses a dual-channel architecture:
 * 1. Hardware GPS streaming via ReleafBridge native Android interface (bypasses browser secure-context rules)
 * 2. Standard W3C Geolocation API fallback
 *
 * Replicates live coordinates to both:
 * - Firebase Realtime Database (for sub-second cross-device websockets)
 * - /api/patient-location (for reliable REST persistence and local network polling)
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
    if (!enabled || !patientId || typeof window === 'undefined') return

    const db = getRealtimeDb()
    const locationRef = db ? ref(db, getPatientLocationPath(patientId)) : null

    const pushCoords = (
      lat: number,
      lng: number,
      accuracy: number | null,
      heading: number | null,
      speed: number | null,
      force = false,
      source = 'gps',
    ) => {
      const now = Date.now()
      if (!force && now - lastSentAtRef.current < MIN_WRITE_INTERVAL_MS) return
      lastSentAtRef.current = now

      const payload: PatientLocationPayload & { patientId: string; source: string } = {
        patientId,
        lat,
        lng,
        accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) ? Math.round(accuracy) : null,
        heading: typeof heading === 'number' && Number.isFinite(heading) ? heading : null,
        speed: typeof speed === 'number' && Number.isFinite(speed) ? speed : null,
        updatedAt: now,
        patientName,
        source,
        ...(patientCode ? { patientCode } : {}),
      }

      // 1. Sync to Firebase Realtime Database
      if (locationRef) {
        void set(locationRef, payload).catch(() => {})
      }

      // 2. Sync to local REST API
      void fetch('/api/patient-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})
    }

    // ── Channel A: Native Android ReleafBridge ──────────────────────────────
    const bridge = (window as unknown as { ReleafBridge?: NativeBridge }).ReleafBridge
    if (bridge) {
      bridge.registerPatient?.(patientId, patientCode, patientName)

      // Query any cached fix immediately
      const rawLatest = bridge.getLatestLocation?.()
      if (rawLatest) {
        try {
          const parsed = JSON.parse(rawLatest)
          if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            pushCoords(
              parsed.lat,
              parsed.lng,
              parsed.accuracy ?? null,
              parsed.heading ?? null,
              parsed.speed ?? null,
              true,
              'native_cached',
            )
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Register live native update handler
      ;(window as unknown as {
        __onNativeLocation?: (
          lat: number,
          lng: number,
          accuracy: number | null,
          speed: number | null,
          heading: number | null,
          time: number,
        ) => void
      }).__onNativeLocation = (lat, lng, accuracy, speed, heading) => {
        pushCoords(lat, lng, accuracy, heading, speed, false, 'native_gps')
      }
    }

    // ── Channel B: Standard Web Geolocation (HTTPS / localhost fallback) ───
    let watchId: number | null = null
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          pushCoords(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
            pos.coords.heading,
            pos.coords.speed,
            true,
            'web_gps',
          )
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      )

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          pushCoords(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
            pos.coords.heading,
            pos.coords.speed,
            false,
            'web_gps',
          )
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      )
    }

    return () => {
      if (watchId !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId)
      }
      delete (window as unknown as { __onNativeLocation?: unknown }).__onNativeLocation
    }
  }, [enabled, patientId, patientName, patientCode])

  return null
}
