import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * Same-origin map tile proxy for OpenStreetMap tiles.
 *
 * Why this is needed:
 * Android WebViews operating on local Wi-Fi or USB adb reverse often have restricted
 * direct DNS access to external third-party tile domains (causing ERR_NAME_NOT_RESOLVED).
 *
 * By fetching tiles through this Next.js route:
 * 1. The request stays on the same local origin (e.g. http://localhost:3000/api/map-tile?z=16&x=...&y=...)
 * 2. The host machine (which has full internet access) fetches the OpenStreetMap tile
 * 3. Tiles are cached in memory for smooth panning without refetching
 */
const tileCache = new Map<string, { buffer: ArrayBuffer; contentType: string; ts: number }>()
const MAX_CACHE_SIZE = 400

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const z = searchParams.get('z')
  const x = searchParams.get('x')
  const y = searchParams.get('y')

  if (!z || !x || !y) {
    return new NextResponse('Missing tile coordinates (z, x, y)', { status: 400 })
  }

  const cleanY = y.replace(/\.png$/, '')
  const cacheKey = `${z}/${x}/${cleanY}`

  const cached = tileCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < 86400000) {
    return new NextResponse(cached.buffer, {
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  }

  // Round-robin tile servers
  const subdomains = ['a', 'b', 'c']
  const sub = subdomains[Math.abs(parseInt(x, 10) + parseInt(cleanY, 10)) % subdomains.length]
  const tileUrl = `https://${sub}.tile.openstreetmap.org/${z}/${x}/${cleanY}.png`

  try {
    const res = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'ReleafApp/1.0 (Family Care Health Assistant; contact@releaf.local)',
      },
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      return new NextResponse(`Tile server error: ${res.status}`, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/png'
    const buffer = await res.arrayBuffer()

    if (tileCache.size >= MAX_CACHE_SIZE) {
      const firstKey = tileCache.keys().next().value
      if (firstKey) tileCache.delete(firstKey)
    }
    tileCache.set(cacheKey, { buffer, contentType, ts: Date.now() })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (err) {
    console.warn(`[map-tile] Failed to fetch tile ${cacheKey}:`, err)
    return new NextResponse('Tile fetch timeout or network error', { status: 504 })
  }
}
