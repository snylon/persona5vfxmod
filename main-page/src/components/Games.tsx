'use client'

import Image from 'next/image'
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

export function Game({ name }: { name: GameName }) {
  if (name === 'Counting boxes') return <CountingBoxes />
  if (name === 'Colouring game') return <ColouringGame />
  if (name === 'Find the differences') return <Differences />
  return <PictureDay />
}

const picturePrompts = [
  'Something that makes you smile',
  'Your favourite colour',
  'Something soft or cosy',
]

function PictureDay() {
  const [pictures, setPictures] = useState<string[]>([])
  const [message, setMessage] = useState('Your first picture is waiting.')
  const [showSparkle, setShowSparkle] = useState(false)
  const complete = pictures.length === picturePrompts.length

  function addPicture(file?: File) {
    if (!file || complete) return
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') return
      const newPictures = [...pictures, reader.result as string]
      setPictures(newPictures)
      if (newPictures.length === picturePrompts.length) {
        setMessage('Picture Day complete! What a lovely little collection.')
        setShowSparkle(true)
        window.setTimeout(() => setShowSparkle(false), 1200)
      } else {
        setMessage('Lovely picture! Here comes your next prompt.')
      }
    })
    reader.readAsDataURL(file)
  }

  function removePicture(index: number) {
    setPictures((current) => current.filter((_, pictureIndex) => pictureIndex !== index))
    setMessage('That spot is ready for a new picture.')
  }

  return (
    <div className="picture-day-game" style={{ position: 'relative' }}>
      <SparklesBurst active={showSparkle} />
      <p>Take three pictures inspired by the gentle prompts. Use your camera or choose a photo.</p>
      <div className="picture-prompt">
        <span>
          PICTURE {Math.min(pictures.length + 1, picturePrompts.length)} OF {picturePrompts.length}
        </span>
        <strong>
          {complete ? 'Your Picture Day collection' : picturePrompts[pictures.length]}
        </strong>
      </div>
      <div className="picture-day-grid">
        {picturePrompts.map((prompt, index) => (
          <div className={`picture-slot ${pictures[index] ? 'filled' : ''}`} key={prompt}>
            {pictures[index] ? (
              <>
                <Image
                  src={pictures[index]}
                  alt={`${prompt} \u2014 picture ${index + 1}`}
                  fill
                  sizes="110px"
                  unoptimized
                />
                <button
                  onClick={() => removePicture(index)}
                  aria-label={`Remove picture ${index + 1}`}
                >
                  &times;
                </button>
              </>
            ) : (
              <>
                <span>{index + 1}</span>
                <small>{index === pictures.length ? 'Next' : 'Waiting'}</small>
              </>
            )}
          </div>
        ))}
      </div>
      {!complete && (
        <label className="picture-take-button">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              addPicture(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <span className="picture-button-icon" aria-hidden="true">
            <i />
          </span>
          Take or choose a picture
        </label>
      )}
      <div className="game-feedback" role="status">
        {message}
      </div>
      {complete && (
        <button
          className="primary-button"
          onClick={() => {
            setPictures([])
            setMessage('Your first picture is waiting.')
          }}
        >
          Start a new Picture Day &rarr;
        </button>
      )}
      <p className="picture-privacy">
        Pictures stay on this device and are cleared when you close the game.
      </p>
    </div>
  )
}

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
