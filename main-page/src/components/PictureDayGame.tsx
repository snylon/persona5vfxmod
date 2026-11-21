'use client'

/**
 * Picture Day game — all logic lives here, in a plain component file.
 *
 * This is NOT a Next.js page. It is imported by Games.tsx only.
 * Keeping it out of app/ prevents Next.js from treating it as a route
 * module and triggering HMR re-evaluation loops.
 */

import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Prompt data
// ─────────────────────────────────────────────────────────────────────────────

const INDOOR_PROMPTS = [
  { object: 'cup',  title: 'Find a cup',  guidance: 'Keep the whole cup in view.' },
  { object: 'pen',  title: 'Find a pen',  guidance: 'Or a pencil — close enough.' },
  { object: 'coat', title: 'Find a coat', guidance: 'Hanging up or laid out.' },
] as const

const OUTDOOR_PROMPTS = [
  { object: 'tree',  title: 'Find a tree',          guidance: 'Find one nearby and photograph it.' },
  { object: 'shoes', title: 'Find a pair of shoes',  guidance: 'Place both shoes side by side.' },
  { object: 'ball',  title: 'Find a ball',           guidance: 'Any size or sport will do.' },
] as const

const ALL_PROMPTS = [...INDOOR_PROMPTS, ...OUTDOOR_PROMPTS] as const

type ObjectName = (typeof ALL_PROMPTS)[number]['object']
type Prompt     = (typeof ALL_PROMPTS)[number]
type Mode       = 'indoors' | 'outdoors'

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — shows menu, then game
// ─────────────────────────────────────────────────────────────────────────────

export function PictureDayRoot({ onComplete, requireApproval }: { onComplete?: () => void; requireApproval?: (mode: Mode, onApprove: () => void, onDeny: () => void) => void }) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [approved, setApproved] = useState(false)
  const [denied, setDenied] = useState(false)

  function handleModeSelect(selectedMode: Mode) {
    if (selectedMode === 'outdoors' && requireApproval) {
      setMode(selectedMode)
      setApproved(false)
      setDenied(false)
      requireApproval(
        selectedMode,
        () => setApproved(true),
        () => {
          setDenied(true)
          setTimeout(() => {
            setMode(null)
            setDenied(false)
          }, 2000)
        }
      )
    } else {
      setMode(selectedMode)
      setApproved(true)
    }
  }

  if (!mode) return <PictureDayMenu onSelect={handleModeSelect} />
  if (mode === 'outdoors' && !approved) {
    return (
      <>
        <style>{pictureDayStyles}</style>
        <section className="picture-day">
          <div className="picture-day__approval">
            {denied ? (
              <>
                <span className="picture-day__approval-icon picture-day__approval-icon--denied">✗</span>
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
  return <PictureDayGame mode={mode} onComplete={onComplete} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu
// ─────────────────────────────────────────────────────────────────────────────

function PictureDayMenu({ onSelect }: { onSelect: (mode: Mode) => void }) {
  return (
    <>
      <style>{pictureDayStyles}</style>
      <section className="picture-day">
        <div className="picture-day__menu">
          <p className="picture-day__menu-heading">Where are you?</p>
          <p className="picture-day__menu-sub">Choose your setting to get matching prompts.</p>
          <div className="picture-day__menu-options">

            <button type="button" className="picture-day__menu-option" onClick={() => onSelect('indoors')}>
              <span className="picture-day__menu-icon" aria-hidden="true">
                <svg viewBox="0 0 120 130" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 60L60 20l40 40v50H20V60Z" />
                  <path d="M44 110V80h32v30" />
                </svg>
              </span>
              <strong>Indoors</strong>
              <span>Cup · Pen · Coat</span>
            </button>

            <button type="button" className="picture-day__menu-option" onClick={() => onSelect('outdoors')}>
              <span className="picture-day__menu-icon" aria-hidden="true">
                <svg viewBox="0 0 120 130" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="60" cy="45" r="18" />
                  <path d="M60 17v-8M60 81v-8M32 45h-8M96 45h-8M40 25l-6-6M86 71l-6-6M86 25l6-6M40 71l6-6" />
                  <line x1="10" y1="96" x2="110" y2="96" />
                  <path d="M28 96v-12M60 96v-16M92 96v-12" />
                </svg>
              </span>
              <strong>Outdoors</strong>
              <span>Tree · Shoes · Ball</span>
            </button>

          </div>
        </div>
        <p className="picture-day__privacy">Photos stay on this device and clear when you close the game.</p>
      </section>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG prompt icons
// ─────────────────────────────────────────────────────────────────────────────

function PromptIcon({ object }: { object: ObjectName }) {
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
      {drawings[object]}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Game
// ─────────────────────────────────────────────────────────────────────────────

function PictureDayGame({ mode, onComplete }: { mode: Mode; onComplete?: () => void }) {
  const [prompts] = useState<Prompt[]>(() =>
    shuffle([...(mode === 'indoors' ? INDOOR_PROMPTS : OUTDOOR_PROMPTS)] as Prompt[]),
  )
  const [pictures, setPictures] = useState<(string | undefined)[]>(
    () => Array(mode === 'indoors' ? INDOOR_PROMPTS.length : OUTDOOR_PROMPTS.length).fill(undefined),
  )
  const [page, setPage] = useState(0)

  const complete = page === prompts.length
  const prompt   = prompts[Math.min(page, prompts.length - 1)]

  function reset() {
    setPictures(Array(prompts.length).fill(undefined))
    setPage(0)
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || complete) return

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(reader.result as string))
      reader.readAsDataURL(file)
    })

    // Show photo immediately, set loading state
    setPictures((prev) => prev.map((p, i) => (i === page ? dataUrl : p)))
  }

  function continueGame() {
    const nextPage = page + 1
    setPage(nextPage)
    if (nextPage === prompts.length) {
      onComplete?.()
    }
  }

  const shownPhoto = pictures[page]

  return (
    <>
      <style>{pictureDayStyles}</style>
      <section className="picture-day">

        {!complete ? (
          <>
            <nav className="picture-day__progress" aria-label={`Picture ${page + 1} of ${prompts.length}`}>
              {prompts.map((item, index) => (
                <button
                  type="button"
                  key={item.object}
                  className={[index === page ? 'is-current' : '', pictures[index] ? 'is-done' : ''].join(' ')}
                  onClick={() => { if (pictures[index]) { setPage(index) } }}
                  disabled={!pictures[index] && index !== page}
                  aria-label={`Go to picture ${index + 1}: ${item.title}`}
                  aria-current={index === page ? 'step' : undefined}
                />
              ))}
            </nav>

            <div className="picture-day__card">
              {shownPhoto && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img className="picture-day__preview" src={shownPhoto} alt={`${prompt.title} — picture ${page + 1}`} />
              )}
              {!shownPhoto && <PromptIcon object={prompt.object} />}

              <div className="picture-day__copy">
                {prompt.title && (
                  <>
                    <strong>{prompt.title}</strong>
                    <span>{prompt.guidance}</span>
                  </>
                )}
              </div>
            </div>

            <label className="picture-day__take">
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
              {shownPhoto ? 'Take it again' : 'Take a picture'}
            </label>
            {shownPhoto && (
              <button type="button" className="picture-day__take" onClick={continueGame}>
                {page === prompts.length - 1 ? 'Finish Picture Day' : 'Next picture'}
              </button>
            )}
          </>
        ) : (
          <>
            <div className="picture-day__complete">
              <strong>Picture day complete!</strong>
              <span>All your pictures are saved for this session.</span>
              <div className="picture-day__gallery">
                {pictures.map((picture, index) => (
                  <button
                    type="button"
                    key={prompts[index].object}
                    onClick={() => { setPage(index) }}
                    aria-label={`View ${prompts[index].title.toLowerCase()}`}
                  >
                    {picture && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={picture} alt={prompts[index].title} />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <button className="picture-day__restart" type="button" onClick={() => { reset(); onComplete?.() }}>
              Start a new Picture Day
            </button>
          </>
        )}

        <p className="picture-day__privacy">
          Photos stay on this device and clear when you close the game.
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
  .picture-day__progress button { width: 7px; height: 7px; padding: 0; border-radius: 999px; background: #d6dfcd; }
  .picture-day__progress button.is-current { width: 22px; background: #3d6548; }
  .picture-day__progress button.is-done    { background: #7f9a6c; }
  .picture-day__progress button:disabled   { cursor: default; }

  .picture-day__card {
    position: relative; display: flex; min-height: 405px;
    flex-direction: column; align-items: center; justify-content: center;
    overflow: hidden; border-radius: 22px; background: #eaf0df; color: #71885f;
  }
  .picture-day__icon { width: 108px; height: 118px; margin-bottom: 36px; }
  .picture-day__preview { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .picture-day__card:has(.picture-day__preview)::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(transparent 42%, rgb(38 59 45 / 74%));
  }
  .picture-day__copy {
    position: relative; z-index: 1; display: flex; flex-direction: column;
    align-items: center; gap: 14px; padding: 0 24px; text-align: center;
  }
  .picture-day__card:has(.picture-day__preview) .picture-day__copy { position: absolute; bottom: 28px; color: white; }
  .picture-day__copy strong { color: #3f6249; font-size: 25px; line-height: 1.3; }
  .picture-day__card:has(.picture-day__preview) .picture-day__copy strong { color: white; }
  .picture-day__copy span { font-size: 13px; }

  .picture-day__status {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 7px 14px; border-radius: 999px; font-size: 13px; font-weight: 600;
    backdrop-filter: blur(4px);
  }
  .picture-day__status--loading { background: rgba(255,255,255,0.75); color: #3f6249; }
  .picture-day__status--match   { background: rgba(61,101,72,0.88);   color: #fff; }
  .picture-day__status--nomatch { background: rgba(180,80,60,0.82);   color: #fff; }
  .picture-day__status--error   { background: rgba(180,80,60,0.82);   color: #fff; font-size: 12px; max-width: 280px; text-align: center; }

  @keyframes pd-spin { to { transform: rotate(360deg); } }
  .picture-day__spinner {
    display: inline-block; width: 14px; height: 14px;
    border: 2px solid rgba(61,101,72,0.3); border-top-color: #3d6548;
    border-radius: 50%; animation: pd-spin 0.7s linear infinite;
  }

  .picture-day__take, .picture-day__restart {
    display: flex; width: 100%; min-height: 52px;
    align-items: center; justify-content: center; margin-top: 14px;
    border: 0; border-radius: 15px; background: #3d6548; color: white;
    font-size: 14px; font-weight: 700; text-align: center; cursor: pointer;
  }
  .picture-day__take:disabled { opacity: 0.55; cursor: default; }
  .picture-day__take input { position: absolute; width: 1px; height: 1px; overflow: hidden; opacity: 0; }

  .picture-day__complete { padding: 31px 20px 24px; border-radius: 22px; background: #eaf0df; text-align: center; }
  .picture-day__complete > strong, .picture-day__complete > span { display: block; }
  .picture-day__complete > strong { color: #3f6249; font-size: 22px; }
  .picture-day__complete > span   { margin-top: 7px; color: #687b5e; font-size: 12px; }

  .picture-day__gallery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 24px; }
  .picture-day__gallery button {
    position: relative; aspect-ratio: 1; overflow: hidden; padding: 0;
    border: 3px solid white; border-radius: 14px; background: #d9e4cc;
  }
  .picture-day__gallery button:nth-child(4) { grid-column: 1/2; transform: translateX(50%); }
  .picture-day__gallery button:nth-child(5) { grid-column: 2/3; transform: translateX(50%); }
  .picture-day__gallery img { width: 100%; height: 100%; object-fit: cover; }

  .picture-day__privacy { margin: 12px 0 0; color: #899287; font-size: 9px; text-align: center; }

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
