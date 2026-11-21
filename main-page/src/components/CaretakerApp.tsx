'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import FamilyTree from './FamilyTree'
import LinkGateCard from './LinkGateCard'
import type { Reminder, FamilyMember } from '@/app/(frontend)/page'
import type { LinkActionResult } from '@/app/(frontend)/link-actions'
import type { LinkedPartner, LinkState, SessionUser } from '@/lib/auth-store'
import type { CaregiverPictureState, PictureDaySubmission } from '@/lib/picture-day-store'

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

function formatShortDate(iso?: string) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function OverviewPage({
  linkedPatient,
  onUnlink,
  onNotify,
  reminders,
  setReminders,
  quizQuestions,
  setQuizQuestions,
  todoChecked,
}: {
  linkedPatient?: LinkedPartner | null
  onUnlink?: () => Promise<LinkActionResult>
  onNotify?: (msg: string) => void
  reminders: Reminder[]
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>
  quizQuestions: QuizQuestion[]
  setQuizQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>
  todoChecked: Record<string, boolean>
}) {
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const patientName = linkedPatient?.name || PATIENT.name
  const patientFirstName = patientName.trim().split(/\s+/)[0] || 'Jamie'
  const patientInitials =
    patientName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || PATIENT.initials
  const linkedDateLabel = formatShortDate(linkedPatient?.linkedAt || linkedPatient?.createdAt)

  async function handleConfirmUnlink() {
    if (!onUnlink) return
    setUnlinking(true)
    try {
      const result = await onUnlink()
      setConfirmUnlink(false)
      if (result.message) onNotify?.(result.message)
      else if (result.error) onNotify?.(result.error)
    } finally {
      setUnlinking(false)
    }
  }
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
      {/* Patient info card */}
      <div className="ct-patient-card flex-col !items-stretch gap-3">
        <div className="flex items-center gap-3.5">
          <div className="ct-patient-avatar shrink-0">{patientInitials}</div>
          <div className="ct-patient-info min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="truncate">{patientName}</strong>
              {linkedPatient?.patientCode && (
                <span className="rounded-full bg-[#eef5e6] px-2 py-0.5 text-[9px] font-bold tracking-[0.5px] text-[#4d6c3d]">
                  ID: {linkedPatient.patientCode}
                </span>
              )}
            </div>
            {linkedPatient?.email && (
              <span className="mt-0.5 block truncate text-[11px] text-[#7a8674]">
                {linkedPatient.email}
              </span>
            )}
            <span className="ct-patient-since mt-0.5 block">
              {linkedDateLabel ? `Linked since ${linkedDateLabel}` : `In care since ${PATIENT.since}`}
            </span>
          </div>
          {onUnlink && !confirmUnlink && (
            <button
              type="button"
              onClick={() => setConfirmUnlink(true)}
              className="shrink-0 rounded-[10px] border border-[#ead4d6] bg-[#fdf4f5] px-2.5 py-1.5 text-[10px] font-semibold text-[#9a575e] hover:bg-[#f9e7e9]"
            >
              Unlink
            </button>
          )}
        </div>
        {confirmUnlink && (
          <div className="flex items-center justify-between gap-2 border-t border-[#eef1e9] pt-2.5">
            <span className="text-[11px] font-medium text-[#8a5d62]">
              Unlink from {patientFirstName}?
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={unlinking}
                onClick={() => setConfirmUnlink(false)}
                className="rounded-[9px] border border-[#dce2d5] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#6e7966]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unlinking}
                onClick={() => void handleConfirmUnlink()}
                className="rounded-[9px] bg-[#e9c8cb] px-2.5 py-1.5 text-[10px] font-semibold text-[#84454c] disabled:opacity-60"
              >
                {unlinking ? 'Unlinking…' : 'Yes, unlink'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* To-do list (read-only view) */}
      <div className="ct-panel">
        <div className="ct-panel-top">
          <div>
            <h3>{patientFirstName}&rsquo;s to-do list</h3>
            <p className="ct-panel-sub">What {patientFirstName} sees today</p>
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
            <p className="ct-panel-sub">Appear in {patientFirstName}&rsquo;s to-do list</p>
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
            <p className="ct-panel-sub">Added to {patientFirstName}&rsquo;s daily check-in pool</p>
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

function formatTimeLabel(iso?: string) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return ''
  }
}

function PictureReviewPage({
  patientFirstName = 'Jamie',
  pictureState,
  onReview,
}: {
  patientFirstName?: string
  pictureState: CaregiverPictureState
  onReview: (submissionId: string, decision: 'approve' | 'reject') => Promise<void>
}) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [viewingPhoto, setViewingPhoto] = useState<PictureDaySubmission | null>(null)

  useEffect(() => {
    if (!viewingPhoto) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setViewingPhoto(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewingPhoto])

  async function handleDecision(id: string, decision: 'approve' | 'reject') {
    setBusyId(id)
    try {
      await onReview(id, decision)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="ct-panel">
        <div className="ct-panel-top">
          <div>
            <h3>Pending review</h3>
            <p className="ct-panel-sub">
              Approve {patientFirstName}&rsquo;s picture so they can move to the next prompt.
            </p>
          </div>
        </div>

        {pictureState.pending.length === 0 ? (
          <div className="ct-picture-empty">
            <span className="ct-picture-empty-icon"><Icon name="camera" size={28} /></span>
            <p>No pictures waiting for approval right now.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {pictureState.pending.map((item) => {
              const isBusy = busyId === item.id
              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-[18px] border border-[#dfe6d6] bg-[#fafbf8]"
                >
                  <button
                    type="button"
                    onClick={() => setViewingPhoto(item)}
                    className="flex w-full items-center justify-center bg-[#f2f4eb] p-2.5"
                    aria-label={`View full size photo for ${item.promptTitle}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageDataUrl}
                      alt={`${patientFirstName}'s photo for ${item.promptTitle}`}
                      className="max-h-[320px] w-full rounded-[12px] object-contain"
                    />
                  </button>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <strong className="block font-['Manrope'] text-[14px] font-bold text-[#3a4d3c]">
                          {item.promptTitle}
                        </strong>
                        <small className="block text-[10px] text-[#7f8c78]">
                          {item.mode === 'outdoors' ? 'Outdoors' : 'Indoors'} ·{' '}
                          {formatTimeLabel(item.createdAt)}
                        </small>
                      </div>
                      <span className="rounded-full bg-[#eef5e6] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.6px] text-[#557242]">
                        Prompt {item.promptIndex + 1}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDecision(item.id, 'approve')}
                        className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-[#5f7d4d] px-3 text-[12px] font-semibold text-white hover:bg-[#526e41] disabled:opacity-60"
                      >
                        <Icon name="check" size={15} />
                        {isBusy ? 'Saving…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void handleDecision(item.id, 'reject')}
                        className="flex min-h-10 items-center justify-center rounded-[12px] border border-[#ead4d6] bg-[#fdf4f5] px-3.5 text-[12px] font-semibold text-[#9a575e] hover:bg-[#f9e7e9] disabled:opacity-60"
                      >
                        Ask to retake
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="ct-panel">
        <div className="ct-panel-top">
          <div>
            <h3>Approved pictures</h3>
            <p className="ct-panel-sub">Tap a photo to view it full size</p>
          </div>
          {pictureState.approved.length > 0 && (
            <span className="text-[10px] font-semibold text-[#7c8c73]">
              {pictureState.approved.length} total
            </span>
          )}
        </div>
        {pictureState.approved.length === 0 ? (
          <div className="ct-picture-empty">
            <span className="ct-picture-empty-icon"><Icon name="camera" size={28} /></span>
            <p>Approved pictures from {patientFirstName} will appear here.</p>
          </div>
        ) : (
          <div className="ct-picture-grid">
            {pictureState.approved.map((p) => (
              <button
                type="button"
                className="ct-picture-item cursor-pointer text-left transition hover:opacity-90"
                key={p.id}
                onClick={() => setViewingPhoto(p)}
                aria-label={`View full size approved picture: ${p.promptTitle}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageDataUrl} alt={p.promptTitle} />
                <span>{p.promptTitle}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#232d26]/75 p-4 backdrop-blur-[2px]"
          onClick={() => setViewingPhoto(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="picture-lightbox-title"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[90dvh] w-full max-w-[460px] flex-col overflow-hidden rounded-[24px] border border-[#dfe6d6] bg-white shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center justify-between gap-3 bg-[#e8efdc] px-4 py-3.5">
              <div className="min-w-0">
                <h3
                  id="picture-lightbox-title"
                  className="truncate font-['Manrope'] text-[16px] font-bold text-[#384b39]"
                >
                  {viewingPhoto.promptTitle}
                </h3>
                <p className="text-[10px] font-medium text-[#6f8065]">
                  {viewingPhoto.mode === 'outdoors' ? 'Outdoors' : 'Indoors'} ·{' '}
                  {formatTimeLabel(viewingPhoto.reviewedAt || viewingPhoto.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPhoto(null)}
                aria-label="Close full size picture"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/85 text-[#52654c]"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-auto bg-[#f4f6ef] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingPhoto.imageDataUrl}
                alt={`Full size photo for ${viewingPhoto.promptTitle}`}
                className="max-h-[72dvh] max-w-full rounded-[12px] object-contain"
              />
            </div>
          </div>
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
  isLinked,
  linkState,
  onSendLinkRequest,
  onUnlink,
  onNotify,
  patientLang,
  setPatientLang,
  caretakerLang,
  setCaretakerLang,
  outsidePictureDay,
  setOutsidePictureDay,
}: {
  isLinked: boolean
  linkState?: LinkState
  onSendLinkRequest?: (patientCode: string) => Promise<LinkActionResult>
  onUnlink?: () => Promise<LinkActionResult>
  onNotify: (msg: string) => void
  patientLang: string
  setPatientLang: (v: string) => void
  caretakerLang: string
  setCaretakerLang: (v: string) => void
  outsidePictureDay: boolean
  setOutsidePictureDay: (v: boolean) => void
}) {
  const [patientIdInput, setPatientIdInput] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [linkError, setLinkError] = useState('')
  const [linkSuccess, setLinkSuccess] = useState('')

  const linkedPartner = linkState?.linkedPartner ?? null
  const outgoingRequests = linkState?.outgoingRequests ?? []
  const patientFirstName = linkedPartner?.name?.trim().split(/\s+/)[0] || 'Jamie'

  async function handleConfirmUnlink() {
    if (!onUnlink) return
    setUnlinking(true)
    setLinkError('')
    setLinkSuccess('')
    try {
      const result = await onUnlink()
      setConfirmUnlink(false)
      if (!result.ok) {
        setLinkError(result.error || 'Could not unlink account.')
      } else if (result.message) {
        onNotify(result.message)
      }
    } finally {
      setUnlinking(false)
    }
  }

  async function handleSendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onSendLinkRequest) return
    setLinkError('')
    setLinkSuccess('')
    if (!patientIdInput.trim()) {
      setLinkError('Please enter a patient ID.')
      return
    }
    setSending(true)
    try {
      const result = await onSendLinkRequest(patientIdInput)
      if (!result.ok) {
        setLinkError(result.error || 'Could not send invite.')
      } else {
        setPatientIdInput('')
        const msg = result.message || 'Link invite sent!'
        setLinkSuccess(msg)
        onNotify(msg)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="ct-panel">
        <div className="ct-panel-top">
          <div>
            <h3>Patient link</h3>
            <p className="ct-panel-sub">
              {isLinked
                ? 'Your account is linked and ready.'
                : 'Enter the patient\u2019s ID from their home page to send an invite.'}
            </p>
          </div>
        </div>

        {isLinked && linkedPartner ? (
          <div className="mt-3 rounded-[14px] border border-[#cde0bd] bg-[#eef5e6] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <strong className="block truncate text-[13px] font-semibold text-[#3c5737]">
                  Linked with {linkedPartner.name}
                </strong>
                <small className="block truncate text-[11px] text-[#6d8262]">
                  {linkedPartner.patientCode ? `Patient ID: ${linkedPartner.patientCode} · ` : ''}
                  {linkedPartner.email}
                </small>
              </div>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.6px] text-[#4e723d]">
                Linked
              </span>
            </div>
            {onUnlink && (
              <div className="mt-3 border-t border-[#d8e7ca] pt-2.5">
                {confirmUnlink ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#8a5d62]">
                      Unlink from {patientFirstName}? Features will lock until you link again.
                    </span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={unlinking}
                        onClick={() => setConfirmUnlink(false)}
                        className="rounded-[9px] border border-[#dce2d5] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#6e7966]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={unlinking}
                        onClick={() => void handleConfirmUnlink()}
                        className="rounded-[9px] bg-[#e9c8cb] px-2.5 py-1.5 text-[10px] font-semibold text-[#84454c] disabled:opacity-60"
                      >
                        {unlinking ? 'Unlinking…' : 'Yes, unlink'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmUnlink(true)}
                    className="w-full rounded-[10px] border border-[#ead4d6] bg-[#fdf4f5] py-2 text-[11px] font-semibold text-[#9a575e] hover:bg-[#f9e7e9]"
                  >
                    Unlink from {linkedPartner.name}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <form onSubmit={handleSendInvite} className="flex flex-col gap-2.5">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[1px] text-[#8d9885]">
                  PATIENT ID
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={patientIdInput}
                    onChange={(e) => setPatientIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g. RLF-4829"
                    aria-label="Patient ID"
                    className="min-w-0 flex-1 rounded-[12px] border border-[#dfe5d7] bg-[#fafbf8] px-3.5 py-2.5 font-['Manrope'] text-[13px] font-semibold tracking-[0.5px] text-[#354437] uppercase outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-[#adb6a5] focus:border-[#93ae7d]"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="shrink-0 rounded-[12px] bg-[#5f7d4d] px-4 py-2.5 font-['Manrope'] text-[12px] font-bold text-white transition hover:bg-[#526e41] disabled:opacity-60"
                  >
                    {sending ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </label>

              {linkError && (
                <p role="alert" className="text-[11px] font-medium text-[#a1555c]">
                  {linkError}
                </p>
              )}
              {linkSuccess && (
                <p role="status" className="text-[11px] font-medium text-[#4d6e3f]">
                  {linkSuccess}
                </p>
              )}
            </form>

            {outgoingRequests.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.9px] text-[#8d9885]">
                  Pending invites
                </span>
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-2 rounded-[12px] border border-[#e3e9db] bg-[#f7faf2] px-3.5 py-2.5"
                  >
                    <div className="min-w-0">
                      <strong className="block truncate text-[12px] font-semibold text-[#42553f]">
                        {req.patientName}
                      </strong>
                      <small className="block text-[10px] text-[#7c8c73]">
                        ID: {req.patientCode} · Waiting for patient to accept
                      </small>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#e8efdc] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.6px] text-[#5e7a4a]">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!isLinked ? (
        <LinkGateCard role="caregiver" compact />
      ) : (
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
                    <strong>{patientFirstName}&rsquo;s language</strong>
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
                    <small>{patientFirstName} can take pictures outdoors</small>
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
      )}
    </>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

type CTPage = 'Overview' | 'Pictures' | 'Family' | 'Settings'

export default function CaretakerApp({
  user,
  linkState,
  onSendLinkRequest,
  onUnlink,
  onSignOut,
  onSwitch,
  reminders,
  setReminders,
  todoChecked,
  familyMembers,
  setFamilyMembers,
}: {
  user?: SessionUser
  linkState?: LinkState
  onSendLinkRequest?: (patientCode: string) => Promise<LinkActionResult>
  onUnlink?: () => Promise<LinkActionResult>
  onSignOut?: () => Promise<void>
  onSwitch?: () => void
  reminders: Reminder[]
  setReminders: React.Dispatch<React.SetStateAction<Reminder[]>>
  todoChecked: Record<string, boolean>
  familyMembers: FamilyMember[] | null
  setFamilyMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>
}) {
  const screenRef = useRef<HTMLElement>(null)
  const [page, setPage] = useState<CTPage>('Overview')
  const [toast, setToast] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Alex'
  const isLinked = Boolean(linkState?.linkedPartner)
  const patientFirstName = linkState?.linkedPartner?.name?.trim().split(/\s+/)[0] || 'Jamie'

  // Local state only for this app
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(initialQuizQuestions)
  const [patientLang, setPatientLang] = useState('English')
  const [caretakerLang, setCaretakerLang] = useState('English')
  const [outsidePictureDay, setOutsidePictureDay] = useState(false)
  const [pictureState, setPictureState] = useState<CaregiverPictureState>({
    pending: [],
    approved: [],
  })

  const refreshPictures = useCallback(async () => {
    if (!isLinked) {
      setPictureState({ pending: [], approved: [] })
      return
    }
    try {
      const res = await fetch('/picture-day', { cache: 'no-store' })
      const data = (await res.json()) as { ok?: boolean; state?: CaregiverPictureState }
      if (data.ok && data.state) {
        setPictureState(data.state)
      }
    } catch {
      // Ignore transient poll errors
    }
  }, [isLinked])

  useEffect(() => {
    void refreshPictures()
    if (!isLinked) return
    const onFocus = () => {
      void refreshPictures()
    }
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(() => {
      void refreshPictures()
    }, 3000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [isLinked, refreshPictures])

  useEffect(() => {
    screenRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    setNotificationsOpen(false)
    if (page === 'Pictures' && isLinked) {
      void refreshPictures()
    }
  }, [page, isLinked, refreshPictures])

  function notify(msg: string) { setToast(msg); window.setTimeout(() => setToast(''), 3200) }

  async function handleReviewPicture(submissionId: string, decision: 'approve' | 'reject') {
    try {
      const res = await fetch('/picture-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', submissionId, decision }),
      })
      const result = (await res.json()) as {
        ok?: boolean
        message?: string
        error?: string
        state?: CaregiverPictureState
      }
      if (result.state) setPictureState(result.state)
      if (result.message) notify(result.message)
      else if (result.error) notify(result.error)
    } catch {
      notify('Could not save your review. Please try again.')
    }
  }

  const pageMeta: Record<CTPage, { title: string; sub: string }> = {
    Overview:  {
      title: `Good morning, ${firstName}.`,
      sub: isLinked ? `Here\u2019s how ${patientFirstName} is doing today.` : 'Link with your patient to get started.',
    },
    Pictures:  { title: 'Picture day.',         sub: isLinked ? `Review photos ${patientFirstName} has taken.` : 'Link up to review patient photos.' },
    Family:    { title: 'Your tree.',             sub: isLinked ? `View and edit ${patientFirstName}\u2019s family tree.` : 'Link up to manage the family tree.' },
    Settings:  { title: 'Settings.',             sub: isLinked ? 'Language and app preferences.' : 'Enter a patient ID to link up.' },
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
            <div className="ct-header-right relative">
              <div className="relative">
                <button
                  type="button"
                  className="ct-switch-btn relative"
                  title="Notifications"
                  aria-label={
                    isLinked && pictureState.pending.length > 0
                      ? 'Notifications: a picture is waiting to be reviewed'
                      : 'Notifications'
                  }
                  onClick={() => setNotificationsOpen((open) => !open)}
                >
                  <Icon name="bell" size={16} />
                  {isLinked && pictureState.pending.length > 0 && (
                    <span
                      className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#dc4c56] ring-2 ring-[#f9f6f1]"
                      aria-hidden="true"
                    />
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-40 w-[256px] rounded-[18px] border border-[#dfe6d6] bg-white p-4 shadow-[0_14px_40px_rgba(48,61,53,0.16)]">
                    <div className="flex items-center justify-between border-b border-[#edf1e7] pb-2">
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
                    {isLinked && pictureState.pending.length > 0 ? (
                      <div className="mt-3 space-y-2.5">
                        <p className="text-[12px] font-medium leading-snug text-[#3d513c]">
                          A picture is waiting to be reviewed
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setNotificationsOpen(false)
                            setPage('Pictures')
                          }}
                          className="flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[10px] bg-[#5f7d4d] px-3 text-[11px] font-semibold text-white hover:bg-[#526e41]"
                        >
                          Review in Pictures
                          <Icon name="arrow" size={14} />
                        </button>
                      </div>
                    ) : (
                      <p className="mt-3 text-[11px] text-[#889481]">No new notifications.</p>
                    )}
                  </div>
                )}
              </div>
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
                <button className="ct-switch-btn" onClick={onSwitch} title="Switch to patient view" aria-label="Switch to patient view">
                  <Icon name="users" size={16} />
                </button>
              ) : null}
            </div>
          </section>

          {page === 'Overview' && (
            isLinked ? (
              <OverviewPage
                linkedPatient={linkState?.linkedPartner}
                onUnlink={onUnlink}
                onNotify={notify}
                reminders={reminders}
                setReminders={setReminders}
                quizQuestions={quizQuestions}
                setQuizQuestions={setQuizQuestions}
                todoChecked={todoChecked}
              />
            ) : (
              <LinkGateCard role="caregiver" onGoToSettings={() => setPage('Settings')} />
            )
          )}
          {page === 'Pictures' && (
            isLinked ? (
              <PictureReviewPage
                patientFirstName={patientFirstName}
                pictureState={pictureState}
                onReview={handleReviewPicture}
              />
            ) : (
              <LinkGateCard role="caregiver" onGoToSettings={() => setPage('Settings')} />
            )
          )}
          {page === 'Family' && (
            isLinked ? (
              <FamilyTree
                members={familyMembers ?? undefined}
                setMembers={setFamilyMembers}
              />
            ) : (
              <LinkGateCard role="caregiver" onGoToSettings={() => setPage('Settings')} />
            )
          )}
          {page === 'Settings' && (
            <SettingsPage
              isLinked={isLinked}
              linkState={linkState}
              onSendLinkRequest={onSendLinkRequest}
              onUnlink={onUnlink}
              onNotify={notify}
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
