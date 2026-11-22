import { useCallback, useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import OpenStreetMapView from './OpenStreetMapView'
import {
  getPatientLocationPath,
  getRealtimeDb,
  isFirebaseConfigured,
  type PatientLocationPayload,
} from '@/lib/firebase'

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

function buildMapLinks(lat: number, lng: number) {
  return {
    geo: `geo:${lat},${lng}?q=${lat},${lng}`,
  }
}

export default function CaregiverLocationCard({
  patientId,
  patientCode,
  patientName,
}: {
  patientId?: string
  patientCode?: string
  patientName: string
}) {
  const configured = isFirebaseConfigured()
  const [location, setLocation] = useState<PatientLocationPayload | null>(null)
  const [listenError, setListenError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [refreshing, setRefreshing] = useState(false)

  const patientFirstName = patientName.trim().split(/\s+/)[0] || 'Patient'

  // Clock ticker for relative time displays
  useEffect(() => {
    const ticker = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(ticker)
  }, [])

  // ── Channel 1: Local REST API Poller (instant network sync & offline fallback) ──
  const pollServerLocation = useCallback(async () => {
    if (!patientId && !patientCode) return
    try {
      const params = new URLSearchParams()
      if (patientId) params.set('patientId', patientId)
      if (patientCode) params.set('patientCode', patientCode)
      const res = await fetch(`/api/patient-location?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) return
      const json = await res.json()
      if (json.ok && json.location) {
        const val = json.location as PatientLocationPayload
        setLocation((prev) => {
          if (!prev || val.updatedAt >= prev.updatedAt) {
            return val
          }
          return prev
        })
        setNow(Date.now())
      }
    } catch {
      // Ignore background poll errors
    }
  }, [patientId, patientCode])

  // Poll server immediately on mount, focus, and every 3 seconds
  useEffect(() => {
    void pollServerLocation()
    const onFocus = () => void pollServerLocation()
    window.addEventListener('focus', onFocus)
    const interval = window.setInterval(() => void pollServerLocation(), 3000)

    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(interval)
    }
  }, [pollServerLocation])

  // ── Channel 2: Firebase Realtime Database Listener ───────────────────────
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
          const freshLoc: PatientLocationPayload = {
            lat: val.lat,
            lng: val.lng,
            accuracy: typeof val.accuracy === 'number' ? val.accuracy : null,
            heading: typeof val.heading === 'number' ? val.heading : null,
            speed: typeof val.speed === 'number' ? val.speed : null,
            updatedAt: typeof val.updatedAt === 'number' ? val.updatedAt : Date.now(),
            patientName: typeof val.patientName === 'string' ? val.patientName : patientName,
            patientCode: typeof val.patientCode === 'string' ? val.patientCode : undefined,
          }
          setLocation((prev) => (!prev || freshLoc.updatedAt >= prev.updatedAt ? freshLoc : prev))
          setNow(Date.now())
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

  async function handleManualRefresh() {
    setRefreshing(true)
    await pollServerLocation()
    setTimeout(() => setRefreshing(false), 500)
  }

  const isLive = location ? now - location.updatedAt < 120_000 : false
  const mapLinks = location ? buildMapLinks(location.lat, location.lng) : null

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
            <div className="flex items-center gap-2">
              <h3>Live GPS location</h3>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="text-[#7c8b73] hover:text-[#456c35]"
                title="Refresh location"
                aria-label="Refresh location"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={refreshing ? 'animate-spin' : ''}
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>
            </div>
            <p className="ct-panel-sub">Real-time location for {patientFirstName}</p>
          </div>
        </div>

        {location ? (
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
        ) : !configured ? (
          <span className="rounded-full bg-[#f5efe6] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.6px] text-[#8f7253]">
            Setup needed
          </span>
        ) : (
          <span className="rounded-full bg-[#f1f4ec] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.6px] text-[#7d8d72]">
            Waiting
          </span>
        )}
      </div>

      {!configured && !location ? (
        <div className="mt-3 rounded-[14px] border border-dashed border-[#dccfb9] bg-[#fbf8f2] p-4 text-[11px] leading-relaxed text-[#766857]">
          <strong className="block font-['Manrope'] text-[12px] font-bold text-[#5a4c3d]">
            Connect Firebase Realtime Database
          </strong>
          <p className="mt-1">
            Add your Firebase web config to{' '}
            <code className="rounded bg-white px-1 py-0.5 text-[10px]">main-page/.env.local</code>{' '}
            and restart the dev server to enable live GPS tracking.
          </p>
        </div>
      ) : listenError && !location ? (
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
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] bg-[#e3eed6] px-3 py-1.5 text-[11px] font-semibold text-[#486337] hover:bg-[#d8e6c8]"
          >
            Check now
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {/* Live OpenStreetMap embedded view */}
          <OpenStreetMapView
            lat={location.lat}
            lng={location.lng}
            patientName={patientFirstName}
            accuracy={location.accuracy}
          />

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
            <div>
              <a
                href={mapLinks?.geo}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-[10px] bg-[#567a42] px-3.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#476836]"
                title="Open in default phone maps app"
              >
                Maps App ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
