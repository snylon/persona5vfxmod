'use client'

/**
 * Picture Day game — all logic lives here, in a plain component file.
 *
 * Pictures taken by the patient are sent straight to the linked caregiver's
 * Pictures tab for review. The patient never sees a preview or gallery of
 * taken pictures, and must wait for caregiver approval before advancing to
 * the next prompt.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  PatientPictureState,
  PictureDayMode,
  PictureDayPrompt,
} from '@/lib/picture-day-store'

// ─────────────────────────────────────────────────────────────────────────────
// Prompt data
// ─────────────────────────────────────────────────────────────────────────────

const INDOOR_PROMPTS = [
  { object: 'cup', title: 'Find a cup', guidance: 'Keep the whole cup in view.' },
  { object: 'pen', title: 'Find a pen', guidance: 'Or a pencil — close enough.' },
  { object: 'coat', title: 'Find a coat', guidance: 'Hanging up or laid out.' },
  { object: 'book', title: 'Find a book', guidance: 'Show the cover clearly.' },
  { object: 'lamp', title: 'Find a lamp', guidance: 'Any room lamp will do.' },
  { object: 'clock', title: 'Find a clock', guidance: 'Wall or table clock — either works.' },
  { object: 'phone', title: 'Find a phone', guidance: 'A mobile or landline.' },
  { object: 'pillow', title: 'Find a pillow', guidance: 'On a bed, sofa, or chair.' },
  { object: 'mug', title: 'Find a mug', guidance: 'Handle in view if you can.' },
  { object: 'chair', title: 'Find a chair', guidance: 'Capture the whole chair.' },
  { object: 'mirror', title: 'Find a mirror', guidance: "Angle it so you're not in the shot." },
  { object: 'plant', title: 'Find a plant', guidance: 'Indoors — a pot plant or cutting.' },
  { object: 'remote', title: 'Find a TV remote', guidance: 'Lay it flat and photograph from above.' },
  { object: 'glasses', title: 'Find a pair of glasses', guidance: 'Reading or sunglasses both count.' },
  { object: 'spoon', title: 'Find a spoon', guidance: 'Any size, clean and in focus.' },
  { object: 'towel', title: 'Find a towel', guidance: 'Folded or hanging — your choice.' },
  { object: 'candle', title: 'Find a candle', guidance: 'Lit or unlit, any shape.' },
  { object: 'bag', title: 'Find a bag', guidance: 'Handbag, backpack, or tote.' },
  { object: 'umbrella', title: 'Find an umbrella', guidance: 'Open or closed, indoors.' },
  { object: 'bottle', title: 'Find a bottle', guidance: 'Water bottle, vase, or similar.' },
  { object: 'keyring', title: 'Find a set of keys', guidance: 'Lay them flat on a surface.' },
  { object: 'hat', title: 'Find a hat', guidance: 'Cap, beanie, or sun hat.' },
] as const

const OUTDOOR_PROMPTS = [
  { object: 'tree', title: 'Find a tree', guidance: 'Find one nearby and photograph it.' },
  { object: 'shoes', title: 'Find a pair of shoes', guidance: 'Place both shoes side by side.' },
  { object: 'ball', title: 'Find a ball', guidance: 'Any size or sport will do.' },
  { object: 'flower', title: 'Find a flower', guidance: 'Get close so the petals are clear.' },
  { object: 'bench', title: 'Find a bench', guidance: 'Park bench or garden seat.' },
  { object: 'cloud', title: 'Photograph a cloud', guidance: 'Point the camera at the sky.' },
  { object: 'fence', title: 'Find a fence', guidance: 'Any material — wood, iron, hedge.' },
  { object: 'bird', title: 'Find a bird', guidance: 'In a tree, on a wire, or on the ground.' },
  { object: 'puddle', title: 'Find a puddle', guidance: 'Or any small body of water outdoors.' },
  { object: 'bicycle', title: 'Find a bicycle', guidance: 'Parked or in motion — your call.' },
  { object: 'sign', title: 'Find a street sign', guidance: 'Road name, direction, or notice.' },
  { object: 'steps', title: 'Find a set of steps', guidance: 'Stairs, curb steps, or garden steps.' },
  { object: 'leaf', title: 'Find a fallen leaf', guidance: 'On the ground, any colour.' },
  { object: 'car', title: 'Find a car', guidance: 'Parked on the street or in a lot.' },
  { object: 'shadow', title: 'Photograph a shadow', guidance: 'Your own shadow or any other.' },
  { object: 'door', title: 'Find a colourful door', guidance: 'Any front door that stands out.' },
  { object: 'window', title: 'Find a window', guidance: "A building's window from outside." },
  { object: 'bin', title: 'Find a bin', guidance: 'Rubbish or recycling bin.' },
  { object: 'postbox', title: 'Find a postbox', guidance: 'Or a letterbox on a gate or wall.' },
  { object: 'bridge', title: 'Find a bridge', guidance: 'Even a small footbridge counts.' },
  { object: 'grass', title: 'Photograph some grass', guidance: 'Fill the frame with the ground.' },
  { object: 'stone', title: 'Find an interesting stone', guidance: 'Pick it up or photograph it in place.' },
] as const

const ALL_PROMPTS = [...INDOOR_PROMPTS, ...OUTDOOR_PROMPTS] as const

type ObjectName = (typeof ALL_PROMPTS)[number]['object']
type Mode = PictureDayMode

// Each round of Picture Day serves a fixed number of prompts. Patients can
// start another round (another set of prompts) once the current one is done.
const PROMPTS_PER_ROUND = 3

const MAX_PHOTO_DIMENSION = 960
const PHOTO_JPEG_QUALITY = 0.78

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read file'))
    })
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

async function compressPictureFile(file: File): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file)
  if (file.type === 'image/svg+xml' || file.size < 180_000) {
    return rawDataUrl
  }

  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          MAX_PHOTO_DIMENSION / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
        )
        const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale))
        const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(rawDataUrl)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY)
        resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl)
      } catch {
        resolve(rawDataUrl)
      }
    }
    img.onerror = () => resolve(rawDataUrl)
    img.src = rawDataUrl
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — restores active session or shows setting menu
// ─────────────────────────────────────────────────────────────────────────────

export function PictureDayRoot({
  requireApproval,
  onNotify,
}: {
  onComplete?: () => void
  requireApproval?: (
    mode: Mode,
    onApprove: () => void,
    onDeny: () => void,
    onCancel: () => void,
  ) => void
  onNotify?: (msg: string) => void
}) {
  const [pictureState, setPictureState] = useState<PatientPictureState | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingMode, setPendingMode] = useState<Mode | null>(null)
  const [denied, setDenied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [menuError, setMenuError] = useState('')
  const restartingRef = useRef(false)

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/picture-day', { cache: 'no-store' })
      const data = (await res.json()) as {
        ok?: boolean
        state?: PatientPictureState
        error?: string
      }
      if (data.ok && data.state) {
        setPictureState(data.state)
      }
    } catch {
      // Ignore transient errors while polling
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshState()
  }, [refreshState])

  async function beginSession(selectedMode: Mode) {
    setMenuError('')
    setStarting(true)
    try {
      const prompts: PictureDayPrompt[] = shuffle(
        (selectedMode === 'indoors' ? INDOOR_PROMPTS : OUTDOOR_PROMPTS).map((p) => ({
          object: p.object,
          title: p.title,
          guidance: p.guidance,
        })),
      ).slice(0, PROMPTS_PER_ROUND)
      const res = await fetch('/picture-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', mode: selectedMode, prompts }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        state?: PatientPictureState
        error?: string
      }
      if (!res.ok || !data.ok || !data.state?.session) {
        setMenuError(data.error || 'Could not start Picture Day. Please try again.')
        setPendingMode(null)
        return
      }
      setPictureState(data.state)
      setPendingMode(null)
    } catch {
      setMenuError('Could not connect to the server. Please refresh and try again.')
      setPendingMode(null)
    } finally {
      setStarting(false)
    }
  }

  function handleModeSelect(selectedMode: Mode) {
    if (selectedMode === 'outdoors' && requireApproval) {
      setPendingMode(selectedMode)
      setDenied(false)
      requireApproval(
        selectedMode,
        () => {
          void beginSession(selectedMode)
        },
        () => {
          setDenied(true)
          setTimeout(() => {
            setPendingMode(null)
            setDenied(false)
          }, 2000)
        },
        // onCancel: leave the waiting screen without showing "denied" — used
        // when the request could not be created (e.g. not linked) or the
        // patient backed out.
        () => {
          setPendingMode(null)
          setDenied(false)
        },
      )
    } else {
      void beginSession(selectedMode)
    }
  }

  // Start another round of the same mode without leaving the game. Outdoors
  // approval is only required when first entering that mode; once cleared,
  // repeat rounds skip the gate.
  async function handlePlayAgain() {
    const mode = pictureState?.session?.mode
    if (!mode || restartingRef.current) return
    restartingRef.current = true
    try {
      await beginSession(mode)
    } finally {
      restartingRef.current = false
    }
  }

  // End the current round and return to the Indoors/Outdoors menu, but keep the
  // Picture Day game open. The shell's close button still exits the game fully.
  async function handleExitToMenu() {
    try {
      const res = await fetch('/picture-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })
      const data = (await res.json()) as { ok?: boolean; state?: PatientPictureState }
      if (data.ok && data.state) {
        setPictureState(data.state)
      } else {
        setPictureState({
          session: null,
          currentSubmissionStatus: 'none',
          approvedPromptIndices: [],
        })
      }
    } catch {
      setPictureState({
        session: null,
        currentSubmissionStatus: 'none',
        approvedPromptIndices: [],
      })
    }
  }

  if (loading) {
    return (
      <>
        <style>{pictureDayStyles}</style>
        <section className="picture-day">
          <div className="picture-day__approval">
            <span className="picture-day__spinner picture-day__spinner--lg" aria-hidden="true" />
            <strong>Loading Picture Day…</strong>
            <span>Checking your latest prompts.</span>
          </div>
        </section>
      </>
    )
  }

  if (pendingMode === 'outdoors') {
    return (
      <>
        <style>{pictureDayStyles}</style>
        <section className="picture-day">
          <div className="picture-day__approval">
            {denied ? (
              <>
                <span className="picture-day__approval-icon picture-day__approval-icon--denied">
                  ✗
                </span>
                <strong>Request denied</strong>
                <span>The caretaker did not approve outdoor mode.</span>
              </>
            ) : (
              <>
                <span className="picture-day__approval-icon">⏱</span>
                <strong>Waiting for approval</strong>
                <span>The caretaker needs to approve outdoor mode before you can start.</span>
              </>
            )}
          </div>
        </section>
      </>
    )
  }

  if (!pictureState?.session) {
    return <PictureDayMenu onSelect={handleModeSelect} disabled={starting} error={menuError} />
  }

  return (
    <PictureDayGame
      state={pictureState}
      onStateChange={setPictureState}
      onRefresh={refreshState}
      onPlayAgain={handlePlayAgain}
      onExitToMenu={handleExitToMenu}
      onNotify={onNotify}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu
// ─────────────────────────────────────────────────────────────────────────────

function PictureDayMenu({
  onSelect,
  disabled,
  error,
}: {
  onSelect: (mode: Mode) => void
  disabled?: boolean
  error?: string
}) {
  return (
    <>
      <style>{pictureDayStyles}</style>
      <section className="picture-day">
        <div className="picture-day__menu">
          <p className="picture-day__menu-heading">Where are you?</p>
          <p className="picture-day__menu-sub">Choose your setting to get matching prompts.</p>
          <div className="picture-day__menu-options">
            <button
              type="button"
              disabled={disabled}
              className="picture-day__menu-option"
              onClick={() => onSelect('indoors')}
            >
              <span className="picture-day__menu-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 120 130"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 60L60 20l40 40v50H20V60Z" />
                  <path d="M44 110V80h32v30" />
                </svg>
              </span>
              <strong>Indoors</strong>
            </button>

            <button
              type="button"
              disabled={disabled}
              className="picture-day__menu-option"
              onClick={() => onSelect('outdoors')}
            >
              <span className="picture-day__menu-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 120 130"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="60" cy="45" r="18" />
                  <path d="M60 17v-8M60 81v-8M32 45h-8M96 45h-8M40 25l-6-6M86 71l-6-6M86 25l6-6M40 71l6-6" />
                  <line x1="10" y1="96" x2="110" y2="96" />
                  <path d="M28 96v-12M60 96v-16M92 96v-12" />
                </svg>
              </span>
              <strong>Outdoors</strong>
            </button>
          </div>
          {error && (
            <p role="alert" className="picture-day__error-msg">
              {error}
            </p>
          )}
        </div>
        <p className="picture-day__privacy">
          Each picture is sent directly to your caregiver for review.
        </p>
      </section>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG prompt icons
// ─────────────────────────────────────────────────────────────────────────────

function PromptIcon({ object }: { object: string }) {
  const drawings: Record<ObjectName, React.ReactNode> = {
    // ── existing icons ──────────────────────────────────────────────────────
    cup: (
      <>
        <path d="M39 45h42v35c0 12-8 20-20 20h-2c-12 0-20-8-20-20V45Z" />
        <path d="M81 50h7c10 0 17 7 17 16s-7 16-17 16h-7M50 35v-7m18 7v-7" />
      </>
    ),
    tree: (
      <>
        <path d="M60 100v24M50 124h20" />
        <path d="M20 100L60 46l40 54H20Z" />
        <path d="M28 62L60 14l32 48H28Z" />
      </>
    ),
    ball: (
      <>
        <circle cx="60" cy="65" r="44" />
        <path d="M16 65h88" />
        <path d="M60 21v88" />
        <path d="M20 44Q60 56 100 44" />
        <path d="M20 86Q60 74 100 86" />
      </>
    ),
    pen: (
      <>
        <rect x="46" y="18" width="28" height="72" rx="8" />
        <path d="M46 90L60 118l14-28" />
        <line x1="46" y1="34" x2="74" y2="34" />
        <line x1="66" y1="20" x2="66" y2="78" />
      </>
    ),
    shoes: (
      <>
        <path d="M22 75c9 1 17-1 23-8l7 9c4 5 10 8 17 8h5v13H25c-6 0-9-4-7-10l4-12Z" />
        <path d="M66 55c9 1 17-1 23-8l7 9c4 5 10 8 17 8h3v13H69c-6 0-9-4-7-10l4-12Z" />
      </>
    ),
    coat: (
      <>
        <path d="M28 38L14 24v90h92V24L92 38" />
        <path d="M28 38L60 30v32L44 76" />
        <path d="M92 38L60 30v32l16 14" />
        <path d="M14 24L2 60l14 4 12-26" />
        <path d="M106 24l12 36-14 4-12-26" />
        <circle cx="60" cy="88" r="3" />
        <circle cx="60" cy="101" r="3" />
      </>
    ),
    // ── indoor additions ────────────────────────────────────────────────────
    book: (
      <>
        <rect x="30" y="20" width="60" height="88" rx="4" />
        <path d="M30 20c0 0-14 4-14 44s14 44 14 44" />
        <line x1="44" y1="20" x2="44" y2="108" />
        <line x1="50" y1="38" x2="80" y2="38" />
        <line x1="50" y1="52" x2="80" y2="52" />
        <line x1="50" y1="66" x2="80" y2="66" />
      </>
    ),
    lamp: (
      <>
        <path d="M38 56L48 24h24l10 32H38Z" />
        <line x1="60" y1="56" x2="60" y2="104" />
        <line x1="40" y1="104" x2="80" y2="104" />
        <line x1="54" y1="24" x2="52" y2="14" />
        <circle cx="52" cy="12" r="4" />
      </>
    ),
    clock: (
      <>
        <circle cx="60" cy="65" r="46" />
        <line x1="60" y1="65" x2="60" y2="34" />
        <line x1="60" y1="65" x2="82" y2="78" />
        <circle cx="60" cy="65" r="4" fill="currentColor" />
        <line x1="60" y1="22" x2="60" y2="30" />
        <line x1="60" y1="100" x2="60" y2="108" />
        <line x1="17" y1="65" x2="25" y2="65" />
        <line x1="95" y1="65" x2="103" y2="65" />
      </>
    ),
    phone: (
      <>
        <rect x="38" y="14" width="44" height="100" rx="8" />
        <line x1="38" y1="30" x2="82" y2="30" />
        <line x1="38" y1="98" x2="82" y2="98" />
        <circle cx="60" cy="111" r="4" />
        <line x1="52" y1="22" x2="68" y2="22" />
      </>
    ),
    pillow: (
      <>
        <rect x="18" y="38" width="84" height="52" rx="20" />
        <path d="M18 64c16-10 32-10 42 0s26 10 42 0" />
        <path d="M18 64c16 10 32 10 42 0s26-10 42 0" opacity="0.5" />
      </>
    ),
    mug: (
      <>
        <path d="M34 42h52v46c0 10-6 16-16 16H50c-10 0-16-6-16-16V42Z" />
        <path d="M86 50h8c8 0 14 6 14 14s-6 14-14 14h-8" />
        <line x1="46" y1="30" x2="46" y2="22" />
        <line x1="60" y1="30" x2="60" y2="22" />
        <line x1="74" y1="30" x2="74" y2="22" />
      </>
    ),
    chair: (
      <>
        <rect x="30" y="44" width="60" height="34" rx="6" />
        <path d="M34 78v36M86 78v36" />
        <path d="M22 44v-20c0-4 4-8 8-8h60c4 0 8 4 8 8v20" />
        <line x1="34" y1="96" x2="86" y2="96" />
      </>
    ),
    mirror: (
      <>
        <ellipse cx="60" cy="52" rx="30" ry="40" />
        <path d="M48 92l-6 20h36l-6-20" />
        <line x1="42" y1="112" x2="78" y2="112" />
        <ellipse cx="60" cy="52" rx="22" ry="32" opacity="0.4" />
      </>
    ),
    plant: (
      <>
        <path d="M60 90V54" />
        <path d="M60 70c0 0-20-10-24-30 12 0 22 8 24 30Z" />
        <path d="M60 60c0 0 20-10 24-28-12 0-22 8-24 28Z" />
        <path d="M60 54c0 0-10-18-6-36 10 4 14 18 6 36Z" />
        <path d="M42 90h36v18c0 4-4 8-8 8H50c-4 0-8-4-8-8V90Z" />
        <line x1="44" y1="100" x2="76" y2="100" />
      </>
    ),
    remote: (
      <>
        <rect x="40" y="18" width="40" height="92" rx="12" />
        <circle cx="60" cy="42" r="6" />
        <rect x="50" y="60" width="8" height="6" rx="2" />
        <rect x="62" y="60" width="8" height="6" rx="2" />
        <rect x="50" y="72" width="8" height="6" rx="2" />
        <rect x="62" y="72" width="8" height="6" rx="2" />
        <rect x="50" y="84" width="8" height="6" rx="2" />
        <rect x="62" y="84" width="8" height="6" rx="2" />
      </>
    ),
    glasses: (
      <>
        <circle cx="38" cy="68" r="22" />
        <circle cx="82" cy="68" r="22" />
        <line x1="60" y1="68" x2="60" y2="68" strokeWidth="8" />
        <path d="M16 68c0 0-6-8-10-8" />
        <path d="M104 68c0 0 6-8 10-8" />
      </>
    ),
    spoon: (
      <>
        <ellipse cx="60" cy="30" rx="14" ry="20" />
        <line x1="60" y1="50" x2="60" y2="116" />
        <line x1="54" y1="116" x2="66" y2="116" />
      </>
    ),
    towel: (
      <>
        <rect x="22" y="28" width="76" height="72" rx="6" />
        <line x1="22" y1="50" x2="98" y2="50" />
        <line x1="22" y1="80" x2="98" y2="80" />
        <line x1="40" y1="28" x2="40" y2="100" />
        <line x1="80" y1="28" x2="80" y2="100" />
      </>
    ),
    candle: (
      <>
        <rect x="46" y="48" width="28" height="66" rx="4" />
        <line x1="60" y1="48" x2="60" y2="30" />
        <path d="M56 24c0 0 2 8 4 6s4-6 4-6-2 12-4 12-4-12-4-12Z" />
        <line x1="40" y1="114" x2="80" y2="114" />
      </>
    ),
    bag: (
      <>
        <rect x="24" y="52" width="72" height="62" rx="8" />
        <path d="M42 52V42c0-10 8-18 18-18s18 8 18 18v10" />
        <line x1="24" y1="74" x2="96" y2="74" />
        <line x1="58" y1="52" x2="62" y2="52" strokeWidth="8" strokeLinecap="round" />
      </>
    ),
    umbrella: (
      <>
        <path d="M14 65c0-25 20-46 46-46s46 21 46 46H14Z" />
        <line x1="60" y1="65" x2="60" y2="108" />
        <path d="M60 108c0 8-8 12-14 8" />
        <line x1="60" y1="19" x2="60" y2="10" />
        <circle cx="60" cy="8" r="3" />
      </>
    ),
    bottle: (
      <>
        <path d="M46 36V22h28v14c8 6 10 14 10 24v44c0 8-6 10-10 10H46c-4 0-10-2-10-10V60c0-10 2-18 10-24Z" />
        <line x1="36" y1="72" x2="84" y2="72" />
        <line x1="44" y1="22" x2="76" y2="22" />
      </>
    ),
    keyring: (
      <>
        <circle cx="42" cy="38" r="14" />
        <circle cx="42" cy="38" r="8" />
        <line x1="56" y1="38" x2="80" y2="50" />
        <line x1="56" y1="38" x2="80" y2="38" />
        <line x1="56" y1="38" x2="80" y2="26" />
        <rect x="74" y="20" width="22" height="12" rx="4" />
        <rect x="74" y="32" width="22" height="12" rx="4" />
        <rect x="74" y="44" width="22" height="12" rx="4" />
      </>
    ),
    hat: (
      <>
        <ellipse cx="60" cy="90" rx="52" ry="14" />
        <path d="M28 90V58c0-18 14-32 32-32s32 14 32 32v32" />
        <line x1="28" y1="80" x2="92" y2="80" />
      </>
    ),
    // ── outdoor additions ───────────────────────────────────────────────────
    flower: (
      <>
        <circle cx="60" cy="58" r="12" />
        <ellipse cx="60" cy="34" rx="10" ry="14" />
        <ellipse cx="60" cy="82" rx="10" ry="14" />
        <ellipse cx="36" cy="58" rx="14" ry="10" />
        <ellipse cx="84" cy="58" rx="14" ry="10" />
        <ellipse cx="43" cy="41" rx="10" ry="14" transform="rotate(45 43 41)" />
        <ellipse cx="77" cy="41" rx="10" ry="14" transform="rotate(-45 77 41)" />
        <ellipse cx="43" cy="75" rx="10" ry="14" transform="rotate(-45 43 75)" />
        <ellipse cx="77" cy="75" rx="10" ry="14" transform="rotate(45 77 75)" />
        <line x1="60" y1="70" x2="60" y2="116" />
      </>
    ),
    bench: (
      <>
        <rect x="14" y="58" width="92" height="12" rx="4" />
        <path d="M28 70v30M92 70v30" />
        <rect x="14" y="40" width="92" height="10" rx="3" />
        <line x1="30" y1="40" x2="30" y2="58" />
        <line x1="90" y1="40" x2="90" y2="58" />
      </>
    ),
    cloud: (
      <>
        <path d="M28 86c-10 0-18-8-18-18 0-9 7-17 16-18 2-14 14-24 28-24 12 0 22 7 26 18 2-1 4-1 6-1 10 0 18 8 18 18s-8 18-18 18H28Z" />
        <line x1="30" y1="100" x2="40" y2="118" />
        <line x1="60" y1="100" x2="60" y2="118" />
        <line x1="90" y1="100" x2="80" y2="118" />
      </>
    ),
    fence: (
      <>
        <line x1="10" y1="60" x2="110" y2="60" />
        <line x1="10" y1="80" x2="110" y2="80" />
        <line x1="26" y1="44" x2="26" y2="96" />
        <line x1="46" y1="44" x2="46" y2="96" />
        <line x1="66" y1="44" x2="66" y2="96" />
        <line x1="86" y1="44" x2="86" y2="96" />
        <line x1="106" y1="44" x2="106" y2="96" />
        <path d="M20 44l6-10 6 10" />
        <path d="M40 44l6-10 6 10" />
        <path d="M60 44l6-10 6 10" />
        <path d="M80 44l6-10 6 10" />
        <path d="M100 44l6-10 6 10" />
      </>
    ),
    bird: (
      <>
        <path d="M20 60c10-20 30-20 40-10 10-10 30-10 40 10" />
        <path d="M60 50c0-10-10-18-20-14 4 6 12 10 20 14Z" />
        <circle cx="62" cy="52" r="3" fill="currentColor" />
        <path d="M66 52c4-2 8-2 10 0" />
        <path d="M56 60c-2 10 2 20 8 24" />
        <path d="M64 60c2 10-2 20-8 24" />
      </>
    ),
    puddle: (
      <>
        <ellipse cx="60" cy="90" rx="46" ry="18" />
        <ellipse cx="60" cy="90" rx="30" ry="10" opacity="0.4" />
        <path d="M52 56c0-10 16-30 8-44 10 4 16 20 8 44Z" />
        <path d="M52 56c-6 2-14 16-4 24 6-6 6-16 4-24Z" />
        <path d="M52 56c6 2 14 16 4 24-6-6-6-16-4-24Z" />
        <line x1="52" y1="80" x2="52" y2="72" />
      </>
    ),
    bicycle: (
      <>
        <circle cx="30" cy="88" r="22" />
        <circle cx="90" cy="88" r="22" />
        <circle cx="30" cy="88" r="4" fill="currentColor" />
        <circle cx="90" cy="88" r="4" fill="currentColor" />
        <path d="M30 88L50 48h20" />
        <path d="M50 48l20 12 20 28" />
        <path d="M42 48h16" />
        <path d="M82 36l4-12h8" />
        <line x1="82" y1="36" x2="90" y2="48" />
      </>
    ),
    sign: (
      <>
        <rect x="22" y="28" width="76" height="46" rx="6" />
        <line x1="60" y1="74" x2="60" y2="116" />
        <line x1="34" y1="44" x2="62" y2="44" />
        <line x1="34" y1="56" x2="86" y2="56" />
        <path d="M66 38l14 6-14 6Z" />
      </>
    ),
    steps: (
      <>
        <path d="M14 108h28V86h28V64h28V42h18" />
        <line x1="14" y1="108" x2="14" y2="42" />
      </>
    ),
    leaf: (
      <>
        <path d="M60 110C40 90 16 50 24 20c20 0 48 16 56 50-8-14-20-24-34-28 20 8 32 36 14 68Z" />
        <line x1="60" y1="110" x2="40" y2="118" />
      </>
    ),
    car: (
      <>
        <path d="M14 72h92v28c0 4-4 6-8 6H22c-4 0-8-2-8-6V72Z" />
        <path d="M22 72L32 44h56l10 28" />
        <circle cx="34" cy="100" r="10" />
        <circle cx="86" cy="100" r="10" />
        <rect x="36" y="48" width="20" height="20" rx="3" />
        <rect x="64" y="48" width="20" height="20" rx="3" />
        <line x1="14" y1="82" x2="106" y2="82" />
      </>
    ),
    shadow: (
      <>
        <ellipse cx="60" cy="104" rx="40" ry="12" />
        <line x1="60" y1="92" x2="60" y2="34" />
        <circle cx="60" cy="28" r="12" />
        <line x1="60" y1="10" x2="60" y2="4" />
        <line x1="40" y1="16" x2="36" y2="12" />
        <line x1="80" y1="16" x2="84" y2="12" />
        <line x1="34" y1="28" x2="28" y2="28" />
        <line x1="86" y1="28" x2="92" y2="28" />
      </>
    ),
    door: (
      <>
        <rect x="28" y="20" width="64" height="94" rx="4" />
        <rect x="34" y="26" width="52" height="82" rx="2" opacity="0.3" />
        <circle cx="84" cy="67" r="4" fill="currentColor" />
        <line x1="28" y1="114" x2="8" y2="114" />
        <line x1="92" y1="114" x2="112" y2="114" />
        <line x1="34" y1="62" x2="34" y2="80" />
        <line x1="86" y1="62" x2="86" y2="80" />
      </>
    ),
    window: (
      <>
        <rect x="18" y="24" width="84" height="80" rx="4" />
        <line x1="60" y1="24" x2="60" y2="104" />
        <line x1="18" y1="64" x2="102" y2="64" />
        <path d="M18 24c0 0 16-14 42-14s42 14 42 14" />
        <line x1="10" y1="104" x2="110" y2="104" />
      </>
    ),
    bin: (
      <>
        <path d="M28 44l8 70h48l8-70H28Z" />
        <line x1="22" y1="44" x2="98" y2="44" />
        <path d="M46 32V24h28v8" />
        <line x1="22" y1="32" x2="98" y2="32" />
        <line x1="48" y1="58" x2="46" y2="100" />
        <line x1="60" y1="58" x2="60" y2="100" />
        <line x1="72" y1="58" x2="74" y2="100" />
      </>
    ),
    postbox: (
      <>
        <rect x="30" y="44" width="60" height="52" rx="4" />
        <path d="M30 44c0-16 14-28 30-28s30 12 30 28" />
        <rect x="44" y="62" width="32" height="6" rx="2" />
        <line x1="60" y1="96" x2="60" y2="116" />
        <line x1="46" y1="116" x2="74" y2="116" />
        <circle cx="60" cy="80" r="4" />
      </>
    ),
    bridge: (
      <>
        <line x1="10" y1="90" x2="110" y2="90" />
        <path d="M10 90C10 60 36 40 60 40S110 60 110 90" />
        <line x1="34" y1="62" x2="34" y2="90" />
        <line x1="60" y1="40" x2="60" y2="90" />
        <line x1="86" y1="62" x2="86" y2="90" />
        <line x1="10" y1="90" x2="10" y2="110" />
        <line x1="110" y1="90" x2="110" y2="110" />
      </>
    ),
    grass: (
      <>
        <line x1="10" y1="90" x2="110" y2="90" />
        <path d="M20 90V68c4 4 8 14 8 22" />
        <path d="M34 90V58c4 6 8 20 8 32" />
        <path d="M50 90V50c4 8 8 26 8 40" />
        <path d="M66 90V58c4 6 8 20 8 32" />
        <path d="M82 90V68c4 4 8 14 8 22" />
        <path d="M96 90V74c2 4 6 10 6 16" />
        <path d="M14 90V76c-2 4-6 10-6 14" />
      </>
    ),
    stone: (
      <>
        <ellipse cx="60" cy="78" rx="46" ry="32" />
        <path d="M22 86c4-16 20-28 38-28s34 12 38 28" opacity="0.4" />
        <path d="M34 68c8-10 18-14 26-12" opacity="0.5" />
      </>
    ),
  }

  return (
    <svg
      className="picture-day__icon"
      viewBox="0 0 120 130"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {drawings[(object as ObjectName) in drawings ? (object as ObjectName) : 'cup']}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Game — patient cannot review photos; must wait for caregiver approval
// ─────────────────────────────────────────────────────────────────────────────

function PictureDayGame({
  state,
  onStateChange,
  onRefresh,
  onPlayAgain,
  onExitToMenu,
  onNotify,
}: {
  state: PatientPictureState
  onStateChange: (next: PatientPictureState) => void
  onRefresh: () => Promise<void>
  onPlayAgain: () => void | Promise<void>
  onExitToMenu: () => void | Promise<void>
  onNotify?: (msg: string) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const session = state.session!
  const prompts = session.prompts
  const step = session.currentStep
  const complete = step >= prompts.length
  const prompt = prompts[Math.min(step, prompts.length - 1)]
  const isOutdoors = session.mode === 'outdoors'
  const waitingForApproval = isOutdoors && !complete && state.currentSubmissionStatus === 'pending'
  const wasRejected = isOutdoors && !complete && state.currentSubmissionStatus === 'rejected'

  // Fire a notification once each time an outdoors submission is rejected
  const prevStatusRef = useRef<string>('')
  useEffect(() => {
    if (wasRejected && prevStatusRef.current !== 'rejected') {
      onNotify?.('Your caregiver asked you to try again for this prompt.')
    }
    prevStatusRef.current = state.currentSubmissionStatus
  }, [wasRejected, state.currentSubmissionStatus, onNotify])

  // Poll while waiting for the caregiver to approve or ask for a retake (outdoors only)
  useEffect(() => {
    if (!waitingForApproval) return
    const onFocus = () => {
      void onRefresh()
    }
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(() => {
      void onRefresh()
    }, 2500)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [waitingForApproval, onRefresh])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || complete || waitingForApproval || submitting) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      const dataUrl = await compressPictureFile(file)
      const res = await fetch('/picture-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          sessionId: session.id,
          promptIndex: step,
          imageDataUrl: dataUrl,
        }),
      })
      const result = (await res.json()) as {
        ok?: boolean
        error?: string
        state?: PatientPictureState
      }
      if (result.state) {
        onStateChange(result.state)
      }
      if (!res.ok || !result.ok) {
        setError(result.error || 'Could not send your picture. Please try again.')
      }
    } catch {
      setError('Could not send your picture. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <style>{pictureDayStyles}</style>
      <section className="picture-day">
        {!complete ? (
          <>
            <div
              className="picture-day__progress"
              role="status"
              aria-label={`Prompt ${step + 1} of ${prompts.length}`}
            >
              {prompts.map((item, index) => (
                <span
                  key={item.object}
                  className={[
                    'picture-day__dot',
                    index === step ? 'is-current' : '',
                    state.approvedPromptIndices.includes(index) ? 'is-done' : '',
                  ].join(' ')}
                />
              ))}
            </div>

            {waitingForApproval ? (
              <div className="picture-day__approval" role="status" aria-live="polite">
                <strong>Waiting for caregiver approval</strong>
                <span>
                  Your picture for <b>{prompt.title}</b> has been sent to your caregiver to review.
                  The next prompt will unlock once they approve it.
                </span>
              </div>
            ) : (
              <>
                <div className="picture-day__card">
                  {step > 0 && state.lastApprovedTitle && !wasRejected && (
                    <span className="picture-day__status picture-day__status--match picture-day__badge-top">
                      ✓ Previous picture approved
                    </span>
                  )}

                  <PromptIcon object={prompt.object} />

                  <div className="picture-day__copy">
                    <strong>{prompt.title}</strong>
                    <span>
                      {wasRejected
                        ? 'Please take another picture for this prompt.'
                        : prompt.guidance}
                    </span>
                  </div>
                </div>

                <label
                  className={`picture-day__take ${submitting ? 'is-disabled' : ''}`}
                  aria-disabled={submitting}
                >
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={submitting}
                    onChange={handleFileChange}
                  />
                  {submitting
                    ? 'Sending…'
                    : wasRejected
                      ? 'Take a new picture'
                      : 'Take a picture'}
                </label>

                {error && (
                  <p role="alert" className="picture-day__error-msg">
                    {error}
                  </p>
                )}
              </>
            )}

            <button
              className="picture-day__exit"
              type="button"
              onClick={() => void onExitToMenu()}
            >
              Back to menu
            </button>
          </>
        ) : (
          <>
            <div className="picture-day__complete">
              <div className="picture-day__complete-badge" aria-hidden="true">
                ✓
              </div>
              <strong>Picture day complete!</strong>
              <span>
                {isOutdoors
                  ? `All ${prompts.length} pictures were approved by your caregiver.`
                  : `All ${prompts.length} pictures sent to your caregiver.`}
              </span>
              <ul className="picture-day__checklist" aria-label="Completed prompts">
                {prompts.map((item) => (
                  <li key={item.object}>
                    <span aria-hidden="true">✓</span>
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            <button
              className="picture-day__restart"
              type="button"
              onClick={() => void onPlayAgain()}
            >
              Play again — 3 more prompts
            </button>
            <button
              className="picture-day__exit"
              type="button"
              onClick={() => void onExitToMenu()}
            >
              Back to menu
            </button>
          </>
        )}

        <p className="picture-day__privacy">
          Pictures are sent directly to your caregiver for review.
        </p>      </section>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const pictureDayStyles = `
  .picture-day, .picture-day * { box-sizing: border-box; }
  .picture-day {
    width: min(100%, 390px); margin: 0 auto; padding: 24px;
    border-radius: 28px; background: #faf8f3; color: #3f5e46;
    font-family: 'DM Sans', Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .picture-day button, .picture-day label { -webkit-tap-highlight-color: transparent; }
  .picture-day button { border: 0; font: inherit; cursor: pointer; }

  .picture-day__progress { display: flex; justify-content: center; gap: 7px; margin-bottom: 12px; }
  .picture-day__dot { display: inline-block; width: 7px; height: 7px; border-radius: 999px; background: #d6dfcd; transition: width 0.2s, background 0.2s; }
  .picture-day__dot.is-current { width: 22px; background: #3d6548; }
  .picture-day__dot.is-done    { background: #7f9a6c; }

  .picture-day__card {
    position: relative; display: flex; min-height: 405px;
    flex-direction: column; align-items: center; justify-content: center;
    overflow: hidden; border-radius: 22px; background: #eaf0df; color: #71885f;
    padding: 24px 0;
  }
  .picture-day__badge-top {
    position: absolute; top: 18px; left: 50%; transform: translateX(-50%);
    white-space: nowrap;
  }
  .picture-day__icon { width: 108px; height: 118px; margin-bottom: 36px; }
  .picture-day__copy {
    position: relative; z-index: 1; display: flex; flex-direction: column;
    align-items: center; gap: 14px; padding: 0 24px; text-align: center;
  }
  .picture-day__copy strong { color: #3f6249; font-size: 25px; line-height: 1.3; }
  .picture-day__copy span { font-size: 13px; }

  .picture-day__status {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 7px 14px; border-radius: 999px; font-size: 12px; font-weight: 600;
  }
  .picture-day__status--match   { background: rgba(61,101,72,0.88);   color: #fff; }
  .picture-day__status--nomatch { background: rgba(180,80,60,0.86);   color: #fff; }

  @keyframes pd-spin { to { transform: rotate(360deg); } }
  .picture-day__spinner {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid rgba(61,101,72,0.28); border-top-color: #3d6548;
    border-radius: 50%; animation: pd-spin 0.75s linear infinite;
  }
  .picture-day__spinner--lg {
    width: 28px; height: 28px; border-width: 3px;
  }

  .picture-day__take, .picture-day__restart {
    position: relative;
    display: flex; width: 100%; min-height: 52px;
    align-items: center; justify-content: center; margin-top: 14px;
    border: 0; border-radius: 15px; background: #3d6548; color: white;
    font-size: 14px; font-weight: 700; text-align: center; cursor: pointer;
  }
  .picture-day__take.is-disabled, .picture-day__take:disabled { opacity: 0.55; cursor: default; }
  .picture-day__take input { position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; }

  .picture-day__exit {
    display: flex; width: 100%; min-height: 44px;
    align-items: center; justify-content: center; margin-top: 10px;
    border: 1.5px solid #c7d3b8; border-radius: 15px; background: transparent;
    color: #5a7150; font-size: 13px; font-weight: 700; cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .picture-day__exit:hover  { background: #eaf0df; border-color: #7f9a6c; }
  .picture-day__exit:active { transform: scale(0.98); }

  .picture-day__error-msg {
    margin: 10px 0 0; text-align: center; font-size: 12px; font-weight: 600; color: #a1555c;
  }

  .picture-day__complete { padding: 34px 20px 24px; border-radius: 22px; background: #eaf0df; text-align: center; }
  .picture-day__complete-badge {
    width: 56px; height: 56px; margin: 0 auto 14px; border-radius: 50%;
    background: #5f7d4d; color: #fff; font-size: 26px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .picture-day__complete > strong, .picture-day__complete > span { display: block; }
  .picture-day__complete > strong { color: #3f6249; font-size: 22px; }
  .picture-day__complete > span   { margin-top: 7px; color: #687b5e; font-size: 12px; }

  .picture-day__checklist {
    list-style: none; margin: 20px 0 0; padding: 0;
    display: flex; flex-direction: column; gap: 8px; text-align: left;
  }
  .picture-day__checklist li {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-radius: 13px; background: #fff;
    font-size: 13px; font-weight: 600; color: #3f5e46;
  }
  .picture-day__checklist li > span:first-child {
    width: 22px; height: 22px; border-radius: 50%;
    background: #dfeace; color: #4d6c3d; font-size: 12px; font-weight: 800;
    display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  .picture-day__privacy { margin: 12px 0 0; color: #899287; font-size: 10px; text-align: center; }

  .picture-day__menu { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  .picture-day__menu-heading { margin: 0; font-family: 'Manrope', sans-serif; font-size: 22px; font-weight: 800; color: #3f6249; }
  .picture-day__menu-sub { margin: 0; font-size: 13px; color: #687b5e; }
  .picture-day__menu-options { display: flex; gap: 12px; margin-top: 6px; }
  .picture-day__menu-option {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 10px;
    padding: 24px 12px 20px; background: #eaf0df; border: 2px solid transparent;
    border-radius: 20px; color: #3f6249; cursor: pointer; transition: border-color 0.15s, background 0.15s;
  }
  .picture-day__menu-option:hover  { background: #dfebd2; border-color: #7f9a6c; filter: none; }
  .picture-day__menu-option:active { transform: scale(0.97); }
  .picture-day__menu-icon { display: flex; align-items: center; justify-content: center; width: 72px; height: 72px; color: #5a8060; }
  .picture-day__menu-icon svg { width: 100%; height: 100%; }
  .picture-day__menu-option strong { font-size: 15px; font-weight: 700; color: #3f6249; }
  .picture-day__menu-option span   { font-size: 11px; color: #687b5e; text-align: center; }

  .picture-day__approval {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 405px; padding: 40px 24px; background: #eaf0df; border-radius: 22px; text-align: center;
  }
  .picture-day__approval-icon {
    display: flex; align-items: center; justify-content: center;
    width: 64px; height: 64px; margin-bottom: 20px;
    border-radius: 50%; background: #d9e4cc; font-size: 32px;
  }
  .picture-day__approval-icon--denied {
    background: #f0d9d9; color: #b43c3c;
  }
  .picture-day__approval strong {
    display: block; margin-bottom: 8px; font-size: 20px; color: #3f6249;
  }
  .picture-day__approval span {
    display: block; font-size: 13px; color: #687b5e; line-height: 1.6;
  }
`
