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

import { NextRequest, NextResponse } from 'next/server'

const SIDECAR_URL = process.env.YOLO_SIDECAR_URL ?? 'http://127.0.0.1:8000'

export async function POST(req: NextRequest) {
  // ── 1. Parse and validate the request body ────────────────────────────
  let body: { image?: unknown; target?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { image, target } = body
  if (typeof image !== 'string' || image.trim() === '') {
    return NextResponse.json({ error: 'Missing required field: image.' }, { status: 400 })
  }
  if (typeof target !== 'string' || target.trim() === '') {
    return NextResponse.json({ error: 'Missing required field: target.' }, { status: 400 })
  }

  // ── 2. Forward to the Python sidecar ─────────────────────────────────
  let sidecarData: {
    success: boolean
    main_object: string | null
    all_objects: string[]
    confidence: number | null
    error: string | null
  }

  try {
    const sidecarRes = await fetch(`${SIDECAR_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
      // Abort after 15 s so the game never hangs indefinitely
      signal: AbortSignal.timeout(15_000),
    })

    if (!sidecarRes.ok) {
      const text = await sidecarRes.text()
      return NextResponse.json(
        { error: `Detection service error (${sidecarRes.status}): ${text}` },
        { status: 502 },
      )
    }

    sidecarData = await sidecarRes.json()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Could not reach detection service: ${message}` },
      { status: 503 },
    )
  }

  // ── 3. Propagate detection errors from the sidecar ───────────────────
  if (!sidecarData.success) {
    return NextResponse.json({
      matched: false,
      detected: null,
      all: [],
      confidence: null,
      error: sidecarData.error ?? 'Detection failed.',
    })
  }

  // ── 4. Match the top detected object against the prompted target ──────
  const matched = checkMatch(target.toLowerCase().trim(), sidecarData.all_objects)

  return NextResponse.json({
    matched,
    detected: sidecarData.main_object,
    all: sidecarData.all_objects,
    confidence: sidecarData.confidence,
    error: null,
  })
}

// ---------------------------------------------------------------------------
// Matching logic
// ---------------------------------------------------------------------------
// YOLO11n is trained on 80 MS-COCO classes.  The game prompts use plain English
// names that don't always match COCO class names exactly, so we map each prompt
// object to every COCO label that counts as a valid match.
// ---------------------------------------------------------------------------

const MATCH_MAP: Record<string, string[]> = {
  // indoor prompts
  cup:   ['cup'],
  pen:   ['pen', 'pencil'],
  coat:  ['tie', 'jacket', 'coat', 'handbag', 'backpack', 'suitcase'],
  // outdoor prompts
  tree:  ['potted plant', 'plant', 'tree'],
  shoes: ['shoe', 'shoes', 'sneaker', 'boot', 'sandal',
          'sports shoes', 'oxford shoe', 'leather shoe'],
  ball:  ['sports ball', 'ball', 'frisbee'],
}

function checkMatch(target: string, detected: string[]): boolean {
  if (detected.length === 0) return false

  const synonyms = MATCH_MAP[target] ?? [target]
  const normalised = detected.map((d) => d.toLowerCase())

  return synonyms.some((synonym) =>
    normalised.some((d) => d === synonym || d.includes(synonym) || synonym.includes(d)),
  )
}
