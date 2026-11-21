'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Game, GameCards, gameNames } from './Games'
import type { GameName } from './Games'
import FamilyTree from './FamilyTree'
import Journal from './Journal'
import LinkGateCard from './LinkGateCard'
import type { LinkActionResult } from '@/app/(frontend)/link-actions'
import type { LinkState, SessionUser } from '@/lib/auth-store'

function Icon({ name, size = 20, ...props }: { name: string; size?: number; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 4v16h17M8 14l4-5 4 3 5-7" />
      </>
    ),
    family: (
      <>
        <circle cx="12" cy="5" r="3" />
        <circle cx="6" cy="19" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M12 8v4M6 16v-4h12v4" />
      </>
    ),
    games: (
      <>
        <path d="M8 9h8a6 6 0 0 1 5.7 7.9l-.6 1.8a2.5 2.5 0 0 1-4.2.9L14.5 17h-5l-2.4 2.6a2.5 2.5 0 0 1-4.2-.9l-.6-1.8A6 6 0 0 1 8 9Z" />
        <path d="M7 13v4m-2-2h4m7-1h.01m3 2h.01" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C9 2 2 7 5 15s17 5 15-12Z" />
        <path d="M3 22 15 9" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="4" />
        <path d="M7 3v4m10-4v4M3 11h18m-13 4h1m3 0h1m3 0h1m-9 3h1m3 0h1" />
      </>
    ),
    bell: (
      <>
        <path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4ZM10 21h4" />
      </>
    ),
    down: <path d="m8 10 4 4 4-4" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    flame: <path d="M13 2c1 6-5 5-3 11-2 0-3-2-3-4-6 7-2 13 5 13 8 0 11-10 1-20Z" />,
    water: <path d="M12 2C10 6 4 11 4 15a8 8 0 0 0 16 0c0-4-6-9-8-13ZM8 15c0 2 1 3 3 3" />,
    moon: <path d="M20 15A9 9 0 0 1 9 3 9 9 0 1 0 20 15Z" />,
    steps: (
      <>
        <ellipse cx="8" cy="7" rx="3" ry="5" transform="rotate(-20 8 7)" />
        <ellipse cx="17" cy="12" rx="3" ry="5" transform="rotate(20 17 12)" />
        <path d="m7 15 1 3m8 1-1 3" />
      </>
    ),
    settings: (
      <>
        <path d="m9 3-1 3-3 1-2 4 2 3v4l4 2 3-1 3 1 4-2v-4l2-3-2-4-3-1-1-3Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    cloud: <path d="M7 18h11a4 4 0 0 0 .4-8A7 7 0 0 0 5 9a4.5 4.5 0 0 0 2 9Z" />,
    fork: (
      <>
        <path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v19M20 3c-5 3-5 10 0 10m0-10v19" />
      </>
    ),
    journal: (
      <>
        <path d="M5 3h13a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1Z" />
        <path d="M8 3v18M4 17h16M11 8h6M11 12h5" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    users: (
      <>
        <circle cx="8" cy="8" r="4" />
        <path d="M2 20c0-4 2.7-7 6-7s6 3 6 7" />
        <path d="M17 11c1.7 0 3 1.3 3 3s-1.3 3-3 3" />
        <path d="M22 20c0-2.5-1.5-4.5-3-5" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    heart: <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1s-1 7 8 14c9-7 11-11 8-14Z" />,
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name] || paths.leaf}
    </svg>
  )
}

const initialHabits = [
  {
    title: 'Start the day with a glass of water',
    detail: 'A little hydration goes a long way',
    icon: 'water',
    done: true,
  },
  { title: 'Take a mindful moment', detail: '5 minutes just for you', icon: 'leaf', done: true },
  {
    title: 'Get outside for a walk',
    detail: 'Fresh air, a fresh perspective',
    icon: 'steps',
    done: false,
  },
]

const ALL_CHECKIN_QUESTIONS = [
  "What was the best thing you ate today?",
  "What do you like to do?",
  "What is your favourite song?",
  "What is your favourite country you've visited?",
  "What's your favourite place in the city?",
  "What conversations have you had today?",
  "What is your favourite childhood memory?",
  "What was the name of your first pet, or an animal you loved growing up?",
  "Who was your best friend when you were a kid, and what did you used to do together?",
  "What was your favorite game or toy when you were young?",
  "What was your favorite subject in school, or the one you liked the least?",
  "Did you have a favorite teacher growing up? What made them special?",
  "What kind of music did you listen to when you were a teenager?",
  "What was your very first job, and what did you do with your first paycheck?",
  "What was your favorite holiday or family tradition growing up?",
  "Did you ever have a treehouse, a fort, or a secret hiding spot as a kid?",
  "What was your favorite sweet or treat from a bakery or corner store when you were young?",
  "What is a smell that instantly reminds you of home?",
  "What is the best meal you have ever eaten, and who made it?",
  "Do you prefer the sound of rain on a roof, ocean waves, or birds chirping in the morning?",
  "What is your favorite season of the year, and what do you love about it?",
  "What is a song that always makes you want to dance or tap your foot?",
  "Do you prefer coffee, tea, or hot chocolate, and how do you like it made?",
  "What is the coziest piece of clothing or blanket you've ever owned?",
  "What is your favorite flower or tree?",
  "Are you a morning person or a night owl?",
  "If you could have any animal as a pet right now, what would you choose?",
  "Do you prefer the mountains, the beach, or the quiet countryside?",
  "What is your favorite movie or TV show to watch when you want a good laugh?",
  "Are you more of a sweet tooth or a salty-snack person?",
  "What is your favorite color to wear?",
  "Do you like thunderstorms, or do you prefer clear, sunny skies?",
  "What is a small thing that always puts a smile on your face?",
  "How are you feeling right now, in just a few words?",
  "What is something nice you noticed outside the window today?",
  "Is there a song stuck in your head today?",
  "What is something you are looking forward to this week?",
  "Who is someone you're grateful to have in your life?",
  "What is the nicest thing someone has done for you recently?",
  "If you could have anything in the world for dinner tonight, what would you pick?",
  "Cats or dogs?",
  "Summer heat or winter snow?",
  "Sweet breakfast (pancakes/waffles) or savory breakfast (eggs/bacon)?",
  "Reading a good book or watching a classic movie?",
  "Driving on a road trip or taking a train?",
  "Ice cream in a cone or in a bowl?",
  "Sunrise or sunset?",
]

function pickQuestions(count: number, exclude: string[] = []): string[] {
  const pool = ALL_CHECKIN_QUESTIONS.filter((q) => !exclude.includes(q))
  const picked: string[] = []
  const copy = [...pool]
  for (let i = 0; i < Math.min(count, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length)
    picked.push(copy.splice(idx, 1)[0])
  }
  return picked
}

function Sparkles() {
  return (
    <div className="checkin-sparkles" aria-hidden="true">
      {['✦', '✧', '✦', '✧', '✦', '✦', '✧', '✦'].map((s, i) => (
        <span key={i} className={`spark spark-${i}`}>{s}</span>
      ))}
    </div>
  )
}

function DailyCheckIn({ onClose, inline = false }: { onClose: () => void; inline?: boolean }) {
  const TOTAL = 5
  const [questions, setQuestions] = useState<string[]>(() => pickQuestions(TOTAL))
  const [step, setStep] = useState(0)
  const [inputVal, setInputVal] = useState('')

  const progress = step >= TOTAL ? 100 : Math.round((step / TOTAL) * 100)
  const done = step >= TOTAL

  function handleAnswer() {
    setInputVal('')
    setStep(step + 1)
  }

  function handleSkip() {
    // Replace current question with a fresh one not already in the list
    const replacement = pickQuestions(1, questions)
    if (replacement.length) {
      const updated = [...questions]
      updated[step] = replacement[0]
      setQuestions(updated)
    }
    setInputVal('')
  }

  if (inline) {
    return (
      <div className="checkin-inline">
        {done ? (
          <div className="checkin-inline-done">
            <Sparkles />
            <span className="checkin-inline-done-emoji">🌸</span>
            <span className="checkin-inline-done-text">Daily check-in complete!</span>
          </div>
        ) : (
          <>
            <div className="checkin-inline-top">
              <span className="checkin-inline-label">Daily check-in</span>
              <span className="checkin-inline-steps">{step + 1} / {TOTAL}</span>
            </div>
            <div className="checkin-progress-track checkin-inline-bar">
              <div className="checkin-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="checkin-inline-question">{questions[step]}</p>
            <textarea
              className="checkin-textarea checkin-inline-textarea"
              placeholder="Your answer…"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              rows={2}
            />
            <div className="checkin-inline-actions">
              <button className="checkin-skip" onClick={handleSkip}>
                Skip / I&apos;m not sure
              </button>
              <button
                className="checkin-inline-next"
                onClick={handleAnswer}
                disabled={!inputVal.trim()}
              >
                {step === TOTAL - 1 ? 'Finish' : 'Next'} <Icon name="arrow" size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="checkin-wrap">
      <div className="checkin-progress-track">
        <div className="checkin-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="checkin-step-label">
        {done ? '' : `Question ${step + 1} of ${TOTAL}`}
      </div>

      {done ? (
        <div className="checkin-done">
          <Sparkles />
          <div className="checkin-done-emoji">🌸</div>
          <h3>All done for today!</h3>
          <p>Thank you for sharing. These little moments matter.</p>
          <button className="primary-button" onClick={onClose}>
            Back to my day <Icon name="leaf" size={16} />
          </button>
        </div>
      ) : (
        <div className="checkin-question-wrap">
          <p className="checkin-question">{questions[step]}</p>
          <textarea
            className="checkin-textarea"
            placeholder="Type your answer here…"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            autoFocus
            rows={3}
          />
          <div className="checkin-actions">
            <button className="checkin-skip" onClick={handleSkip}>
              Skip / I&apos;m not sure
            </button>
            <button
              className="primary-button"
              onClick={handleAnswer}
              disabled={!inputVal.trim()}
            >
              Next <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App({ user, linkState, onRespondLinkRequest, onSignOut, onSwitch, reminders = [], todoChecked = {}, setTodoChecked, familyMembers, setFamilyMembers }: {
  user?: SessionUser
  linkState?: LinkState
  onRespondLinkRequest?: (requestId: string, decision: 'accept' | 'decline') => Promise<LinkActionResult>
  onSignOut?: () => Promise<void>
  onSwitch?: () => void
  reminders?: import('@/app/(frontend)/page').Reminder[]
  todoChecked?: Record<string, boolean>
  setTodoChecked?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  familyMembers?: import('@/app/(frontend)/page').FamilyMember[] | null
  setFamilyMembers?: React.Dispatch<React.SetStateAction<import('@/app/(frontend)/page').FamilyMember[]>>
}) {
  const screenRef = useRef<HTMLElement>(null)
  const displayName = user?.name?.trim() || 'Jamie Lewis'
  const firstName = displayName.split(/\s+/)[0] || 'Jamie'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'JL'
  const isLinked = Boolean(linkState?.linkedPartner)
  const patientCode = linkState?.patientCode || user?.patientCode || ''
  const incomingRequests = linkState?.incomingRequests ?? []
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [page, setPage] = useState('Overview')
  const [habits, setHabits] = useState(initialHabits)
  const [modal, setModal] = useState<string | null>(null)
  const [settingReminders, setSettingReminders] = useState(true)
  const [checkInDone, setCheckInDone] = useState(false)
  const [period, setPeriod] = useState('This week')
  const [mealTab, setMealTab] = useState('All meals')
  const [meals, setMeals] = useState([
    {
      name: 'Avocado toast & poached eggs',
      type: 'Breakfast',
      time: '8:30 AM',
      calories: 420,
      protein: 22,
      carbs: 38,
      fats: 20,
    },
    {
      name: 'Green goddess bowl',
      type: 'Lunch',
      time: '12:45 PM',
      calories: 535,
      protein: 28,
      carbs: 62,
      fats: 18,
    },
  ])
  const [activity, setActivity] = useState(6420)
  const [toast, setToast] = useState('')
  const [activeGame, setActiveGame] = useState<GameName | null>(null)
  const todayDisplayDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())
  const dayAfterTomorrow = new Date()
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
  const displayDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(dayAfterTomorrow)
  const dateValue = `${dayAfterTomorrow.getFullYear()}-${String(dayAfterTomorrow.getMonth() + 1).padStart(2, '0')}-${String(dayAfterTomorrow.getDate()).padStart(2, '0')}`
  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [page])
  useEffect(() => {
    if (!modal) return
    const screen = screenRef.current
    if (!screen) return
    const previous = screen.style.overflowY
    screen.style.overflowY = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModal(null)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      screen.style.overflowY = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [modal])
  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }
  function copyPatientCode() {
    if (!patientCode) return
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(patientCode).then(
        () => notify(`Copied ID ${patientCode}`),
        () => notify(`Your Patient ID is ${patientCode}`),
      )
    } else {
      notify(`Your Patient ID is ${patientCode}`)
    }
  }
  async function handleRespondInvite(requestId: string, decision: 'accept' | 'decline') {
    if (!onRespondLinkRequest) return
    setRespondingId(requestId)
    try {
      const result = await onRespondLinkRequest(requestId, decision)
      if (!result.ok) {
        notify(result.error || 'Could not update invite.')
      } else {
        notify(result.message || (decision === 'accept' ? 'Linked!' : 'Invite declined.'))
        if (decision === 'accept') setNotificationsOpen(false)
      }
    } finally {
      setRespondingId(null)
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (modal === 'Log a meal') {
      setMeals([
        ...meals,
        {
          name: String(data.get('name')),
          type: String(data.get('type')),
          time: 'Just now',
          calories: Number(data.get('calories')),
          protein: 15,
          carbs: 30,
          fats: 10,
        },
      ])
      notify('Your meal has been added to today\u2019s journal.')
    } else if (modal === 'Log activity') {
      setActivity(activity + Number(data.get('steps')))
      notify('A little movement, a little progress. Activity added!')
    } else if (modal === 'Add a to-do') {
      setHabits([
        ...habits,
        {
          title: String(data.get('name')),
          detail: 'Added by you',
          icon: 'heart',
          done: false,
        },
      ])
      notify('Your new to-do is ready for today.')
    } else {
      setSettingReminders(data.get('reminders') === 'on')
      notify('Your preferences have been updated.')
    }
    setModal(null)
  }
  return (
    <div className={`app-shell app-${page.toLowerCase().replaceAll(' ', '-')}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            setPage('Overview')
          }}
        >
          <span className="brand-symbol">
            <Icon name="leaf" size={27} />
          </span>
          bloom<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR WELLNESS SPACE</div>
        <nav aria-label="Main navigation">
          {[
            { name: 'Overview', label: 'Home', icon: 'grid' },
            { name: 'Games', label: 'Games', icon: 'games' },
            { name: 'Family tree', label: 'Family tree', icon: 'family' },
            { name: 'Food journal', label: 'Journal', icon: 'journal' },
          ].map((item) => (
            <button
              className={`nav-item ${page === item.name ? 'active' : ''}`}
              onClick={() => setPage(item.name)}
              aria-current={page === item.name ? 'page' : undefined}
              key={item.name}
            >
              <Icon name={item.icon} />
              {item.label}
              {page === item.name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="little-card">
            <div className="little-flower">
              <span />
              <span />
              <span />
              <span />
              <i />
            </div>
            <h3>
              Small steps.
              <br />A healthier you.
            </h3>
            <p>
              Progress isn\u2019t always a straight line.
              <br />
              Keep growing at your own pace.
            </p>
          </div>
          <button className="nav-item" onClick={() => setModal('Settings')}>
            <Icon name="settings" />
            Settings
          </button>
          <button className="nav-item" onClick={() => setModal('A little help')}>
            <Icon name="help" />
            Help & support
          </button>
          <button className="profile" onClick={() => setModal('Settings')}>
            <span className="avatar">{initials}</span>
            <span>
              <strong>
                {displayName}
                {patientCode && (
                  <span className="ml-1.5 inline-block rounded-md bg-[#eaf1e3] px-1.5 py-0.5 text-[9px] font-bold tracking-[0.4px] text-[#4e6b3f]">
                    {patientCode}
                  </span>
                )}
              </strong>
              <small>
                {linkState?.linkedPartner
                  ? `Linked with ${linkState.linkedPartner.name}`
                  : 'Patient account'}
              </small>
            </span>
            <Icon name="down" size={17} />
          </button>
        </div>
      </aside>

      <main ref={screenRef}>
        <div className="page-content">
          <section className="page-heading">
            <div>
              {page !== 'Family tree' && page !== 'Food journal' && (
                <div className="eyebrow">{todayDisplayDate.toUpperCase()}</div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <h1>
                  {page === 'Overview'
                    ? `Hi, ${firstName}!`
                    : page === 'Games'
                      ? 'Your games.'
                      : page === 'Family tree'
                        ? 'Your family tree.'
                        : page === 'Food journal'
                          ? ''
                          : 'Your life, one page at a time.'}
                  {page === 'Overview' && (
                    <span className="heading-spark" aria-hidden="true">
                      <Icon name="cloud" size={28} />
                    </span>
                  )}
                </h1>
                {page === 'Overview' && patientCode && (
                  <button
                    type="button"
                    onClick={copyPatientCode}
                    title="Copy your Patient ID"
                    aria-label={`Patient ID ${patientCode}. Click to copy.`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#d6e2c8] bg-[#eef5e6] px-2.5 py-1 text-[10px] font-bold tracking-[0.5px] text-[#46633a] transition hover:bg-[#e3edd8]"
                  >
                    <span className="text-[#788f67]">ID</span>
                    <span>{patientCode}</span>
                  </button>
                )}
              </div>
              {page !== 'Family tree' && page !== 'Food journal' && (
                <p>
                  {page === 'Overview'
                    ? 'It\u2019s chilly today, make sure to stay warm.'
                    : page === 'Games'
                      ? ''
                      : ''}
                </p>
              )}
            </div>
            {(onSignOut || onSwitch || onRespondLinkRequest) && (
              <div className="ct-header-right relative">
                {onRespondLinkRequest && (
                  <div className="relative">
                    <button
                      type="button"
                      className="ct-switch-btn relative"
                      onClick={() => setNotificationsOpen((open) => !open)}
                      title="Notifications"
                      aria-label={
                        incomingRequests.length > 0
                          ? `Notifications (${incomingRequests.length} link invite)`
                          : 'Notifications'
                      }
                    >
                      <Icon name="bell" size={16} />
                      {incomingRequests.length > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#d96c75] px-1 text-[9px] font-bold text-white shadow-xs">
                          {incomingRequests.length}
                        </span>
                      )}
                    </button>

                    {notificationsOpen && (
                      <div className="absolute right-0 top-11 z-40 w-[268px] rounded-[18px] border border-[#dfe6d6] bg-white p-4 shadow-[0_14px_40px_rgba(48,61,53,0.16)]">
                        <div className="flex items-center justify-between border-b border-[#edf1e7] pb-2.5">
                          <strong className="font-['Manrope'] text-[12px] font-bold text-[#3d513c]">
                            Notifications
                          </strong>
                          <button
                            type="button"
                            onClick={() => setNotificationsOpen(false)}
                            aria-label="Close notifications"
                            className="text-[#8a9483] hover:text-[#4e6149]"
                          >
                            <Icon name="close" size={14} />
                          </button>
                        </div>

                        {incomingRequests.length > 0 ? (
                          <div className="mt-3 space-y-2.5">
                            {incomingRequests.map((req) => (
                              <div
                                key={req.id}
                                className="rounded-[13px] border border-[#dce6d0] bg-[#f4f8ee] p-3"
                              >
                                <strong className="block text-[12px] font-semibold text-[#3c523a]">
                                  Caregiver link invite
                                </strong>
                                <p className="mt-1 text-[11px] leading-snug text-[#6c7b66]">
                                  <strong>{req.caregiverName}</strong> wants to link up with you as
                                  your caregiver.
                                </p>
                                <div className="mt-2.5 flex gap-2">
                                  <button
                                    type="button"
                                    disabled={respondingId === req.id}
                                    onClick={() => void handleRespondInvite(req.id, 'accept')}
                                    className="flex-1 rounded-[10px] bg-[#5f7d4d] py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
                                  >
                                    {respondingId === req.id ? 'Linking…' : 'Accept'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={respondingId === req.id}
                                    onClick={() => void handleRespondInvite(req.id, 'decline')}
                                    className="rounded-[10px] border border-[#dce2d5] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#74806d] disabled:opacity-60"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-[11px] text-[#889481]">
                            {linkState?.linkedPartner
                              ? `You\u2019re linked with ${linkState.linkedPartner.name}. No new notifications.`
                              : 'No new notifications yet.'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {onSignOut ? (
                  <form action={onSignOut}>
                    <button
                      type="submit"
                      className="ct-switch-btn"
                      title="Sign out"
                      aria-label="Sign out"
                    >
                      <Icon name="logout" size={16} />
                    </button>
                  </form>
                ) : onSwitch ? (
                  <button className="ct-switch-btn" onClick={onSwitch} title="Switch to caretaker view">
                    <Icon name="users" size={16} />
                  </button>
                ) : null}
              </div>
            )}
          </section>

          {!isLinked && incomingRequests.length > 0 && (
            <section
              className="mb-4 rounded-[20px] border border-[#cfe0be] bg-[#eef5e6] p-4 shadow-xs"
              role="region"
              aria-label="Caregiver link invite notification"
            >
              {incomingRequests.map((req) => (
                <div key={req.id} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white text-[#5d7b49] shadow-2xs">
                      <Icon name="bell" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block text-[9px] font-bold uppercase tracking-[1px] text-[#6d855c]">
                        Caregiver invite
                      </span>
                      <strong className="mt-0.5 block font-['Manrope'] text-[14px] font-bold text-[#384d36]">
                        {req.caregiverName} wants to link up with you
                      </strong>
                      <p className="mt-0.5 text-[11px] leading-snug text-[#6a7a63]">
                        Accept this invite to unlock all features together.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={respondingId === req.id}
                      onClick={() => void handleRespondInvite(req.id, 'accept')}
                      className="flex min-h-10 flex-1 items-center justify-center rounded-[12px] bg-[#5f7d4d] px-4 text-[12px] font-semibold text-white hover:bg-[#526e41] disabled:opacity-60"
                    >
                      {respondingId === req.id ? 'Linking…' : 'Accept invite'}
                    </button>
                    <button
                      type="button"
                      disabled={respondingId === req.id}
                      onClick={() => void handleRespondInvite(req.id, 'decline')}
                      className="flex min-h-10 items-center justify-center rounded-[12px] border border-[#d6e0ca] bg-white px-4 text-[12px] font-semibold text-[#6f7c68] disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {!isLinked ? (
            <LinkGateCard
              role="patient"
              patientCode={patientCode}
              hasIncomingInvite={incomingRequests.length > 0}
              onCopyCode={copyPatientCode}
            />
          ) : (
            <>
              {(page === 'Overview' || page === 'My progress') && (
                <>
                  <div className="intro-grid">
                    <section className="welcome-card">
                      <div className="welcome-copy">
                        <span className="pill">
                          <span />
                          YOUR DAILY BLOOM
                        </span>
                        <h2>
                          A little balance.
                          <br />A lot of possibility.
                        </h2>
                        <p>
                          You\u2019re showing up for yourself.
                          <br />
                          And that\u2019s a beautiful place to start.
                        </p>
                        <button onClick={() => setPage('Daily habits')}>
                          Let\u2019s keep growing <Icon name="arrow" size={17} />
                        </button>
                      </div>
                      <div className="garden" aria-hidden="true">
                        <div className="garden-ring ring-one" />
                        <div className="garden-ring ring-two" />
                        <div className="garden-sun" />
                        <svg className="plant" viewBox="0 0 260 290" fill="none">
                          <path d="M128 271c-4-63 16-117 15-205" stroke="#497056" strokeWidth="4" />
                          <path d="M142 104C90 110 69 62 83 33c46-2 67 30 59 71Z" fill="#759B69" />
                          <path d="M141 143c-1-55 35-87 79-77 0 44-33 83-79 77Z" fill="#91B5A1" />
                          <path d="M135 185C74 184 46 147 54 110c48-1 83 28 81 75Z" fill="#B1C896" />
                          <path d="M133 215c1-48 39-76 81-63-6 44-35 69-81 63Z" fill="#64866D" />
                          <path
                            d="M142 104 94 49m47 95 61-62m-68 103-63-59m63 88 62-48"
                            stroke="#50775B"
                            strokeWidth="1.5"
                            opacity=".5"
                          />
                          <path d="M95 236h73l-10 49h-54l-9-49Z" fill="#DDE7CB" />
                          <path d="M92 236h79" stroke="#C8D5B7" strokeWidth="7" strokeLinecap="round" />
                        </svg>
                        <span className="garden-spark s1">+</span>
                        <span className="garden-spark s2">+</span>
                        <span className="garden-small-circle" />
                      </div>
                    </section>
                  </div>

                </>
              )}

              {page === 'Games' && <GameCards onPlay={(game) => setActiveGame(game)} />}

              {page === 'Family tree' && (
                <FamilyTree
                  members={familyMembers ?? undefined}
                  setMembers={setFamilyMembers}
                />
              )}

              {page === 'Food journal' && <Journal />}

              <div
                className={`lower-grid ${page === 'My progress' || page === 'Daily habits' || page === 'Food journal' ? 'single-view' : ''}`}
              >
                {(page === 'Overview' || page === 'My progress') && (
                  <section className="panel weekly-panel">
                    <div className="section-top">
                      <div>
                        <h3>Your week in balance</h3>
                        <p>A little consistency goes a long way.</p>
                      </div>
                      <select
                        aria-label="Chart period"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                      >
                        <option>This week</option>
                        <option>Last week</option>
                      </select>
                    </div>
                    <div className="chart-legend">
                      <span>
                        <i />
                        Movement
                      </span>
                      <span>
                        <i />
                        Hydration
                      </span>
                    </div>
                    <div className="chart">
                      <div className="chart-labels">
                        <span>100%</span>
                        <span>75%</span>
                        <span>50%</span>
                        <span>25%</span>
                      </div>
                      <div className="chart-plot">
                        <div className="grid-lines">
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                          <div className={`chart-day ${i === 0 ? 'today' : ''}`} key={day}>
                            <div className="bar-pair">
                              <span
                                style={{
                                  height: `${(period === 'This week' ? [66, 80, 61, 90, 71, 96, 45] : [45, 56, 75, 60, 83, 76, 67])[i]}%`,
                                }}
                              />
                              <span style={{ height: `${[53, 65, 73, 64, 86, 79, 58][i]}%` }} />
                            </div>
                            <small>{day}</small>
                            {i === 0 && <b />}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="chart-note">
                      <span className="trend-icon">
                        <Icon name="chart" size={16} />
                      </span>
                      <span>
                        <strong>12% more balanced</strong> than last week. Look at you grow.
                      </span>
                    </div>
                  </section>
                )}

                {(page === 'Overview' || page === 'Daily habits') && (
                  <section className="panel habits-panel">
                    <div className="section-top">
                      <div>
                        <h3>To-do list</h3>
                        <p></p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setModal('Add a to-do')}
                      >
                        Add to-do
                        <Icon name="plus" size={16} />
                      </button>
                    </div>
                    <div className="habit-list">
                      <div className="habit-row habit-row-checkin">
                        <DailyCheckIn
                          inline
                          onClose={() => {
                            setCheckInDone(true)
                            setTodoChecked?.((prev) => ({ ...prev, checkin: true }))
                          }}
                        />
                      </div>
                      {reminders.map((r) => (
                        <div
                          className={`habit-row habit-row-reminder${todoChecked[String(r.id)] ? ' done' : ''}`}
                          key={r.id}
                        >
                          <button
                            className="habit-checkbox"
                            aria-label={todoChecked[String(r.id)] ? 'Mark incomplete' : 'Mark complete'}
                            onClick={() =>
                              setTodoChecked?.((prev) => ({
                                ...prev,
                                [String(r.id)]: !prev[String(r.id)],
                              }))
                            }
                          >
                            {todoChecked[String(r.id)] && <Icon name="check" size={12} />}
                          </button>
                          <span className="habit-icon habit-icon-0">
                            <Icon name="bell" size={20} />
                          </span>
                          <span className="habit-text">
                            <strong>{r.text}</strong>
                            <small>{r.time} &middot; {r.days}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {page === 'Overview' && (
                  <section className="panel food-panel">
                    <div className="section-top">
                      <div className="food-title">
                        <span className="food-title-icon">
                          <Icon name="fork" size={20} />
                        </span>
                        <div>
                          <h3>A little nourishment</h3>
                          <p>Good food. Good energy. Good you.</p>
                        </div>
                      </div>
                      <button className="log-meal-button" onClick={() => setModal('Log a meal')}>
                        <Icon name="plus" size={16} />
                        Log a meal
                      </button>
                    </div>
                    <div className="food-tabs">
                      {['All meals', 'Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((tab) => (
                        <button
                          key={tab}
                          className={mealTab === tab ? 'selected' : ''}
                          onClick={() => setMealTab(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="meal-table">
                      <div className="table-head">
                        <span>MEAL</span>
                        <span>CALORIES</span>
                        <span>PROTEIN</span>
                        <span>CARBS</span>
                        <span>FATS</span>
                        <span />
                      </div>
                      {meals
                        .filter((m) => mealTab === 'All meals' || m.type === mealTab)
                        .map((meal, i) => (
                          <div className="meal-row" key={i}>
                            <div className="meal-info">
                              <div className={`meal-art meal-art-${i % 2}`}>
                                <Icon name={i % 2 ? 'leaf' : 'sun'} size={26} />
                              </div>
                              <div>
                                <strong>{meal.name}</strong>
                                <small>
                                  {meal.type}
                                  <span>&middot;</span>
                                  {meal.time}
                                </small>
                              </div>
                            </div>
                            <span>
                              {meal.calories}
                              <small> kcal</small>
                            </span>
                            <span>
                              {meal.protein}
                              <small> g</small>
                            </span>
                            <span>
                              {meal.carbs}
                              <small> g</small>
                            </span>
                            <span>
                              {meal.fats}
                              <small> g</small>
                            </span>
                            <Icon name="check" size={17} />
                          </div>
                        ))}
                      {meals.filter((m) => mealTab === 'All meals' || m.type === mealTab).length ===
                        0 && (
                          <div className="empty-meals">
                            A fresh page for your {mealTab.toLowerCase()}.{' '}
                            <button onClick={() => setModal('Log a meal')}>
                              Log your first meal <Icon name="plus" size={14} />
                            </button>
                          </div>
                        )}
                    </div>
                  </section>
                )}
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              <Icon name="leaf" size={14} /> Made for your kind of balance.
            </span>
            <span>One day at a time. One bloom at a time.</span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={17} />
          </span>
          {toast}
          <button onClick={() => setToast('')} aria-label="Dismiss">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {activeGame && (
        <div className="game-fullscreen" role="dialog" aria-modal="true" aria-label={activeGame}>
          <div className="game-fullscreen-header">
            <span className="game-fullscreen-title">{activeGame}</span>
            <button
              className="game-fullscreen-exit"
              onClick={() => setActiveGame(null)}
              aria-label="Exit game"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="game-fullscreen-body">
            <Game key={activeGame} name={activeGame} />
          </div>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              onClick={() => setModal(null)}
              aria-label="Close dialog"
            >
              <Icon name="close" />
            </button>
            {modal !== 'Daily check-in' && (
              <span className="modal-leaf">
                <Icon name="leaf" size={25} />
              </span>
            )}
            <h2 id="modal-title" className={modal === 'Daily check-in' ? 'checkin-modal-title' : ''}>{modal}</h2>
            {gameNames.includes(modal as GameName) ? (
              null
            ) : modal === 'Daily check-in' ? (
              <DailyCheckIn onClose={() => { setCheckInDone(true); setTodoChecked?.((prev) => ({ ...prev, checkin: true })); setModal(null) }} />
            ) : modal === 'A little help' ? (
              <>
                <p>
                  Bloom is your little space for everyday wellbeing. Add water with the + button,
                  log a meal, and check off habits as you go.
                </p>
                <p>
                  This is a daily demo: your changes stay with you until you refresh. Take it at
                  your own pace.
                </p>
                <button className="primary-button" onClick={() => setModal(null)}>
                  Got it, let\u2019s grow
                </button>
              </>
            ) : modal === 'Take Bloom with you' ? (
              <>
                <p>
                  Your little wellness space, right on your home screen. Open the published Bloom
                  link on your phone to get started.
                </p>
                <div className="install-step">
                  <strong>On iPhone</strong>
                  <p>
                    Open in Safari, tap Share, then choose Add to Home Screen. Turn on Open as Web
                    App if offered, then tap Add.
                  </p>
                </div>
                <div className="install-step">
                  <strong>On Android</strong>
                  <p>
                    Open in Chrome, tap the three-dot menu, then Install app or Add to Home screen.
                  </p>
                </div>
                <p className="form-hint">
                  This installs a web app, not an App Store download. Daily demo entries still reset
                  when the app reloads.
                </p>
                <button className="primary-button" onClick={() => setModal(null)}>
                  Back to my bloom
                  <Icon name="leaf" size={17} />
                </button>
              </>
            ) : modal === 'Choose a date' ? (
              <>
                <p>Your wellness snapshot for {displayDate}.</p>
                <input type="date" defaultValue={dateValue} max={dateValue} min={dateValue} />
                <p className="form-hint">This daily demo has an entry for {displayDate}.</p>
                <button className="primary-button" onClick={() => setModal(null)}>
                  Back to my day
                </button>
              </>
            ) : (
              <form onSubmit={submit}>
                <p>
                  {modal === 'Log a meal'
                    ? 'A little goodness for your food journal.'
                    : modal === 'Log activity'
                      ? 'Every step counts. Add a little movement.'
                      : modal === 'Add a to-do'
                        ? 'Make a little space for something good.'
                        : 'Make this little space your own.'}
                </p>
                {modal === 'Log a meal' ? (
                  <>
                    <label>
                      What did you have?
                      <input
                        name="name"
                        placeholder="e.g. A colorful veggie bowl"
                        required
                        autoFocus
                      />
                    </label>
                    <div className="form-columns">
                      <label>
                        Meal
                        <select name="type">
                          {['Breakfast', 'Lunch', 'Dinner', 'Snacks'].map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Calories
                        <input
                          name="calories"
                          type="number"
                          min="1"
                          max="5000"
                          placeholder="350"
                          required
                        />
                      </label>
                    </div>
                  </>
                ) : modal === 'Log activity' ? (
                  <label>
                    Steps to add
                    <input
                      name="steps"
                      type="number"
                      min="1"
                      max="100000"
                      placeholder="1500"
                      required
                      autoFocus
                    />
                  </label>
                ) : modal === 'Add a to-do' ? (
                  <label>
                    What do you need to do?
                    <input name="name" placeholder="e.g. Call Sarah at 3 PM" required autoFocus />
                  </label>
                ) : (
                  <>
                    <label>
                      Your name
                      <input defaultValue={displayName} readOnly />
                    </label>
                    <label className="checkbox-label">
                      <input name="reminders" type="checkbox" defaultChecked={settingReminders} /> Show
                      daily wellness reminders
                    </label>
                    <p className="form-hint">Preferences apply for this session.</p>
                  </>
                )}
                <button className="primary-button" type="submit">
                  {modal === 'Settings'
                    ? 'Save preferences'
                    : modal === 'Add a to-do'
                      ? 'Add to my list'
                      : 'Add to my day'}
                  <Icon name="arrow" size={17} />
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
