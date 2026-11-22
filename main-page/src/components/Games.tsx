'use client'

import { useEffect, useRef, useState } from 'react'
import { PictureDayRoot } from '@/components/PictureDayGame'

// â”€â”€ Sparkle burst on correct answer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  'Find the differences',
  'Picture day',
  'Sudoku',
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
          note: 'A little attention to detail',
          style: 'water-card',
          art: 'differences',
          tag: '02',
        },
        {
          name: gameNames[2],
          note: 'Capture these objects',
          style: 'movement-card',
          art: 'picture',
          tag: '03',
        },
        {
          name: gameNames[3],
          note: 'Fill in the numbers',
          style: 'sleep-card',
          art: 'sudoku',
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
            ) : game.art === 'differences' ? (
              <>
                <i />
                <i />
              </>
            ) : game.art === 'sudoku' ? (
              <svg viewBox="0 0 100 100" width="62" height="62" className="sudoku-icon">
                <rect x="10" y="10" width="35" height="35" rx="4" fill="currentColor" opacity="0.15" transform="rotate(-6 27.5 27.5)" />
                <rect x="55" y="10" width="35" height="35" rx="4" fill="currentColor" opacity="0.15" transform="rotate(5 72.5 27.5)" />
                <rect x="10" y="55" width="35" height="35" rx="4" fill="currentColor" opacity="0.15" transform="rotate(5 27.5 72.5)" />
                <rect x="55" y="55" width="35" height="35" rx="4" fill="currentColor" opacity="0.15" transform="rotate(-6 72.5 72.5)" />
                <text x="27.5" y="37" fontSize="24" fontWeight="700" fill="currentColor" textAnchor="middle">1</text>
                <text x="72.5" y="37" fontSize="24" fontWeight="700" fill="currentColor" textAnchor="middle">2</text>
                <text x="27.5" y="82" fontSize="24" fontWeight="700" fill="currentColor" textAnchor="middle">3</text>
                <text x="72.5" y="82" fontSize="24" fontWeight="700" fill="currentColor" textAnchor="middle">4</text>
              </svg>
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

export function Game({ name, onComplete, onRequestApproval, onNotify }: { 
  name: GameName; 
  onComplete?: () => void;
  onRequestApproval?: (mode: 'indoors' | 'outdoors', onApprove: () => void, onDeny: () => void, onCancel: () => void) => void;
  onNotify?: (msg: string) => void;
}) {
  if (name === 'Counting boxes') return <CountingBoxes />
  if (name === 'Find the differences') return <Differences />
  if (name === 'Sudoku') return <SimpleSudoku />
  return <PictureDayRoot onComplete={onComplete} requireApproval={onRequestApproval} onNotify={onNotify} />
}


// â”€â”€ Counting boxes image bank â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

type Phase = 'guess'

function CountingBoxes() {
  const [matchEntries, setMatchEntries] = useState<BoxEntry[]>(() => pickRound())
  const [step, setStep] = useState(0)
  const [phase] = useState<Phase>('guess')
  const [answer, setAnswer] = useState<number | null>(null)
  const [showSparkle, setShowSparkle] = useState(false)
  const [options, setOptions] = useState<number[]>([])

  const entry = matchEntries[step]
  const correct = answer !== null && answer === entry?.count

  // Reset for a new step or new match
  useEffect(() => {
    setAnswer(null)
    if (entry) setOptions(makeOptions(entry.count))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, matchEntries])

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
      <p>How many dark boxes can you count?</p>

      <div className="counting-image-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.src}
          alt={entry.label}
          className="counting-image"
        />
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
            disabled={correct}
            onClick={() => setAnswer(value)}
            className={answer === value ? (correct ? 'correct' : 'try-again') : ''}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="game-feedback" role="status">
        {answer === null
          ? 'Take your time, then pick a number.'
          : correct
            ? 'That\u2019s right! Nicely counted.'
            : 'Not quite \u2014 have another look.'}
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
  
  const diffPalette = [
    { name: 'Sage green', value: '#9AB57E' },
    { name: 'Sky blue', value: '#91C8DB' },
    { name: 'Butter yellow', value: '#EED786' },
    { name: 'Soft pink', value: '#DBA4AE' },
    { name: 'Lavender', value: '#B5A3CC' },
    { name: 'Peach', value: '#E8B58E' },
  ]

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
              <Shape kind={(i + round) % 4} colour={diffPalette[i].value} />
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
                colour={diffPalette[i].value}
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

// ── Sudoku (3-puzzle session: puzzle 1 is 4×4, puzzles 2–3 are 9×9) ───────────────

// 4×4 generator
function generate4x4(): (number | null)[][] {
  const solutions: number[][][] = [
    [[1,2,3,4],[3,4,1,2],[2,3,4,1],[4,1,2,3]],
    [[2,1,4,3],[4,3,2,1],[1,4,3,2],[3,2,1,4]],
    [[3,4,2,1],[1,2,4,3],[4,3,1,2],[2,1,3,4]],
  ]
  const solution = solutions[Math.floor(Math.random() * solutions.length)]
  const puzzle: (number | null)[][] = solution.map(row => [...row])
  const cellsToRemove = 8 + Math.floor(Math.random() * 3)
  let removed = 0
  while (removed < cellsToRemove) {
    const row = Math.floor(Math.random() * 4)
    const col = Math.floor(Math.random() * 4)
    if (puzzle[row][col] !== null) { puzzle[row][col] = null; removed++ }
  }
  return puzzle
}

// 9×9 generator via backtracking
function solve9x9(grid: number[][]): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (grid[r][c] === 0) {
        const nums = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5)
        for (const n of nums) {
          if (canPlace(grid, r, c, n)) {
            grid[r][c] = n
            if (solve9x9(grid)) return true
            grid[r][c] = 0
          }
        }
        return false
      }
    }
  }
  return true
}

function canPlace(grid: number[][], row: number, col: number, n: number): boolean {
  if (grid[row].includes(n)) return false
  if (grid.some(r => r[col] === n)) return false
  const br = Math.floor(row / 3) * 3
  const bc = Math.floor(col / 3) * 3
  for (let i = br; i < br + 3; i++)
    for (let j = bc; j < bc + 3; j++)
      if (grid[i][j] === n) return false
  return true
}

function generate9x9(cellsToRemove: number): (number | null)[][] {
  const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0))
  solve9x9(grid)
  const puzzle: (number | null)[][] = grid.map(row => [...row] as number[])
  let removed = 0
  const positions = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5)
  for (const pos of positions) {
    if (removed >= cellsToRemove) break
    const r = Math.floor(pos / 9)
    const c = pos % 9
    if (puzzle[r][c] !== null) { puzzle[r][c] = null; removed++ }
  }
  return puzzle
}

function isValidBoard(board: (number | null)[][], size: number): boolean {
  for (const row of board) {
    const filled = row.filter(x => x !== null) as number[]
    if (new Set(filled).size !== filled.length) return false
  }
  for (let col = 0; col < size; col++) {
    const filled = board.map(row => row[col]).filter(x => x !== null) as number[]
    if (new Set(filled).size !== filled.length) return false
  }
  if (size === 9) {
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const box: number[] = []
        for (let i = 0; i < 3; i++)
          for (let j = 0; j < 3; j++) {
            const v = board[br*3+i][bc*3+j]
            if (v !== null) box.push(v)
          }
        if (new Set(box).size !== box.length) return false
      }
    }
  }
  return true
}

function isBoardComplete(board: (number | null)[][], size: number): boolean {
  return board.every(row => row.every(cell => cell !== null)) && isValidBoard(board, size)
}

type PuzzleSpec = { board: (number | null)[][]; initial: boolean[][]; size: number }

function makePuzzleSpec(puzzleIndex: number): PuzzleSpec {
  let board: (number | null)[][]
  if (puzzleIndex === 0) {
    board = generate4x4()
  } else if (puzzleIndex === 1) {
    board = generate9x9(35) // easier: ~46 givens
  } else {
    board = generate9x9(45) // harder: ~36 givens
  }
  return { board, initial: board.map(row => row.map(cell => cell !== null)), size: board.length }
}

function SimpleSudoku() {
  const TOTAL = 3
  const [puzzleIdx, setPuzzleIdx] = useState(0)
  const [spec, setSpec] = useState<PuzzleSpec>(() => makePuzzleSpec(0))
  const [board, setBoard] = useState<(number | null)[][]>(() => spec.board)
  const [showSparkle, setShowSparkle] = useState(false)

  const { initial, size } = spec
  const complete = isBoardComplete(board, size)
  const isLast = puzzleIdx === TOTAL - 1

  useEffect(() => {
    if (complete) {
      setShowSparkle(true)
      const t = window.setTimeout(() => setShowSparkle(false), 1200)
      return () => window.clearTimeout(t)
    }
  }, [complete])

  function handleInput(row: number, col: number, value: string) {
    if (initial[row][col]) return
    const num = value ? parseInt(value) : null
    if (num !== null && (num < 1 || num > size)) return
    const newBoard = board.map(r => [...r])
    newBoard[row][col] = num
    setBoard(newBoard)
  }

  function advance() {
    const next = isLast ? 0 : puzzleIdx + 1
    const nextSpec = makePuzzleSpec(next)
    setPuzzleIdx(next)
    setSpec(nextSpec)
    setBoard(nextSpec.board)
  }

  const description = size === 4
    ? 'Fill each row, column, and 2\u00d72 box with numbers 1\u20134.'
    : 'Fill each row, column, and 3\u00d73 box with numbers 1\u20139.'

  return (
    <div className="sudoku-game" style={{ position: 'relative' }}>
      <SparklesBurst active={showSparkle} />

      <div className="counting-match-progress" aria-label={`Puzzle ${puzzleIdx + 1} of ${TOTAL}`}>
        {Array.from({ length: TOTAL }, (_, i) => (
          <span
            key={i}
            className={`counting-pip${i < puzzleIdx ? ' done' : i === puzzleIdx ? ' active' : ''}`}
          />
        ))}
      </div>

      <p>{description}</p>

      <div className={`sudoku-grid sudoku-grid-${size}`}>
        {board.map((row, rowIdx) => (
          <div key={rowIdx} className={`sudoku-row${size === 9 && rowIdx % 3 === 2 && rowIdx < 8 ? ' sudoku-row-box-border' : ''}`}>
            {row.map((cell, colIdx) => (
              <input
                key={`${rowIdx}-${colIdx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={cell ?? ''}
                onChange={(e) => handleInput(rowIdx, colIdx, e.target.value)}
                className={`sudoku-cell-input${size === 9 ? ' sudoku-cell-9' : ''}${initial[rowIdx][colIdx] ? ' sudoku-given' : ''}${size === 9 && colIdx % 3 === 2 && colIdx < 8 ? ' sudoku-col-box-border' : ''}`}
                disabled={initial[rowIdx][colIdx]}
                aria-label={`Row ${rowIdx + 1}, Column ${colIdx + 1}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="game-feedback" role="status">
        {complete ? 'Perfect! All correct!' : 'Fill in the missing numbers.'}
      </div>

      {complete && (
        <button className="primary-button" onClick={advance}>
          {isLast ? 'New game' : 'Next puzzle'}
        </button>
      )}
    </div>
  )
}