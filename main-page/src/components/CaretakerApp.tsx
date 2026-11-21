'use client'

import { useEffect, useRef, useState } from 'react'
import FamilyTree from './FamilyTree'
import type { Reminder, FamilyMember } from '@/app/(frontend)/page'

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
    leaf: (
      <>
        <path d="M20 3C9 2 2 7 5 15s17 5 15-12Z" />
        <path d="M3 22 15 9" />
      </>
    ),
    bell: <path d="M5 17h14l-2-4V9a5 5 0 0 0-10 0v4l-2 4ZM10 21h4" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    users: (
      <>
        <circle cx="8" cy="8" r="4" />
        <path d="M2 20c0-4 2.7-7 6-7s6 3 6 7" />
        <path d="M17 11c1.7 0 3 1.3 3 3s-1.3 3-3 3" />
        <path d="M22 20c0-2.5-1.5-4.5-3-5" />
      </>
    ),
    camera: (
      <>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
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
    settings: (
      <>
        <path d="m9 3-1 3-3 1-2 4 2 3v4l4 2 3-1 3 1 4-2v-4l2-3-2-4-3-1-1-3Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    checklist: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
    quiz: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6m4-6v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      </>
    ),
    edit: (
      <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
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
      {paths[name] ?? paths.leaf}
    </svg>
  )
}

const PATIENT = { name: 'Jamie Lewis', initials: 'JL', since: 'March 2024' }

// ── Shared state types ────────────────────────────────────────────────────────

type QuizQuestion = { id: number; text: string }

const initialQuizQuestions: QuizQuestion[] = [
  { id: 1, text: 'What is your favourite colour?' },
  { id: 2, text: 'What did you have for breakfast?' },
]

// Simulated picture-day photos (would come from shared storage in a real app)
const SAMPLE_PHOTOS: { prompt: string; src: string }[] = []

// ── Overview (Home) page ──────────────────────────────────────────────────────

function OverviewPage({
  reminders,
  setReminders,
  quizQuestions,
  setQuizQuestions,
  todoChecked,
}: {
  reminders: Reminder[]
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>
  quizQuestions: QuizQuestion[]
  setQuizQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>
  todoChecked: Record<string, boolean>
}) {
  // Reminder form state
  const [reminderText, setReminderText] = useState('')
  const [reminderTime, setReminderTime] = useState('')
  const [reminderDays, setReminderDays] = useState('Daily')
  const [showReminderForm, setShowReminderForm] = useState(false)
  // Quiz question form state
  const [quizText, setQuizText] = useState('')
  const [showQuizForm, setShowQuizForm] = useState(false)
  // Editing reminder
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)

  function addReminder() {
    if (!reminderText.trim()) return
    setReminders((prev) => [
      ...prev,
      { id: Date.now(), text: reminderText.trim(), time: reminderTime || 'Anytime', days: reminderDays },
    ])
    setReminderText('')
    setReminderTime('')
    setReminderDays('Daily')
    setShowReminderForm(false)
  }

  function saveEditReminder() {
    if (!editingReminder || !editingReminder.text.trim()) return
    setReminders((prev) => prev.map((r) => (r.id === editingReminder.id ? editingReminder : r)))
    setEditingReminder(null)
  }

  function addQuizQuestion() {
    if (!quizText.trim()) return
    setQuizQuestions((prev) => [...prev, { id: Date.now(), text: quizText.trim() }])
    setQuizText('')
    setShowQuizForm(false)
  }

  // Fake to-do items as the patient sees them (read-only)
  return (
    <>
      {/* Patient card — no condition/stage */}
      <div className="ct-patient-card">
        <div className="ct-patient-avatar">{PATIENT.initials}</div>
        <div className="ct-patient-info">
          <strong>{PATIENT.name}</strong>
          <span className="ct-patient-since">In care since {PATIENT.since}</span>
        </div>
      </div>

      {/* To-do list (read-only view) */}
      <div className="ct-panel">
        <div className="ct-panel-top">
          <div>
            <h3>Jamie&rsquo;s to-do list</h3>
            <p className="ct-panel-sub">What Jamie sees today</p>
          </div>
        </div>
        <ul className="ct-todo-list">
          {/* Daily check-in — status tracked via 'checkin' key */}
          <li className={`ct-todo-row ${todoChecked['checkin'] ? 'ct-todo-done' : ''}`}>
            <span className="ct-todo-icon">
              <Icon name="quiz" size={15} />
            </span>
            <div className="ct-todo-info">
              <span>Daily check-in</span>
              <small>5 questions</small>
            </div>
            <span className={`ct-todo-status ${todoChecked['checkin'] ? 'ct-todo-status-done' : 'ct-todo-status-pending'}`}>
              {todoChecked['checkin'] ? 'Done' : 'Pending'}
            </span>
          </li>
          {/* Caretaker-set reminders with live checked state */}
          {reminders.length === 0 ? (
            <li className="ct-todo-row">
              <span className="ct-todo-icon"><Icon name="bell" size={15} /></span>
              <div className="ct-todo-info">
                <span style={{ color: '#b2bcaa', fontStyle: 'italic' }}>No reminders set yet</span>
              </div>
            </li>
          ) : (
            reminders.map((r) => {
              const done = !!todoChecked[String(r.id)]
              return (
                <li key={r.id} className={`ct-todo-row ${done ? 'ct-todo-done' : ''}`}>
                  <span className="ct-todo-icon">
                    <Icon name="bell" size={15} />
                  </span>
                  <div className="ct-todo-info">
                    <span>{r.text}</span>
                    <small>{r.time} &middot; {r.days}</small>
                  </div>
                  <span className={`ct-todo-status ${done ? 'ct-todo-status-done' : 'ct-todo-status-pending'}`}>
                    {done ? 'Done' : 'Pending'}
                  </span>
                </li>
              )
            })
          )}
        </ul>
      </div>

      {/* Reminders */}
      <div className="ct-panel">
        <div className="ct-panel-top">
          <div>
            <h3>Reminders</h3>
            <p className="ct-panel-sub">Appear in Jamie&rsquo;s to-do list</p>
          </div>
          <button className="ct-text-btn" onClick={() => { setShowReminderForm((v) => !v); setEditingReminder(null) }}>
            <Icon name="plus" size={15} /> Add
          </button>
        </div>

        {showReminderForm && (
          <div className="ct-inline-form">
            <input
              className="ct-inline-input"
              placeholder="e.g. Afternoon walk"
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              autoFocus
            />
            <div className="ct-inline-row">
              <input
                className="ct-inline-input ct-inline-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
              <select
                className="ct-select ct-inline-select"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
              >
                <option>Daily</option>
                <option>Weekdays</option>
                <option>Weekends</option>
                <option>Weekly</option>
              </select>
            </div>
            <div className="ct-inline-actions">
              <button className="ct-text-btn" onClick={() => setShowReminderForm(false)}>Cancel</button>
              <button className="ct-action-save" onClick={addReminder}>Save reminder</button>
            </div>
          </div>
        )}

        {editingReminder && (
          <div className="ct-inline-form">
            <input
              className="ct-inline-input"
              value={editingReminder.text}
              onChange={(e) => setEditingReminder({ ...editingReminder, text: e.target.value })}
              autoFocus
            />
            <div className="ct-inline-row">
              <input
                className="ct-inline-input ct-inline-time"
                type="time"
                value={editingReminder.time.includes(':') ? editingReminder.time : ''}
                onChange={(e) => setEditingReminder({ ...editingReminder, time: e.target.value || 'Anytime' })}
              />
              <select
                className="ct-select ct-inline-select"
                value={editingReminder.days}
                onChange={(e) => setEditingReminder({ ...editingReminder, days: e.target.value })}
              >
                <option>Daily</option>
                <option>Weekdays</option>
                <option>Weekends</option>
                <option>Weekly</option>
              </select>
            </div>
            <div className="ct-inline-actions">
              <button className="ct-text-btn" onClick={() => setEditingReminder(null)}>Cancel</button>
              <button className="ct-action-save" onClick={saveEditReminder}>Save changes</button>
            </div>
          </div>
        )}

        {reminders.length === 0 && !showReminderForm ? (
          <div className="ct-empty">No reminders yet.</div>
        ) : (
          <ul className="ct-reminder-list">
            {reminders.map((r) => (
              <li className="ct-reminder-row" key={r.id}>
                <span className="ct-reminder-icon"><Icon name="bell" size={15} /></span>
                <div className="ct-reminder-info">
                  <strong>{r.text}</strong>
                  <small>{r.time} &middot; {r.days}</small>
                </div>
                <div className="ct-reminder-actions">
                  <button className="ct-dismiss" aria-label="Edit reminder" onClick={() => { setEditingReminder(r); setShowReminderForm(false) }}>
                    <Icon name="edit" size={13} />
                  </button>
                  <button className="ct-dismiss" aria-label="Delete reminder" onClick={() => setReminders((prev) => prev.filter((x) => x.id !== r.id))}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Personalized quiz questions */}
      <div className="ct-panel">
        <div className="ct-panel-top">
          <div>
            <h3>Personalized check-in questions</h3>
            <p className="ct-panel-sub">Added to Jamie&rsquo;s daily check-in pool</p>
          </div>
          <button className="ct-text-btn" onClick={() => setShowQuizForm((v) => !v)}>
            <Icon name="plus" size={15} /> Add
          </button>
        </div>

        {showQuizForm && (
          <div className="ct-inline-form">
            <input
              className="ct-inline-input"
              placeholder="e.g. What did you enjoy today?"
              value={quizText}
              onChange={(e) => setQuizText(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') addQuizQuestion() }}
            />
            <div className="ct-inline-actions">
              <button className="ct-text-btn" onClick={() => { setShowQuizForm(false); setQuizText('') }}>Cancel</button>
              <button className="ct-action-save" onClick={addQuizQuestion}>Save question</button>
            </div>
          </div>
        )}

        {quizQuestions.length === 0 && !showQuizForm ? (
          <div className="ct-empty">No personalized questions yet.</div>
        ) : (
          <ul className="ct-quiz-list">
            {quizQuestions.map((q) => (
              <li className="ct-quiz-row" key={q.id}>
                <span className="ct-quiz-icon"><Icon name="quiz" size={15} /></span>
                <span className="ct-quiz-text">{q.text}</span>
                <button
                  className="ct-dismiss"
                  aria-label="Remove question"
                  onClick={() => setQuizQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                >
                  <Icon name="trash" size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

// ── Picture Day review page ───────────────────────────────────────────────────

function PictureReviewPage() {
  const [photos] = useState<{ prompt: string; src: string }[]>(SAMPLE_PHOTOS)
  return (
    <div className="ct-panel">
      <div className="ct-panel-top">
        <div>
          <h3>Picture day</h3>
          <p className="ct-panel-sub">Photos taken by Jamie</p>
        </div>
      </div>
      {photos.length === 0 ? (
        <div className="ct-picture-empty">
          <span className="ct-picture-empty-icon"><Icon name="camera" size={30} /></span>
          <p>No pictures yet. Jamie hasn&rsquo;t completed a picture day session.</p>
        </div>
      ) : (
        <div className="ct-picture-grid">
          {photos.map((p, i) => (
            <div className="ct-picture-item" key={i}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.prompt} />
              <span>{p.prompt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Settings page ─────────────────────────────────────────────────────────────

const LANGUAGES = [
  'English', 'French', 'Spanish', 'Portuguese', 'Arabic',
  'Mandarin', 'Cantonese', 'Italian', 'German', 'Dutch',
]

function SettingsPage({
  patientLang,
  setPatientLang,
  caretakerLang,
  setCaretakerLang,
  outsidePictureDay,
  setOutsidePictureDay,
}: {
  patientLang: string
  setPatientLang: (v: string) => void
  caretakerLang: string
  setCaretakerLang: (v: string) => void
  outsidePictureDay: boolean
  setOutsidePictureDay: (v: boolean) => void
}) {
  return (
    <>
      <div className="ct-panel">
        <div className="ct-panel-top">
          <div>
            <h3>Language</h3>
            <p className="ct-panel-sub">Set the display language for each user</p>
          </div>
        </div>
        <div className="ct-settings-rows">
          <div className="ct-settings-row">
            <div className="ct-settings-label">
              <span className="ct-settings-icon"><Icon name="globe" size={16} /></span>
              <div>
                <strong>Jamie&rsquo;s language</strong>
                <small>What the patient sees</small>
              </div>
            </div>
            <select
              className="ct-select"
              value={patientLang}
              onChange={(e) => setPatientLang(e.target.value)}
              aria-label="Patient language"
            >
              {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="ct-settings-row">
            <div className="ct-settings-label">
              <span className="ct-settings-icon"><Icon name="globe" size={16} /></span>
              <div>
                <strong>Your language</strong>
                <small>What you see as caretaker</small>
              </div>
            </div>
            <select
              className="ct-select"
              value={caretakerLang}
              onChange={(e) => setCaretakerLang(e.target.value)}
              aria-label="Caretaker language"
            >
              {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="ct-panel">
        <div className="ct-panel-top">
          <div>
            <h3>Picture day</h3>
            <p className="ct-panel-sub">Control where picture day is available</p>
          </div>
        </div>
        <div className="ct-settings-rows">
          <div className="ct-settings-row">
            <div className="ct-settings-label">
              <span className="ct-settings-icon"><Icon name="camera" size={16} /></span>
              <div>
                <strong>Outside picture day</strong>
                <small>Jamie can take pictures outdoors</small>
              </div>
            </div>
            <button
              className={`ct-toggle ${outsidePictureDay ? 'ct-toggle-on' : ''}`}
              role="switch"
              aria-checked={outsidePictureDay}
              onClick={() => setOutsidePictureDay(!outsidePictureDay)}
            >
              <span className="ct-toggle-thumb" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

type CTPage = 'Overview' | 'Pictures' | 'Family' | 'Settings'

export default function CaretakerApp({
  onSwitch,
  reminders,
  setReminders,
  todoChecked,
  familyMembers,
  setFamilyMembers,
}: {
  onSwitch: () => void
  reminders: Reminder[]
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>
  todoChecked: Record<string, boolean>
  familyMembers: FamilyMember[] | null
  setFamilyMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>
}) {
  const screenRef = useRef<HTMLElement>(null)
  const [page, setPage] = useState<CTPage>('Overview')
  const [toast, setToast] = useState('')

  // Local state only for this app
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(initialQuizQuestions)
  const [patientLang, setPatientLang] = useState('English')
  const [caretakerLang, setCaretakerLang] = useState('English')
  const [outsidePictureDay, setOutsidePictureDay] = useState(false)

  useEffect(() => { screenRef.current?.scrollTo({ top: 0, behavior: 'instant' }) }, [page])

  function notify(msg: string) { setToast(msg); window.setTimeout(() => setToast(''), 3200) }

  const pageMeta: Record<CTPage, { title: string; sub: string }> = {
    Overview:  { title: 'Good morning, Alex.', sub: 'Here\u2019s how Jamie is doing today.' },
    Pictures:  { title: 'Picture day.',         sub: 'Review photos Jamie has taken.' },
    Family:    { title: 'Family tree.',          sub: 'View and edit Jamie\u2019s family tree.' },
    Settings:  { title: 'Settings.',             sub: 'Language and app preferences.' },
  }

  const navItems: { name: CTPage; icon: string; label: string }[] = [
    { name: 'Overview', icon: 'grid',      label: 'Overview'    },
    { name: 'Pictures', icon: 'camera',    label: 'Pictures'    },
    { name: 'Family',   icon: 'family',    label: 'Family tree' },
    { name: 'Settings', icon: 'settings',  label: 'Settings'    },
  ]

  return (
    <div className="app-shell ct-shell">
      <aside className="sidebar">
        <nav aria-label="Caretaker navigation">
          {navItems.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${page === item.name ? 'active' : ''}`}
              onClick={() => setPage(item.name)}
              aria-current={page === item.name ? 'page' : undefined}
            >
              <Icon name={item.icon} />
              {item.label}
              {page === item.name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
      </aside>

      <main ref={screenRef}>
        <div className="page-content">
          <section className="page-heading">
            <div>
              <div className="eyebrow ct-eyebrow">CARETAKER VIEW</div>
              <h1>
                {pageMeta[page].title}
                <span className="heading-spark"><Icon name="leaf" size={26} /></span>
              </h1>
              <p>{pageMeta[page].sub}</p>
            </div>
            <div className="ct-header-right">
              <button className="date-button" aria-label="Notifications" onClick={() => notify('No new notifications.')}>
                <Icon name="bell" size={20} />
              </button>
              <button className="ct-switch-btn" onClick={onSwitch} title="Switch to patient view" aria-label="Switch to patient view">
                <Icon name="users" size={16} />
              </button>
            </div>
          </section>

          {page === 'Overview' && (
            <OverviewPage
              reminders={reminders}
              setReminders={setReminders}
              quizQuestions={quizQuestions}
              setQuizQuestions={setQuizQuestions}
              todoChecked={todoChecked}
            />
          )}
          {page === 'Pictures' && <PictureReviewPage />}
          {page === 'Family' && (
            <FamilyTree
              members={familyMembers ?? undefined}
              setMembers={setFamilyMembers}
            />
          )}
          {page === 'Settings' && (
            <SettingsPage
              patientLang={patientLang}
              setPatientLang={setPatientLang}
              caretakerLang={caretakerLang}
              setCaretakerLang={setCaretakerLang}
              outsidePictureDay={outsidePictureDay}
              setOutsidePictureDay={setOutsidePictureDay}
            />
          )}

          <footer className="page-footer">
            <span><Icon name="leaf" size={14} /> Caring with intention.</span>
            <span>releaf. caretaker</span>
          </footer>
        </div>
      </main>

      {toast && (
        <div className="toast" role="status">
          <span><Icon name="check" size={17} /></span>
          {toast}
          <button onClick={() => setToast('')} aria-label="Dismiss"><Icon name="close" size={16} /></button>
        </div>
      )}
    </div>
  )
}
