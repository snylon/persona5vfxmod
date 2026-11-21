/**
 * /api/detect — Next.js Route Handler
 *
 * Proxies image + target label to the Python YOLO sidecar so the sidecar URL
 * never appears in client-side JavaScript.
 *
 * Request  POST { image: string; target: string }
 *   image  — base64 data-URL from FileReader (e.g. "data:image/jpeg;base64,…")
 *   target — the prompt object name the game is currently showing
 *
 * Response { matched: boolean; detected: string | null; all: string[]; confidence: number | null; error: string | null }
 */

import { NextResponse } from 'next/server'

export function POST() {
  return NextResponse.json(
    { error: 'Object detection is disabled for Picture Day.' },
    { status: 410 },
  )
}
