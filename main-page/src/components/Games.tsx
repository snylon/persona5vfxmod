'use client'

import { useEffect, useRef, useState } from 'react'

// ── Sparkle burst on correct answer ─────────────────────────────────────────

function SparklesBurst({ active }: { active: boolean }) {
  const particles = ['\u2726', '\u2727', '\u2605', '\u2726', '\u2727', '\u2726', '\u2727', '\u2605', '\u2726', '\u2727', '\u2726', '\u2727']
  return (
    <div className={`sparkle-burst${active ? ' sparkle-burst-active' : ''}`} aria-hidden="true">
      {particles.map((s, i) => (
        <span key={i} className={`sparkle-particle sparkle-p${i}`}>{s}</span>
      ))}
    </div>
  )
}

export const gameNames = [
  'Counting boxes',
  'Colouring game',
  'Find the differences',
  'Picture day',
] as const
export type GameName = (typeof gameNames)[number]

export function GameCards({ onPlay }: { onPlay: (game: GameName) => void }) {
  return (
    <section className="metrics-grid game-cards" aria-label="Choose a game">
      {[
        {
          name: gameNames[0],
          note: 'Count at your own pace',
          style: 'calories-card',
          art: 'boxes',
          tag: '01',
        },
        {
          name: gameNames[1],
          note: 'Make something colourful',
          style: 'water-card',
          art: 'colours',
          tag: '02',
        },
        {
          name: gameNames[2],
          note: 'A little attention to detail',
          style: 'movement-card',
          art: 'differences',
          tag: '03',
        },
        {
          name: gameNames[3],
          note: 'Capture these objects',
          style: 'sleep-card',
          art: 'picture',
          tag: '04',
        },
      ].map((game, i) => (
        <button
          type="button"
          className={`metric-card game-card ${game.style}`}
          key={game.name}
          onClick={() => onPlay(gameNames[i])}
          aria-label={`Play ${game.name}`}
        >
          <span className="game-card-top">
            <span>{game.tag}</span>
          </span>
          <span className={`game-card-art ${game.art}`} aria-hidden="true">
            {game.art === 'boxes' ? (
              Array.from({ length: 5 }, (_, n) => <i key={n} />)
            ) : game.art === 'colours' ? (
              Array.from({ length: 4 }, (_, n) => <i key={n} />)
            ) : game.art === 'differences' ? (
              <>
                <i />
                <i />
              </>
            ) : (
              <span className="picture-card-camera">
                <i />
              </span>
            )}
          </span>
          <strong>{game.name}</strong>
          <span className="game-card-note">{game.note}</span>
        </button>
      ))}
    </section>
  )
}

export function Game({ name, onComplete }: { name: GameName; onComplete?: () => void }) {
  if (name === 'Counting boxes') return <CountingBoxes />
  if (name === 'Colouring game') return <ColouringGame />
  if (name === 'Find the differences') return <Differences />
  return <PictureDayRoot onComplete={onComplete} />
}

// ── Picture Day ───────────────────────────────────────────────────────────────

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
type Prompt = (typeof ALL_PROMPTS)[number]
type Mode = 'indoors' | 'outdoors'

function shuffle<T>(arr: readonly T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// ── Root: shows menu first, then the game ────────────────────────────────────

function PictureDayRoot({ onComplete }: { onComplete?: () => void }) {
  const [mode, setMode] = useState<Mode | null>(null)
  if (!mode) return <PictureDayMenu onSelect={setMode} />
  return <PictureDay mode={mode} onComplete={onComplete} />
}

// ── Mode selection menu ───────────────────────────────────────────────────────

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

// ── Game ─────────────────────────────────────────────────────────────────────

function PictureDay({ mode, onComplete }: { mode: Mode; onComplete?: () => void }) {
  const [prompts] = useState<Prompt[]>(() =>
    shuffle([...(mode === 'indoors' ? INDOOR_PROMPTS : OUTDOOR_PROMPTS)] as Prompt[]),
  )
  const [pictures, setPictures] = useState<(string | undefined)[]>(
    Array(prompts.length).fill(undefined),
  )
  const [page, setPage] = useState(0)

  const complete = page === prompts.length
  const prompt   = prompts[Math.min(page, prompts.length - 1)]

  function reset() {
    setPictures(Array(5).fill(undefined))
    setPage(0)
  }

  function addPicture(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || complete) return

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') return
      setPictures((current) =>
        current.map((pic, index) => (index === page ? (reader.result as string) : pic)),
      )
      const nextPage = page + 1
      setPage(nextPage)
      if (nextPage === prompts.length) {
        // finished — wait briefly then close
        window.setTimeout(() => {
          reset()
          onComplete?.()
        }, 1800)
      }
    })
    reader.readAsDataURL(file)
  }

  return (
    <>
      <style>{pictureDayStyles}</style>
      <section className="picture-day" aria-labelledby="picture-day-title">

        {!complete ? (
          <>
            <nav
              className="picture-day__progress"
              aria-label={`Picture ${page + 1} of ${prompts.length}`}
            >
              {prompts.map((item, index) => (
                <button
                  type="button"
                  key={item.object}
                  className={[
                    index === page     ? 'is-current' : '',
                    pictures[index]    ? 'is-done'    : '',
                  ].join(' ')}
                  onClick={() => pictures[index] && setPage(index)}
                  disabled={!pictures[index] && index !== page}
                  aria-label={`Go to picture ${index + 1}: ${item.title}`}
                  aria-current={index === page ? 'step' : undefined}
                />
              ))}
            </nav>

            <div className="picture-day__card">
              {pictures[page] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  className="picture-day__preview"
                  src={pictures[page]}
                  alt={`${prompt.title} — picture ${page + 1}`}
                />
              ) : (
                <PromptIcon object={prompt.object} />
              )}

              <div className="picture-day__copy">
                <strong>{pictures[page] ? 'Take it again?' : prompt.title}</strong>
                <span>{pictures[page] ? prompt.title : prompt.guidance}</span>
              </div>
            </div>

            <label className="picture-day__take">
              <input type="file" accept="image/*" capture="environment" onChange={addPicture} />
              Take a picture
            </label>
          </>
        ) : (
          <>
            <div className="picture-day__complete">
              <strong>Picture day complete!</strong>
              <span>You found all five objects.</span>

              <div className="picture-day__gallery">
                {pictures.map((picture, index) => (
                  <button
                    type="button"
                    key={prompts[index].object}
                    onClick={() => setPage(index)}
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

const pictureDayStyles = `
  .picture-day,
  .picture-day * {
    box-sizing: border-box;
  }

  .picture-day {
    width: min(100%, 390px);
    margin: 0 auto;
    padding: 24px;
    border-radius: 28px;
    background: #faf8f3;
    color: #3f5e46;
    font-family: 'DM Sans', Inter, ui-sans-serif, system-ui, sans-serif;
  }

  .picture-day button,
  .picture-day label {
    -webkit-tap-highlight-color: transparent;
  }

  .picture-day button {
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  .picture-day__progress {
    display: flex;
    justify-content: center;
    gap: 7px;
    margin-bottom: 12px;
  }

  .picture-day__progress button {
    width: 7px;
    height: 7px;
    padding: 0;
    border-radius: 999px;
    background: #d6dfcd;
  }

  .picture-day__progress button.is-current {
    width: 22px;
    background: #3d6548;
  }

  .picture-day__progress button.is-done {
    background: #7f9a6c;
  }

  .picture-day__progress button:disabled {
    cursor: default;
  }

  .picture-day__card {
    position: relative;
    display: flex;
    min-height: 405px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 22px;
    background: #eaf0df;
    color: #71885f;
  }

  .picture-day__icon {
    width: 108px;
    height: 118px;
    margin-bottom: 36px;
  }

  .picture-day__preview {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .picture-day__card:has(.picture-day__preview)::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 42%, rgb(38 59 45 / 74%));
  }

  .picture-day__copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 0 24px;
    text-align: center;
  }

  .picture-day__card:has(.picture-day__preview) .picture-day__copy {
    position: absolute;
    bottom: 28px;
    color: white;
  }

  .picture-day__copy strong {
    color: #3f6249;
    font-size: 25px;
    line-height: 1.3;
  }

  .picture-day__card:has(.picture-day__preview) .picture-day__copy strong {
    color: white;
  }

  .picture-day__copy span {
    font-size: 13px;
  }

  .picture-day__take,
  .picture-day__restart {
    display: flex;
    width: 100%;
    min-height: 52px;
    align-items: center;
    justify-content: center;
    margin-top: 14px;
    border: 0;
    border-radius: 15px;
    background: #3d6548;
    color: white;
    font-size: 14px;
    font-weight: 700;
    text-align: center;
    cursor: pointer;
  }

  .picture-day__take input {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    opacity: 0;
  }

  .picture-day__complete {
    padding: 31px 20px 24px;
    border-radius: 22px;
    background: #eaf0df;
    text-align: center;
  }

  .picture-day__complete > strong,
  .picture-day__complete > span {
    display: block;
  }

  .picture-day__complete > strong {
    color: #3f6249;
    font-size: 22px;
  }

  .picture-day__complete > span {
    margin-top: 7px;
    color: #687b5e;
    font-size: 12px;
  }

  .picture-day__gallery {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 24px;
  }

  .picture-day__gallery button {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    padding: 0;
    border: 3px solid white;
    border-radius: 14px;
    background: #d9e4cc;
  }

  .picture-day__gallery button:nth-child(4) {
    grid-column: 1 / 2;
    transform: translateX(50%);
  }

  .picture-day__gallery button:nth-child(5) {
    grid-column: 2 / 3;
    transform: translateX(50%);
  }

  .picture-day__gallery img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .picture-day__privacy {
    margin: 12px 0 0;
    color: #899287;
    font-size: 9px;
    text-align: center;
  }

  /* ── mode selection menu ── */

  .picture-day__menu {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }

  .picture-day__menu-heading {
    margin: 0;
    font-family: 'Manrope', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: #3f6249;
  }

  .picture-day__menu-sub {
    margin: 0;
    font-size: 13px;
    color: #687b5e;
  }

  .picture-day__menu-options {
    display: flex;
    gap: 12px;
    margin-top: 6px;
  }

  .picture-day__menu-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 24px 12px 20px;
    background: #eaf0df;
    border: 2px solid transparent;
    border-radius: 20px;
    color: #3f6249;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .picture-day__menu-option:hover {
    background: #dfebd2;
    border-color: #7f9a6c;
    filter: none;
  }

  .picture-day__menu-option:active {
    transform: scale(0.97);
  }

  .picture-day__menu-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    color: #5a8060;
  }

  .picture-day__menu-icon svg {
    width: 100%;
    height: 100%;
  }

  .picture-day__menu-option strong {
    font-size: 15px;
    font-weight: 700;
    color: #3f6249;
  }

  .picture-day__menu-option span {
    font-size: 11px;
    color: #687b5e;
    text-align: center;
  }`

// ── Counting boxes image bank ─────────────────────────────────────────────────

type BoxEntry = { src: string; count: number; label: string }

const BOX_BANK: BoxEntry[] = [
  { src: '/boxes/boxes-01.png', count: 11, label: 'large scattered towers' },
  { src: '/boxes/boxes-02.png', count: 6, label: 'two asymmetric columns' },
  { src: '/boxes/boxes-03.png', count: 5,  label: 'three single cubes in a row' },
  { src: '/boxes/boxes-04.png', count: 12, label: 'large solid block' },
  { src: '/boxes/boxes-05.png', count: 9,  label: 'six scattered cubes' },
  { src: '/boxes/boxes-06.png', count: 11,  label: 'medium solid block' },
  { src: '/boxes/boxes-07.png', count: 6,  label: 'U-shaped line' },
  { src: '/boxes/boxes-08.png', count: 17,  label: 'scattered tall columns' },
  { src: '/boxes/boxes-09.png', count: 4,  label: 'two cubes' },
  { src: '/boxes/boxes-10.png', count: 3, label: 'cross shape' },
  { src: '/boxes/boxes-11.png', count: 2,  label: 'small 2x2 block' },
  { src: '/boxes/boxes-12.png', count: 14,  label: 'scattered cubes' },
  { src: '/boxes/boxes-13.png', count: 15, label: 'ring shape' },
  { src: '/boxes/boxes-14.png', count: 7,  label: 'four corner cubes' },
  { src: '/boxes/boxes-15.png', count: 23, label: 'C-shaped frame' },
  { src: '/boxes/boxes-16.png', count: 8,  label: 'single tall tower' },
  { src: '/boxes/boxes-17.png', count: 12,  label: 'three corner cubes' },
]

function pickRound(): BoxEntry[] {
  const result: BoxEntry[] = []
  const copy = [...BOX_BANK]
  for (let i = 0; i < Math.min(4, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length)
    result.push(copy.splice(idx, 1)[0])
  }
  return result
}

function makeOptions(count: number): number[] {
  const opts = new Set<number>([count])
  const deltas = [1, 2, -1, 3, -2, 4, -3, 5]
  let di = 0
  while (opts.size < 4) {
    const v = count + deltas[di % deltas.length]
    if (v > 0) opts.add(v)
    di++
  }
  return [...opts].sort(() => Math.random() - 0.5)
}

type Phase = 'flash' | 'guess'

function CountingBoxes() {
  const [matchEntries, setMatchEntries] = useState<BoxEntry[]>(() => pickRound())
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<Phase>('flash')
  const [answer, setAnswer] = useState<number | null>(null)
  const [showSparkle, setShowSparkle] = useState(false)
  const [options, setOptions] = useState<number[]>([])
  const [countdown, setCountdown] = useState(3)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const entry = matchEntries[step]
  const correct = answer !== null && answer === entry?.count

  // Reset for a new step or new match
  useEffect(() => {
    setPhase('flash')
    setAnswer(null)
    setCountdown(3)
    if (entry) setOptions(makeOptions(entry.count))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, matchEntries])

  // Run countdown during flash phase
  useEffect(() => {
    if (phase !== 'flash') return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          setPhase('guess')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase])

  // Sparkle on correct answer
  useEffect(() => {
    if (correct) {
      setShowSparkle(true)
      const t = window.setTimeout(() => setShowSparkle(false), 1200)
      return () => window.clearTimeout(t)
    }
  }, [correct])

  function nextStep() {
    if (step < matchEntries.length - 1) {
      setStep((s) => s + 1)
    } else {
      setMatchEntries(pickRound())
      setStep(0)
    }
  }

  if (!entry) return null

  return (
    <div className="counting-game" style={{ position: 'relative' }}>
      <SparklesBurst active={showSparkle} />
      <p>
        {phase === 'flash'
          ? 'Look carefully \u2014 the picture will disappear!'
          : 'How many dark boxes did you count?'}
      </p>

      <div className="counting-image-wrap">
        {phase === 'flash' ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={entry.src}
              alt={entry.label}
              className="counting-image"
            />
            <div className="counting-countdown" aria-live="polite" aria-atomic="true">
              {countdown}
            </div>
          </>
        ) : (
          <div className="counting-hidden-board" role="img" aria-label="Picture hidden, make your guess">
            <span>?</span>
          </div>
        )}
      </div>

      <div className="counting-match-progress" aria-label={`Image ${step + 1} of ${matchEntries.length}`}>
        {matchEntries.map((_, i) => (
          <span
            key={i}
            className={`counting-pip${i < step ? ' done' : i === step ? ' active' : ''}`}
          />
        ))}
      </div>

      <div className="answer-options" aria-label="Choose the number of boxes">
        {options.map((value) => (
          <button
            key={value}
            disabled={phase === 'flash' || correct}
            onClick={() => setAnswer(value)}
            className={answer === value ? (correct ? 'correct' : 'try-again') : ''}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="game-feedback" role="status">
        {phase === 'flash'
          ? 'Study the picture\u2026'
          : answer === null
            ? 'Take your time, then pick a number.'
            : correct
              ? 'That\u2019s right! Nicely counted.'
              : 'Not quite \u2014 have another look next time.'}
      </div>

      {correct && (
        <button className="primary-button" onClick={nextStep}>
          {step < matchEntries.length - 1 ? 'Next picture \u2192' : 'New match \u2192'}
        </button>
      )}
    </div>
  )
}

const palette = [
  { name: 'Sage green', value: '#9AB57E' },
  { name: 'Sky blue', value: '#91C8DB' },
  { name: 'Butter yellow', value: '#EED786' },
  { name: 'Soft pink', value: '#DBA4AE' },
  { name: 'Lavender', value: '#B5A3CC' },
  { name: 'Peach', value: '#E8B58E' },
]

function ColouringGame() {
  const [colour, setColour] = useState(palette[0].value)
  const [fills, setFills] = useState<Record<string, string>>({})
  const [lastPart, setLastPart] = useState('')
  const shapes = [
    { id: 'stem', label: 'Stem', shape: <rect x="145" y="144" width="10" height="117" rx="5" /> },
    {
      id: 'left-leaf',
      label: 'Left leaf',
      shape: <path d="M148 226C90 231 65 198 70 176c46-4 73 13 78 50Z" />,
    },
    {
      id: 'right-leaf',
      label: 'Right leaf',
      shape: <path d="M153 206c4-42 33-58 75-48-1 33-30 55-75 48Z" />,
    },
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `petal-${i}`,
      label: `Petal ${i + 1}`,
      shape: <ellipse cx="150" cy="66" rx="25" ry="37" transform={`rotate(${i * 60} 150 115)`} />,
    })),
    { id: 'centre', label: 'Flower centre', shape: <circle cx="150" cy="115" r="30" /> },
    { id: 'pot', label: 'Flower pot', shape: <path d="M109 251h82l-12 51h-58Z" /> },
  ]
  function paint(id: string, label: string) {
    setFills({ ...fills, [id]: colour })
    setLastPart(label)
  }
  return (
    <div className="colouring-game">
      <p>Pick a colour, then tap a part of the flower. There&apos;s no wrong way to create.</p>
      <svg
        className="colouring-flower"
        viewBox="0 0 300 325"
        aria-label="Interactive flower colouring picture"
      >
        {shapes.map((part) => (
          <g
            key={part.id}
            role="button"
            tabIndex={0}
            aria-label={`Colour ${part.label.toLowerCase()}`}
            fill={fills[part.id] || '#FFFFFF'}
            stroke="#7B8D70"
            strokeWidth="2.5"
            strokeLinejoin="round"
            onClick={() => paint(part.id, part.label)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                paint(part.id, part.label)
              }
            }}
          >
            {part.shape}
          </g>
        ))}
      </svg>
      <div className="colour-palette" aria-label="Choose a colour">
        {palette.map((item) => (
          <button
            key={item.name}
            aria-label={item.name}
            aria-pressed={colour === item.value}
            onClick={() => setColour(item.value)}
            style={{ backgroundColor: item.value }}
            className={colour === item.value ? 'selected' : ''}
          />
        ))}
      </div>
      <div className="game-feedback" role="status">
        {lastPart
          ? `${lastPart} coloured. Looking lovely!`
          : 'A little colour can brighten your day.'}
      </div>
      <button
        className="game-secondary"
        onClick={() => {
          setFills({})
          setLastPart('')
        }}
      >
        Start fresh
      </button>
    </div>
  )
}

function Shape({ kind, colour }: { kind: number; colour: string }) {
  return (
    <svg viewBox="0 0 60 60" width="44" height="44" aria-hidden="true" fill={colour}>
      {kind === 0 ? (
        <circle cx="30" cy="30" r="18" />
      ) : kind === 1 ? (
        <rect x="12" y="12" width="36" height="36" rx="6" />
      ) : kind === 2 ? (
        <path d="m30 9 23 40H7Z" />
      ) : (
        <path d="m30 7 7 15 17 2-13 12 4 17-15-9-15 9 4-17L6 24l17-2Z" />
      )}
    </svg>
  )
}

function Differences() {
  const [found, setFound] = useState<number[]>([])
  const [message, setMessage] = useState('Look for three changes in the second picture.')
  const [round, setRound] = useState(0)
  const [showSparkle, setShowSparkle] = useState(false)
  const changes = round % 2 === 0 ? [1, 3, 5] : [0, 2, 4]
  const complete = found.length === changes.length

  function choose(index: number) {
    if (found.includes(index) || complete) return
    if (changes.includes(index)) {
      const newFound = [...found, index]
      setFound(newFound)
      if (newFound.length === changes.length) {
        setMessage('You found all three! Brilliant spotting.')
        setShowSparkle(true)
        window.setTimeout(() => setShowSparkle(false), 1200)
      } else {
        setMessage('You spotted one! Keep looking.')
      }
    } else setMessage('Those two match. Try another shape.')
  }

  return (
    <div className="differences-game" style={{ position: 'relative' }}>
      <SparklesBurst active={showSparkle} />
      <p>
        Compare the two pictures. Tap the three shapes that are different in the second picture.
      </p>
      <div className="difference-picture">
        <span>THE ORIGINAL</span>
        <div className="difference-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="difference-cell" key={i}>
              <Shape kind={(i + round) % 4} colour={palette[i].value} />
            </div>
          ))}
        </div>
      </div>
      <div className="difference-picture">
        <span>FIND THE CHANGES</span>
        <div className="difference-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <button
              className={`difference-cell ${found.includes(i) ? 'found' : ''}`}
              key={i}
              aria-label={`Check shape ${i + 1}`}
              aria-pressed={found.includes(i)}
              onClick={() => choose(i)}
            >
              <Shape
                kind={(i + round + (changes.includes(i) ? 1 : 0)) % 4}
                colour={palette[i].value}
              />
              {found.includes(i) && (
                <span className="found-tick" aria-hidden="true">
                  &#10003;
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="difference-progress">{found.length} of 3 differences found</div>
      <div className="game-feedback" role="status">
        {message}
      </div>
      {complete && (
        <button
          className="primary-button"
          onClick={() => {
            setRound(round + 1)
            setFound([])
            setMessage('A fresh picture. Can you find all three?')
          }}
        >
          Play again &rarr;
        </button>
      )}
    </div>
  )
}
