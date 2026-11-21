'use client'

import { useEffect, useRef, useState } from 'react'

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
    chart: <path d="M4 4v16h17M8 14l4-5 4 3 5-7" />,
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
    heart: <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1s-1 7 8 14c9-7 11-11 8-14Z" />,
    users: (
      <>
        <circle cx="8" cy="8" r="4" />
        <path d="M2 20c0-4 2.7-7 6-7s6 3 6 7" />
        <path d="M17 11c1.7 0 3 1.3 3 3s-1.3 3-3 3" />
        <path d="M22 20c0-2.5-1.5-4.5-3-5" />
      </>
    ),
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
    game: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <path d="M6 12h4m-2-2v4m7-1h.01M15 11h.01" />
      </>
    ),
    fork: (
      <>
        <path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v19M20 3c-5 3-5 10 0 10m0-10v19" />
      </>
    ),
    message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    clip: (
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
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

const PATIENT = { name: 'Jamie Lewis', initials: 'JL', age: 72, condition: 'Early-stage dementia', since: 'March 2024' }

type Alert = { id: number; kind: 'warning' | 'info' | 'good'; text: string; time: string }
const initialAlerts: Alert[] = [
  { id: 1, kind: 'warning', text: 'Jamie missed today\u2019s morning water habit.', time: '9:14 AM' },
  { id: 2, kind: 'info', text: 'Colouring game completed \u2014 100%.', time: '10:32 AM' },
  { id: 3, kind: 'good', text: 'All three meals logged for yesterday.', time: 'Yesterday' },
]

type Note = { id: number; text: string; author: string; date: string }
const initialNotes: Note[] = [
  { id: 1, text: 'Jamie was in great spirits during our Tuesday visit. Mentioned enjoying the colouring game.', author: 'Dr. Rivera', date: 'Tue' },
  { id: 2, text: 'Remind Jamie about the afternoon walk \u2014 she tends to skip it on cold days.', author: 'You', date: 'Mon' },
]

const moodHistory = [
  { day: 'Mon', mood: 4 }, { day: 'Tue', mood: 5 }, { day: 'Wed', mood: 3 },
  { day: 'Thu', mood: 4 }, { day: 'Fri', mood: 4 }, { day: 'Sat', mood: 5 }, { day: 'Sun', mood: 2 },
]

const gameActivity = [
  { name: 'Counting boxes', completions: 5, lastPlayed: 'Today', trend: +2 },
  { name: 'Colouring game', completions: 3, lastPlayed: 'Today', trend: 0 },
  { name: 'Find the differences', completions: 2, lastPlayed: 'Yesterday', trend: -1 },
  { name: 'Picture day', completions: 1, lastPlayed: '3 days ago', trend: +1 },
]

const habitRate = [66, 83, 50, 100, 83, 66, 33]

function MoodDot({ level }: { level: number }) {
  const colours = ['', '#e8b5b5', '#e8ccb5', '#e8e1b5', '#c8deb5', '#a8d4a8']
  return <span className="mood-dot" style={{ background: colours[level] ?? colours[3] }} aria-label={`Mood ${level} of 5`} />
}

function AlertBadge({ kind }: { kind: Alert['kind'] }) {
  if (kind === 'warning') return <span className="ct-alert-badge ct-alert-warn">!</span>
  if (kind === 'good') return <span className="ct-alert-badge ct-alert-good">&#x2713;</span>
  return <span className="ct-alert-badge ct-alert-info">i</span>
}

function OverviewPage({ onNote, onMessage }: { onNote: () => void; onMessage: () => void }) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts)
  return (
    <>
      <div className="ct-patient-card">
        <div className="ct-patient-avatar">{PATIENT.initials}</div>
        <div className="ct-patient-info">
          <strong>{PATIENT.name}</strong>
          <span>{PATIENT.condition}</span>
          <span className="ct-patient-since">In care since {PATIENT.since}</span>
        </div>
        <div className="ct-patient-age">
          <strong>{PATIENT.age}</strong>
          <span>yrs</span>
        </div>
      </div>

      <div className="ct-stat-row">
        {[
          { label: 'Habits done today', value: '2 / 3', icon: 'check', colour: 'ct-stat-green' },
          { label: 'Games this week', value: '11', icon: 'game', colour: 'ct-stat-blue' },
          { label: 'Meals logged today', value: '2 / 3', icon: 'fork', colour: 'ct-stat-peach' },
          { label: 'Mood today', value: '4 / 5', icon: 'heart', colour: 'ct-stat-lavender' },
        ].map((s) => (
          <div className={`ct-stat-card ${s.colour}`} key={s.label}>
            <span className="ct-stat-icon"><Icon name={s.icon} size={17} /></span>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      <div className="ct-panel">
        <div className="ct-panel-top">
          <h3>Recent alerts</h3>
          {alerts.length > 0 && <button className="ct-text-btn" onClick={() => setAlerts([])}>Clear all</button>}
        </div>
        {alerts.length === 0 ? (
          <div className="ct-empty"><Icon name="check" size={22} />All clear \u2014 nothing to flag right now.</div>
        ) : (
          <ul className="ct-alert-list">
            {alerts.map((a) => (
              <li key={a.id} className="ct-alert-row">
                <AlertBadge kind={a.kind} />
                <div className="ct-alert-body">
                  <span>{a.text}</span>
                  <small>{a.time}</small>
                </div>
                <button className="ct-dismiss" onClick={() => setAlerts((prev) => prev.filter((x) => x.id !== a.id))} aria-label="Dismiss alert">
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ct-action-row">
        <button className="ct-action-btn ct-action-primary" onClick={onNote}><Icon name="clip" size={18} />Add a note</button>
        <button className="ct-action-btn" onClick={onMessage}><Icon name="message" size={18} />Send message</button>
      </div>
    </>
  )
}

function ActivityPage() {
  const [period, setPeriod] = useState('This week')
  const data = period === 'This week' ? habitRate : [80, 60, 90, 70, 50, 80, 60]
  return (
    <>
      <div className="ct-panel">
        <div className="ct-panel-top">
          <div><h3>Mood this week</h3><p className="ct-panel-sub">Based on daily check-ins</p></div>
        </div>
        <div className="ct-mood-row">
          {moodHistory.map((e) => (
            <div className="ct-mood-col" key={e.day}><MoodDot level={e.mood} /><small>{e.day}</small></div>
          ))}
        </div>
        <div className="ct-mood-legend">
          {[{ label: 'Low', colour: '#e8b5b5' }, { label: 'Fair', colour: '#e8ccb5' }, { label: 'OK', colour: '#e8e1b5' }, { label: 'Good', colour: '#c8deb5' }, { label: 'Great', colour: '#a8d4a8' }].map((l) => (
            <span key={l.label} className="ct-mood-legend-item">
              <span style={{ background: l.colour }} className="ct-mood-swatch" />{l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="ct-panel">
        <div className="ct-panel-top">
          <div><h3>Habit completion</h3><p className="ct-panel-sub">% of daily habits done</p></div>
          <select className="ct-select" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Chart period">
            <option>This week</option>
            <option>Last week</option>
          </select>
        </div>
        <div className="ct-bar-chart">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
            <div className="ct-bar-col" key={day}>
              <span className="ct-bar-wrap"><span className="ct-bar" style={{ height: `${data[i]}%` }} /></span>
              <small>{day}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="ct-panel">
        <div className="ct-panel-top"><h3>Game engagement</h3></div>
        <ul className="ct-game-list">
          {gameActivity.map((g) => (
            <li className="ct-game-row" key={g.name}>
              <span className="ct-game-icon"><Icon name="game" size={16} /></span>
              <div className="ct-game-info">
                <strong>{g.name}</strong>
                <small>Last played: {g.lastPlayed}</small>
              </div>
              <div className="ct-game-meta">
                <strong>{g.completions}&times;</strong>
                <span className={`ct-trend ${g.trend > 0 ? 'ct-trend-up' : g.trend < 0 ? 'ct-trend-down' : 'ct-trend-flat'}`}>
                  {g.trend > 0 ? `+${g.trend}` : g.trend === 0 ? '\u2014' : `${g.trend}`}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

function NotesPage({ onAdd }: { onAdd: () => void }) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  return (
    <>
      <div className="ct-panel">
        <div className="ct-panel-top">
          <div><h3>Care notes</h3><p className="ct-panel-sub">Shared between you and the care team</p></div>
          <button className="ct-text-btn" onClick={onAdd}><Icon name="plus" size={15} />Add</button>
        </div>
        {notes.length === 0 ? (
          <div className="ct-empty">No notes yet. Add one to keep the care team informed.</div>
        ) : (
          <ul className="ct-note-list">
            {notes.map((n) => (
              <li className="ct-note-row" key={n.id}>
                <div className="ct-note-meta">
                  <span className="ct-note-author">{n.author}</span>
                  <span className="ct-note-date">{n.date}</span>
                  <button className="ct-dismiss" onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))} aria-label="Delete note">
                    <Icon name="close" size={13} />
                  </button>
                </div>
                <p className="ct-note-text">{n.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="ct-panel">
        <div className="ct-panel-top">
          <div><h3>Upcoming reminders</h3><p className="ct-panel-sub">Set to reach Jamie automatically</p></div>
          <button className="ct-text-btn" onClick={onAdd}><Icon name="plus" size={15} />Add</button>
        </div>
        <ul className="ct-reminder-list">
          {[
            { text: 'Afternoon walk prompt', time: '3:00 PM', days: 'Daily' },
            { text: 'Evening hydration check', time: '7:30 PM', days: 'Daily' },
            { text: 'Weekly mood review', time: 'Friday 10 AM', days: 'Weekly' },
          ].map((r) => (
            <li className="ct-reminder-row" key={r.text}>
              <span className="ct-reminder-icon"><Icon name="bell" size={15} /></span>
              <div className="ct-reminder-info">
                <strong>{r.text}</strong>
                <small>{r.time} &middot; {r.days}</small>
              </div>
              <span className="ct-reminder-badge">{r.days}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

type CTPage = 'Overview' | 'Activity' | 'Notes'
type CTModal = 'Add a note' | 'Send message' | null

export default function CaretakerApp({ onSwitch }: { onSwitch: () => void }) {
  const screenRef = useRef<HTMLElement>(null)
  const [page, setPage] = useState<CTPage>('Overview')
  const [modal, setModal] = useState<CTModal>(null)
  const [toast, setToast] = useState('')
  const [noteText, setNoteText] = useState('')
  const [messageText, setMessageText] = useState('')

  useEffect(() => { screenRef.current?.scrollTo({ top: 0, behavior: 'instant' }) }, [page])

  useEffect(() => {
    if (!modal) return
    const screen = screenRef.current
    if (!screen) return
    const prev = screen.style.overflowY
    screen.style.overflowY = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', onKey)
    return () => { screen.style.overflowY = prev; window.removeEventListener('keydown', onKey) }
  }, [modal])

  function notify(msg: string) { setToast(msg); window.setTimeout(() => setToast(''), 3200) }

  const pageTitle = page === 'Overview' ? 'Good morning, Alex.' : page === 'Activity' ? 'Jamie\u2019s activity.' : 'Notes & reminders.'
  const pageSub = page === 'Overview' ? 'Here\u2019s how Jamie is doing today.' : page === 'Activity' ? 'A week at a glance.' : 'Keep the care team in the loop.'

  return (
    <div className="app-shell ct-shell">
      <aside className="sidebar">
        <nav aria-label="Caretaker navigation">
          {([
            { name: 'Overview' as CTPage, icon: 'grid', label: 'Overview' },
            { name: 'Activity' as CTPage, icon: 'activity', label: 'Activity' },
            { name: 'Notes' as CTPage, icon: 'clip', label: 'Notes' },
          ]).map((item) => (
            <button key={item.name} className={`nav-item ${page === item.name ? 'active' : ''}`} onClick={() => setPage(item.name)} aria-current={page === item.name ? 'page' : undefined}>
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
              <h1>{pageTitle}<span className="heading-spark"><Icon name="heart" size={26} /></span></h1>
              <p>{pageSub}</p>
            </div>
            <div className="ct-header-right">
              <button className="date-button" aria-label="Notifications" onClick={() => notify('No new notifications.')}><Icon name="bell" size={20} /></button>
              <button className="ct-switch-btn" onClick={onSwitch} title="Switch to patient view" aria-label="Switch to patient view"><Icon name="users" size={16} /></button>
            </div>
          </section>

          {page === 'Overview' && <OverviewPage onNote={() => setModal('Add a note')} onMessage={() => setModal('Send message')} />}
          {page === 'Activity' && <ActivityPage />}
          {page === 'Notes' && <NotesPage onAdd={() => setModal('Add a note')} />}

          <footer className="page-footer">
            <span><Icon name="leaf" size={14} /> Caring with intention.</span>
            <span>bloom. caretaker</span>
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

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section className="modal ct-modal" role="dialog" aria-modal="true" aria-labelledby="ct-modal-title" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close icon-button" onClick={() => setModal(null)} aria-label="Close"><Icon name="close" /></button>
            <span className="modal-leaf ct-modal-icon"><Icon name={modal === 'Add a note' ? 'clip' : 'message'} size={22} /></span>
            <h2 id="ct-modal-title">{modal}</h2>
            {modal === 'Add a note' ? (
              <>
                <p>Add a note visible to you and the care team.</p>
                <label>Note<textarea className="ct-textarea" rows={4} placeholder="e.g. Jamie seemed a little tired this afternoon\u2026" value={noteText} onChange={(e) => setNoteText(e.target.value)} autoFocus /></label>
                <button className="primary-button" onClick={() => { if (!noteText.trim()) return; notify('Note saved to the care log.'); setNoteText(''); setModal(null) }}>Save note <Icon name="arrow" size={17} /></button>
              </>
            ) : (
              <>
                <p>Send a gentle in-app message to Jamie.</p>
                <label>Message<textarea className="ct-textarea" rows={3} placeholder="e.g. Good morning, Jamie! Don\u2019t forget your walk today." value={messageText} onChange={(e) => setMessageText(e.target.value)} autoFocus /></label>
                <button className="primary-button" onClick={() => { if (!messageText.trim()) return; notify('Message sent to Jamie.'); setMessageText(''); setModal(null) }}>Send message <Icon name="arrow" size={17} /></button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
