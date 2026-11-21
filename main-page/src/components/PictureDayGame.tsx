'use client'

/**
 * Picture Day game — all logic lives here, in a plain component file.
 *
 * Pictures taken by the patient are sent straight to the linked caregiver's
 * Pictures tab for review. The patient never sees a preview or gallery of
 * taken pictures, and must wait for caregiver approval before advancing to
 * the next prompt.
 */

import { useCallback, useEffect, useState } from 'react'
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
] as const

const OUTDOOR_PROMPTS = [
  { object: 'tree', title: 'Find a tree', guidance: 'Find one nearby and photograph it.' },
  { object: 'shoes', title: 'Find a pair of shoes', guidance: 'Place both shoes side by side.' },
  { object: 'ball', title: 'Find a ball', guidance: 'Any size or sport will do.' },
] as const

const ALL_PROMPTS = [...INDOOR_PROMPTS, ...OUTDOOR_PROMPTS] as const

type ObjectName = (typeof ALL_PROMPTS)[number]['object']
type Mode = PictureDayMode

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
  onComplete,
  requireApproval,
}: {
  onComplete?: () => void
  requireApproval?: (mode: Mode, onApprove: () => void, onDeny: () => void) => void
}) {
  const [pictureState, setPictureState] = useState<PatientPictureState | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingMode, setPendingMode] = useState<Mode | null>(null)
  const [denied, setDenied] = useState(false)
  const [starting, setStarting] = useState(false)
  const [menuError, setMenuError] = useState('')

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
      )
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
      )
    } else {
      void beginSession(selectedMode)
    }
  }

  async function handleReset() {
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
    onComplete?.()
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
      onRestart={handleReset}
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
  onRestart,
}: {
  state: PatientPictureState
  onStateChange: (next: PatientPictureState) => void
  onRefresh: () => Promise<void>
  onRestart: () => Promise<void>
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const session = state.session!
  const prompts = session.prompts
  const step = session.currentStep
  const complete = step >= prompts.length
  const prompt = prompts[Math.min(step, prompts.length - 1)]
  const waitingForApproval = !complete && state.currentSubmissionStatus === 'pending'
  const wasRejected = !complete && state.currentSubmissionStatus === 'rejected'

  // Poll while waiting for the caregiver to approve or ask for a retake
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
                  {wasRejected && (
                    <span className="picture-day__status picture-day__status--nomatch picture-day__badge-top">
                      Caregiver asked to try again
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
                    ? 'Sending to caregiver…'
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
          </>
        ) : (
          <>
            <div className="picture-day__complete">
              <div className="picture-day__complete-badge" aria-hidden="true">
                ✓
              </div>
              <strong>Picture day complete!</strong>
              <span>All {prompts.length} pictures were approved by your caregiver.</span>
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
              onClick={() => void onRestart()}
            >
              Start a new Picture Day
            </button>
          </>
        )}

        <p className="picture-day__privacy">
          Pictures are sent directly to your caregiver for review.
        </p>
      </section>
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
