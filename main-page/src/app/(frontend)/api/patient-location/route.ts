import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'

export const dynamic = 'force-dynamic'

export type StoredPatientLocation = {
  patientId: string
  patientCode?: string
  patientName: string
  lat: number
  lng: number
  accuracy: number | null
  speed: number | null
  heading: number | null
  updatedAt: number
  source?: string
}

const DATA_DIR = path.join(process.cwd(), '.data')
const LOCATIONS_FILE = path.join(DATA_DIR, 'patient-locations.json')

// In-memory cache for instant low-latency reads
const memoryLocationCache = new Map<string, StoredPatientLocation>()

async function readLocationsFile(): Promise<Record<string, StoredPatientLocation>> {
  try {
    const raw = await fs.readFile(LOCATIONS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

async function writeLocationsFile(data: Record<string, StoredPatientLocation>): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.writeFile(LOCATIONS_FILE, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.error('[patient-location] Error writing locations file:', err)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const patientId = searchParams.get('patientId')
  const patientCode = searchParams.get('patientCode')
  const action = searchParams.get('action')

  // IP Geolocation fallback when requested by a device without GPS hardware / insecure context
  if (action === 'ip_fallback') {
    try {
      const forwarded = request.headers.get('x-forwarded-for')
      const clientIp = forwarded ? forwarded.split(',')[0].trim() : ''
      const isLocal =
        !clientIp ||
        clientIp === '127.0.0.1' ||
        clientIp === '::1' ||
        clientIp.startsWith('192.168.') ||
        clientIp.startsWith('10.')

      const targetUrl = isLocal ? 'https://ipwho.is/' : `https://ipwho.is/${clientIp}`
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(3500) })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          return NextResponse.json({
            ok: true,
            location: {
              lat: data.latitude,
              lng: data.longitude,
              accuracy: 5000,
              heading: null,
              speed: null,
              updatedAt: Date.now(),
              source: 'ip_fallback',
            },
          })
        }
      }
    } catch {
      // Fallback failed silently
    }
    return NextResponse.json({ ok: false, error: 'IP fallback unavailable' }, { status: 404 })
  }

  if (!patientId && !patientCode) {
    return NextResponse.json(
      { ok: false, error: 'Missing patientId or patientCode' },
      { status: 400 },
    )
  }

  // 1. Check in-memory cache
  if (patientId && memoryLocationCache.has(patientId)) {
    return NextResponse.json({
      ok: true,
      location: memoryLocationCache.get(patientId),
    })
  }
  if (patientCode && memoryLocationCache.has(patientCode)) {
    return NextResponse.json({
      ok: true,
      location: memoryLocationCache.get(patientCode),
    })
  }

  // 2. Check disk file
  const stored = await readLocationsFile()
  const loc =
    (patientId && stored[patientId]) || (patientCode && stored[patientCode]) || null

  if (loc) {
    if (patientId) memoryLocationCache.set(patientId, loc)
    if (patientCode) memoryLocationCache.set(patientCode, loc)
    return NextResponse.json({ ok: true, location: loc })
  }

  return NextResponse.json({ ok: true, location: null })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      patientId,
      patientCode,
      patientName,
      lat,
      lng,
      accuracy,
      speed,
      heading,
      updatedAt,
      source,
    } = body

    if (!patientId || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload: patientId, lat, and lng are required' },
        { status: 400 },
      )
    }

    const record: StoredPatientLocation = {
      patientId,
      patientCode: typeof patientCode === 'string' ? patientCode : undefined,
      patientName: typeof patientName === 'string' ? patientName : 'Patient',
      lat,
      lng,
      accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null,
      speed: typeof speed === 'number' && Number.isFinite(speed) ? speed : null,
      heading: typeof heading === 'number' && Number.isFinite(heading) ? heading : null,
      updatedAt: typeof updatedAt === 'number' ? updatedAt : Date.now(),
      source: typeof source === 'string' ? source : 'gps',
    }

    // Update in-memory cache
    memoryLocationCache.set(patientId, record)
    if (patientCode) {
      memoryLocationCache.set(patientCode, record)
    }

    // Persist to disk
    const stored = await readLocationsFile()
    stored[patientId] = record
    if (patientCode) {
      stored[patientCode] = record
    }
    await writeLocationsFile(stored)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[patient-location] POST error:', error)
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
