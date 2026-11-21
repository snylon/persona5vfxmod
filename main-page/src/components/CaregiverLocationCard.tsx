'use client'

import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import {
  getPatientLocationPath,
  getRealtimeDb,
  isFirebaseConfigured,
  type PatientLocationPayload,
} from '@/lib/firebase'

function buildOsmEmbedUrl(lat: number, lng: number) {
  const delta = 0.0045
  const minLng = (lng - delta).toFixed(6)
  const minLat = (lat - delta).toFixed(6)
  const maxLng = (lng + delta).toFixed(6)
  const maxLat = (lat + delta).toFixed(6)
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat.toFixed(6)}%2C${lng.toFixed(6)}`
}

function formatRelativeTime(timestamp: number, now: number) {
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (diffSec < 10) return 'Updated just now'
  if (diffSec < 60) return `Updated ${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `Updated ${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Updated ${diffHr}h ago`
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export default function CaregiverLocationCard({
  patientId,
  patientName,
}: {
  patientId?: string
  patientName: string
}) {
  const configured = isFirebaseConfigured()
  const [location, setLocation] = useState<PatientLocationPayload | null>(null)
  const [listenError, setListenError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  const patientFirstName = patientName.trim().split(/\s+/)[0] || 'Patient'

  useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(ticker)
  }, [])

  useEffect(() => {
    if (!configured || !patientId) return
    const db = getRealtimeDb()
    if (!db) return

    setListenError('')
    const locationRef = ref(db, getPatientLocationPath(patientId))

    const unsubscribe = onValue(
      locationRef,
      (snapshot) => {
        const val = snapshot.val() as Partial<PatientLocationPayload> | null
        if (val && typeof val.lat === 'number' && typeof val.lng === 'number') {
          setLocation({
            lat: val.lat,
            lng: val.lng,
            accuracy: typeof val.accuracy === 'number' ? val.accuracy : null,
            heading: typeof val.heading === 'number' ? val.heading : null,
            speed: typeof val.speed === 'number' ? val.speed : null,
            updatedAt: typeof val.updatedAt === 'number' ? val.updatedAt : Date.now(),
            patientName: typeof val.patientName === 'string' ? val.patientName : patientName,
            patientCode: typeof val.patientCode === 'string' ? val.patientCode : undefined,
          })
          setNow(Date.now())
        } else {
          setLocation(null)
        }
      },
      (error) => {
        setListenError(error.message || 'Unable to read live location from Firebase.')
      },
    )

    return () => {
      unsubscribe()
    }
  }, [configured, patientId, patientName])

  const isLive = location ? now - location.updatedAt < 120_000 : false

  return (
    <div className="ct-panel">
      <div className="ct-panel-top">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#eef5e6] text-[#5c7c48]">
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
              <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" />
              <circle cx="12" cy="11" r="2.2" />
            </svg>
          </span>
          <div>
            <h3>Live GPS location</h3>
            <p className="ct-panel-sub">Real-time location for {patientFirstName}</p>
          </div>
        </div>

        {!configured ? (
          <span className="rounded-full bg-[#f5efe6] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.6px] text-[#8f7253]">
            Setup needed
          </span>
        ) : location ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.6px] ${
              isLive ? 'bg-[#e7f3dc] text-[#456c35]' : 'bg-[#f2f0ea] text-[#7c7b70]'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isLive ? 'animate-pulse bg-[#568c3e]' : 'bg-[#9a998c]'
              }`}
              aria-hidden="true"
            />
            {isLive ? 'Live' : 'Last seen'}
          </span>
        ) : (
          <span className="rounded-full bg-[#f1f4ec] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.6px] text-[#7d8d72]">
            Waiting
          </span>
        )}
      </div>

      {!configured ? (
        <div className="mt-3 rounded-[14px] border border-dashed border-[#dccfb9] bg-[#fbf8f2] p-4 text-[11px] leading-relaxed text-[#766857]">
          <strong className="block font-['Manrope'] text-[12px] font-bold text-[#5a4c3d]">
            Connect Firebase Realtime Database
          </strong>
          <p className="mt-1">
            Add your Firebase web config (including{' '}
            <code className="rounded bg-white px-1 py-0.5 text-[10px]">
              NEXT_PUBLIC_FIREBASE_DATABASE_URL
            </code>
            ) to <code className="rounded bg-white px-1 py-0.5 text-[10px]">main-page/.env.local</code>{' '}
            and restart the dev server to enable live GPS tracking.
          </p>
        </div>
      ) : listenError ? (
        <div className="mt-3 rounded-[14px] border border-[#ebd2d5] bg-[#fdf4f5] p-3.5 text-[11px] text-[#945158]">
          {listenError}
        </div>
      ) : !location ? (
        <div className="mt-3 rounded-[14px] border border-dashed border-[#d9e2ce] bg-[#f8faf4] px-4 py-6 text-center">
          <p className="text-[12px] font-semibold text-[#50634a]">
            Waiting for {patientFirstName}&rsquo;s location…
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#83917b]">
            Once {patientFirstName} opens Releaf and allows location access on their device, their
            live position will stream here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="overflow-hidden rounded-[16px] border border-[#dfe6d6] bg-[#eef2e8]">
            <iframe
              title={`${patientFirstName}'s live GPS map`}
              src={buildOsmEmbedUrl(location.lat, location.lng)}
              className="h-[220px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[13px] border border-[#e6ebe0] bg-[#fafbf8] px-3.5 py-2.5 text-[11px]">
            <div>
              <strong className="block font-['Manrope'] text-[12px] font-bold text-[#3f523d]">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </strong>
              <small className="block text-[10px] text-[#808d78]">
                {formatRelativeTime(location.updatedAt, now)}
                {location.accuracy !== null ? ` · ±${location.accuracy} m` : ''}
              </small>
            </div>
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 items-center gap-1 rounded-[10px] bg-[#5f7d4d] px-3 text-[11px] font-semibold text-white hover:bg-[#526e41]"
            >
              Open in Maps ↗
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
