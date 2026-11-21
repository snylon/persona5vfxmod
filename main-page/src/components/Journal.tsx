'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type JournalPage = {
  date: string
  title: string
  body: string
  imageDataUrls?: string[]
  audioDataUrl?: string
  audioDuration?: number
  updatedAt: string
  savedAt?: string
}

const STORAGE_KEY = 'unforgotten-journal-pages'
const MAX_IMAGES_PER_PAGE = 4
const MAX_IMAGE_DIMENSION = 960
const IMAGE_JPEG_QUALITY = 0.78

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayDate(dateKey: string, includeYear = true) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined,
  }).format(new Date(`${dateKey}T12:00:00`))
}

function durationLabel(seconds = 0) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function pickAudioMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return ''
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('File could not be read'))
    })
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
}

async function compressImageFile(file: File): Promise<string> {
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
          MAX_IMAGE_DIMENSION / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
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
        const compressed = canvas.toDataURL('image/jpeg', IMAGE_JPEG_QUALITY)
        resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl)
      } catch {
        resolve(rawDataUrl)
      }
    }
    img.onerror = () => resolve(rawDataUrl)
    img.src = rawDataUrl
  })
}

function JournalGlyph({
  name,
}: {
  name: 'book' | 'mic' | 'save' | 'chevron' | 'trash' | 'image' | 'close'
}) {
  const paths = {
    book: (
      <>
        <path d="M5 3h13a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1Z" />
        <path d="M8 3v18M4 17h16" />
      </>
    ),
    mic: (
      <>
        <rect x="8" y="3" width="8" height="13" rx="4" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      </>
    ),
    save: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7" />
        <path d="M10 11v6m4-6v6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="m21 15-5-5L5 20" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
  }

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

export default function Journal() {
  const today = localDateKey()
  const [pages, setPages] = useState<JournalPage[]>([])
  const [activeDate, setActiveDate] = useState(today)
  const [previewDate, setPreviewDate] = useState<string | null>(null)
  const [confirmDeleteDate, setConfirmDeleteDate] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [voiceError, setVoiceError] = useState('')
  const [imageNotice, setImageNotice] = useState('')
  const [imageError, setImageError] = useState('')
  const [storageError, setStorageError] = useState('')
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as JournalPage[]
        if (Array.isArray(parsed)) setPages(parsed)
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setReady(true)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (!previewDate) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewDate(null)
        setConfirmDeleteDate(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewDate])

  function deletePage(dateKey: string) {
    setStorageError('')
    setPages((current) => {
      const next = current.filter((page) => page.date !== dateKey)
      try {
        if (next.length === 0) {
          window.localStorage.removeItem(STORAGE_KEY)
        } else {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        }
      } catch {
        // Ignore storage cleanup errors
      }
      return next
    })
    if (previewDate === dateKey) setPreviewDate(null)
    if (activeDate === dateKey) {
      setSaved(false)
      setImageError('')
      setImageNotice('')
      setVoiceError('')
      if (activeDate !== today) setActiveDate(today)
    }
    setConfirmDeleteDate(null)
  }

  const activePage = useMemo(
    () =>
      pages.find((page) => page.date === activeDate) ?? {
        date: activeDate,
        title: '',
        body: '',
        updatedAt: new Date().toISOString(),
      },
    [activeDate, pages],
  )

  const previewPage = useMemo(
    () => (previewDate ? pages.find((page) => page.date === previewDate) ?? null : null),
    [pages, previewDate],
  )

  const pageHistory = useMemo(
    () =>
      [...pages]
        .filter(
          (page) =>
            page.body.trim() ||
            page.title.trim() ||
            page.audioDataUrl ||
            page.imageDataUrls?.length,
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [pages],
  )

  function updatePage(patch: Partial<JournalPage>, markSaved = false) {
    setStorageError('')
    const now = new Date().toISOString()
    setPages((current) => {
      const existing = current.find((page) => page.date === activeDate) ?? {
        date: activeDate,
        title: '',
        body: '',
        updatedAt: now,
      }
      const nextPage: JournalPage = {
        ...existing,
        ...patch,
        updatedAt: now,
        ...(markSaved ? { savedAt: now } : {}),
      }
      const exists = current.some((page) => page.date === activeDate)
      const next = exists
        ? current.map((page) => (page.date === activeDate ? nextPage : page))
        : [...current, nextPage]
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      } catch {
        queueMicrotask(() =>
          setStorageError(
            'Your journal storage is full. Remove an image or recording and try again.',
          ),
        )
        return current
      }
    })
    setSaved(markSaved)
  }

  async function insertImages(files: FileList | null) {
    setImageError('')
    setImageNotice('')
    if (!files?.length) return

    const currentImages = activePage.imageDataUrls ?? []
    const remainingSlots = MAX_IMAGES_PER_PAGE - currentImages.length
    if (remainingSlots <= 0) {
      setImageError(`You already have ${MAX_IMAGES_PER_PAGE} images on this page. Remove one to add another.`)
      return
    }

    const selectedFiles = Array.from(files)
    const validFiles = selectedFiles.filter((file) => file.type.startsWith('image/'))
    if (validFiles.length === 0) {
      setImageError('Please choose image files only (JPG, PNG, WebP, etc.).')
      return
    }

    const filesToAdd = validFiles.slice(0, remainingSlots)
    const skippedCount = validFiles.length - filesToAdd.length

    try {
      const imageDataUrls = await Promise.all(filesToAdd.map((file) => compressImageFile(file)))
      updatePage({ imageDataUrls: [...currentImages, ...imageDataUrls] })
      if (skippedCount > 0) {
        setImageNotice(
          `Added ${filesToAdd.length} ${filesToAdd.length === 1 ? 'picture' : 'pictures'} (maximum of ${MAX_IMAGES_PER_PAGE} per page).`,
        )
      }
    } catch {
      setImageError('Those images could not be added. Please try again.')
    }
  }

  function stopRecording() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
  }

  async function startRecording() {
    setVoiceError('')
    if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === 'undefined') {
      setVoiceError('Voice recording is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const preferredMimeType = pickAudioMimeType()
      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream)
      const chunks: Blob[] = []
      streamRef.current = stream
      recorderRef.current = recorder
      elapsedRef.current = 0
      setRecordingSeconds(0)

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data)
      })
      recorder.addEventListener('stop', () => {
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setRecording(false)

        if (chunks.length === 0) {
          setVoiceError('No audio was captured. Try speaking a little longer before stopping.')
          return
        }

        const recordedSeconds = Math.max(1, elapsedRef.current)
        const blob = new Blob(chunks, {
          type: recorder.mimeType || preferredMimeType || 'audio/webm',
        })
        const reader = new FileReader()
        reader.addEventListener('load', () => {
          if (typeof reader.result === 'string') {
            updatePage({
              audioDataUrl: reader.result,
              audioDuration: recordedSeconds,
            })
          }
        })
        reader.addEventListener('error', () => {
          setVoiceError('Could not save your voice recording. Please try again.')
        })
        reader.readAsDataURL(blob)
      })

      recorder.start(250)
      setRecording(true)
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setRecordingSeconds(elapsedRef.current)
        if (elapsedRef.current >= 60 && recorder.state !== 'inactive') {
          recorder.stop()
        }
      }, 1000)
    } catch (error) {
      const errName = error instanceof DOMException ? error.name : ''
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setVoiceError(
          'Microphone permission was denied. Allow microphone access in your browser settings to record.',
        )
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setVoiceError('No microphone was found on this device.')
      } else {
        setVoiceError('Microphone access was not available. You can still type your reflection.')
      }
    }
  }

  const uploadedImages = activePage.imageDataUrls ?? []
  const remainingImageSlots = MAX_IMAGES_PER_PAGE - uploadedImages.length

  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e5eadf] bg-white">
      <div className="bg-[#e8efdc] px-5 pb-5 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="grid h-10 w-10 place-items-center rounded-[13px] bg-white/70 text-[#6f875c]">
            <JournalGlyph name="book" />
          </span>
          <span className="rounded-full bg-white/60 px-3 py-1.5 text-[9px] font-semibold tracking-[1.1px] text-[#788b68]">
            {activeDate === today ? 'TODAY’S PAGE' : 'PAST PAGE'}
          </span>
        </div>
        <h2 className="font-['Manrope'] text-[25px] font-semibold leading-tight tracking-[-0.8px] text-[#41523f]">
          {displayDate(activeDate)}
        </h2>
      </div>

      <div className="px-5 py-5">
        {!ready ? (
          <div className="py-16 text-center text-xs text-[#929d89]">Opening your journal…</div>
        ) : (
          <>
            <label className="block">
              <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[1.2px] text-[#9ba591]">
                Page title
              </span>
              <input
                value={activePage.title}
                onChange={(event) => updatePage({ title: event.target.value.slice(0, 80) })}
                placeholder="Give today’s page a title"
                className="w-full rounded-[14px] border border-[#e3e8dd] bg-[#fafbf8] px-4 py-3 font-['Manrope'] text-sm font-semibold text-[#53604f] outline-none placeholder:font-normal placeholder:text-[#afb7a8] focus:border-[#a8bb96]"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[1.2px] text-[#9ba591]">
                Your reflection
              </span>
              <textarea
                value={activePage.body}
                onChange={(event) => updatePage({ body: event.target.value.slice(0, 8000) })}
                placeholder="Write a few thoughts from your day..."
                className="min-h-[230px] w-full resize-none rounded-[18px] border border-[#e3e8dd] bg-[#fffefb] bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,#e8ece3_31px,#e8ece3_32px)] bg-local px-4 pb-3 pt-[3px] text-[13px] leading-[32px] text-[#5d6858] outline-none placeholder:text-[#afb7a8] focus:border-[#a8bb96]"
              />
            </label>

            <div className="mt-4 rounded-[18px] border border-[#e8e2d8] bg-[#fbf7f0] p-4">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  void insertImages(event.target.files)
                  event.target.value = ''
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-['Manrope'] text-[13px] font-semibold text-[#75695d]">
                    Add images
                  </h3>
                  <p className="mt-1 text-[9px] leading-relaxed text-[#9c9085]">
                    {uploadedImages.length} of {MAX_IMAGES_PER_PAGE} photos added.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={remainingImageSlots <= 0}
                  onClick={() => imageInputRef.current?.click()}
                  className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-[10px] font-semibold text-[#806f5f] shadow-sm disabled:opacity-55"
                >
                  <JournalGlyph name="image" />
                  {remainingImageSlots <= 0 ? '4 / 4 added' : 'Insert images'}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {Array.from({ length: MAX_IMAGES_PER_PAGE }, (_, index) => {
                  const imageDataUrl = uploadedImages[index]
                  if (imageDataUrl) {
                    return (
                      <div
                        key={`uploaded-${index}`}
                        className="group relative aspect-[4/3] overflow-hidden rounded-[13px] bg-[#eee8de]"
                      >
                        <img
                          src={imageDataUrl}
                          alt={`Journal image ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageError('')
                            setImageNotice('')
                            updatePage({
                              imageDataUrls: uploadedImages.filter(
                                (_, imageIndex) => imageIndex !== index,
                              ),
                            })
                          }}
                          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#806f5f] shadow-sm"
                          aria-label={`Remove journal image ${index + 1}`}
                        >
                          <JournalGlyph name="trash" />
                        </button>
                      </div>
                    )
                  }

                  return (
                    <button
                      type="button"
                      key={`empty-slot-${index}`}
                      onClick={() => imageInputRef.current?.click()}
                      className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-[13px] border border-dashed border-[#dfd5c6] bg-white/60 text-[#a59889] hover:bg-white/90"
                      aria-label={`Upload picture ${index + 1}`}
                    >
                      <span className="text-[10px] font-semibold">Photo {index + 1}</span>
                      <span className="text-[9px] text-[#b4a89a]">Tap to add</span>
                    </button>
                  )
                })}
              </div>

              {imageNotice && (
                <p className="mt-3 text-[10px] leading-relaxed text-[#71875e]">{imageNotice}</p>
              )}
              {imageError && (
                <p className="mt-3 text-[10px] leading-relaxed text-[#a1676d]">{imageError}</p>
              )}
            </div>

            <div className="mt-4 rounded-[18px] bg-[#efedf3] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-['Manrope'] text-[13px] font-semibold text-[#746b7e]">
                    Record your voice
                  </h3>
                  <p className="mt-1 text-[9px] leading-relaxed text-[#9990a2]">
                    {recording
                      ? 'Tap the button again when you’re done.'
                      : 'Say it in your own words, up to one minute.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-sm ${recording ? 'bg-[#c4898e]' : 'bg-[#9b8baa]'
                    }`}
                  aria-label={recording ? 'Stop voice recording' : 'Start voice recording'}
                  aria-pressed={recording}
                >
                  {recording ? (
                    <span className="h-4 w-4 rounded-[3px] bg-white" />
                  ) : (
                    <JournalGlyph name="mic" />
                  )}
                </button>
              </div>
              {recording && (
                <div className="mt-3 flex items-center justify-between rounded-[12px] bg-white/75 px-3 py-2 text-[10px] font-medium text-[#9c6e74]">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#c4898e]" />
                    Recording {durationLabel(recordingSeconds)} / 1:00
                  </span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="font-semibold text-[#8c5960] underline underline-offset-2"
                  >
                    Stop
                  </button>
                </div>
              )}
              {activePage.audioDataUrl && !recording && (
                <div className="mt-3 flex items-center gap-2">
                  <audio
                    className="h-9 min-w-0 flex-1"
                    controls
                    src={activePage.audioDataUrl}
                    aria-label={`Voice reflection for ${displayDate(activeDate)}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updatePage({ audioDataUrl: undefined, audioDuration: undefined })
                    }
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/70 text-[#8d7d98]"
                    aria-label="Remove voice reflection"
                  >
                    <JournalGlyph name="trash" />
                  </button>
                </div>
              )}
              {voiceError && (
                <p className="mt-3 text-[10px] leading-relaxed text-[#a1676d]">{voiceError}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => updatePage({}, true)}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#dfeace] text-[12px] font-semibold text-[#5e774a]"
            >
              <JournalGlyph name="save" />
              {saved ? 'Page saved' : 'Save this page'}
            </button>
            {storageError && (
              <p className="mt-3 text-[10px] leading-relaxed text-[#a1676d]">{storageError}</p>
            )}

            <div className="mt-7 border-t border-[#edf0e9] pt-5">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="font-['Manrope'] text-[15px] font-semibold text-[#53604f]">
                    Your pages
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-[#819271]">
                  {pageHistory.length} {pageHistory.length === 1 ? 'page' : 'pages'}
                </span>
              </div>

              {pageHistory.length === 0 ? (
                <div className="rounded-[16px] border border-dashed border-[#dfe5d7] px-5 py-8 text-center">
                  <p className="text-[11px] leading-relaxed text-[#96a08e]">
                    Today’s page will appear here when you begin writing or recording.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pageHistory.map((page) => {
                    const isConfirmingDelete = confirmDeleteDate === page.date
                    return (
                      <div
                        key={page.date}
                        className={`rounded-[15px] border p-3 ${activeDate === page.date
                            ? 'border-[#cbd9bb] bg-[#f0f5e9]'
                            : 'border-[#e7ebe2] bg-[#fafbf8]'
                          }`}
                      >
                        <div className="flex w-full items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteDate(null)
                              setPreviewDate(page.date)
                            }}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-white text-[10px] font-bold text-[#7a8c6c]">
                              {new Date(`${page.date}T12:00:00`).getDate()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <strong className="block truncate text-[11px] font-semibold text-[#596653]">
                                {page.title || 'Untitled reflection'}
                              </strong>
                              <small className="mt-1 block text-[9px] text-[#9ba493]">
                                {displayDate(page.date, false)}
                                {page.imageDataUrls?.length
                                  ? ` · ${page.imageDataUrls.length} ${page.imageDataUrls.length === 1 ? 'image' : 'images'
                                  }`
                                  : ''}
                                {page.audioDataUrl
                                  ? ` · Voice ${durationLabel(page.audioDuration)}`
                                  : ''}
                              </small>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDeleteDate(isConfirmingDelete ? null : page.date)
                            }
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#a1676d] shadow-xs hover:bg-[#f9ebec]"
                            aria-label={`Delete page for ${page.title || displayDate(page.date)}`}
                          >
                            <JournalGlyph name="trash" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDeleteDate(null)
                              setPreviewDate(page.date)
                            }}
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[#768c65] shadow-xs hover:bg-[#e8efdc]"
                            aria-label={`View saved contents for ${page.title || displayDate(page.date)}`}
                          >
                            <JournalGlyph name="chevron" />
                          </button>
                        </div>
                        {isConfirmingDelete && (
                          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[#e4e9dd] pt-2.5">
                            <span className="text-[10px] font-medium text-[#8a5d62]">
                              Delete this page?
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteDate(null)}
                                className="rounded-[9px] border border-[#dce2d5] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#6e7966]"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => deletePage(page.date)}
                                className="rounded-[9px] bg-[#e9c8cb] px-2.5 py-1.5 text-[10px] font-semibold text-[#84454c]"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {activeDate !== today && (
                <button
                  type="button"
                  onClick={() => setActiveDate(today)}
                  className="mt-3 min-h-11 w-full text-[11px] font-semibold text-[#71875e]"
                >
                  Return to today’s page
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {previewPage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#303d35]/40 p-4 backdrop-blur-[2px]"
          onClick={() => {
            setPreviewDate(null)
            setConfirmDeleteDate(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-preview-title"
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[82dvh] w-full max-w-[366px] flex-col overflow-hidden rounded-[26px] border border-[#e3e9db] bg-white shadow-[0_20px_50px_rgba(48,61,53,0.22)]"
          >
            <div className="flex items-start justify-between gap-3 bg-[#e8efdc] px-5 pb-4 pt-5">
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[1px] text-[#758865]">
                  {previewPage.date === today ? 'Today’s saved page' : 'Past saved page'}
                </span>
                <h3
                  id="journal-preview-title"
                  className="mt-2 font-['Manrope'] text-[20px] font-semibold leading-snug tracking-[-0.5px] text-[#3f503d]"
                >
                  {previewPage.title || 'Untitled reflection'}
                </h3>
                <p className="mt-0.5 text-[10px] font-medium text-[#758569]">
                  {displayDate(previewPage.date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewDate(null)
                  setConfirmDeleteDate(null)
                }}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 text-[#5d6e54]"
                aria-label="Close journal preview"
              >
                <JournalGlyph name="close" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[1.2px] text-[#9ba591]">
                  Reflection
                </span>
                {previewPage.body.trim() ? (
                  <div className="whitespace-pre-wrap rounded-[16px] border border-[#e6ebe0] bg-[#fffefb] px-4 py-3 text-[13px] leading-relaxed text-[#546150]">
                    {previewPage.body}
                  </div>
                ) : (
                  <p className="rounded-[14px] border border-dashed border-[#e4e9dd] px-4 py-3 text-[11px] text-[#9aa391]">
                    No written reflection on this page.
                  </p>
                )}
              </div>

              {(previewPage.imageDataUrls?.length ?? 0) > 0 && (
                <div>
                  <span className="mb-2 block text-[9px] font-semibold uppercase tracking-[1.2px] text-[#9ba591]">
                    Pictures ({previewPage.imageDataUrls?.length})
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {previewPage.imageDataUrls?.map((imageDataUrl, index) => (
                      <div
                        key={`preview-img-${index}`}
                        className="aspect-[4/3] overflow-hidden rounded-[13px] border border-[#e7e2d9] bg-[#f4efe7]"
                      >
                        <img
                          src={imageDataUrl}
                          alt={`Saved journal picture ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewPage.audioDataUrl && (
                <div className="rounded-[16px] bg-[#efedf3] p-3.5">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-semibold text-[#746b7e]">
                    <span>Voice recording</span>
                    {previewPage.audioDuration ? (
                      <span className="text-[#968ca0]">
                        {durationLabel(previewPage.audioDuration)}
                      </span>
                    ) : null}
                  </div>
                  <audio
                    className="h-9 w-full"
                    controls
                    src={previewPage.audioDataUrl}
                    aria-label={`Saved voice reflection for ${displayDate(previewPage.date)}`}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-[#edf0e9] bg-[#fafbf8] px-5 py-3.5">
              {confirmDeleteDate === previewPage.date ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#8a5d62]">
                    Delete this saved page?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteDate(null)}
                      className="flex min-h-10 items-center justify-center rounded-[12px] border border-[#e1e6da] bg-white px-3.5 text-[12px] font-semibold text-[#6e7966]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePage(previewPage.date)}
                      className="flex min-h-10 items-center justify-center rounded-[12px] bg-[#e9c8cb] px-3.5 text-[12px] font-semibold text-[#84454c]"
                    >
                      Yes, delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDate(previewPage.date)
                      setPreviewDate(null)
                      setConfirmDeleteDate(null)
                    }}
                    className="flex min-h-10 flex-1 items-center justify-center rounded-[12px] bg-[#dfeace] text-[12px] font-semibold text-[#566f43]"
                  >
                    Edit this page
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteDate(previewPage.date)}
                    className="flex min-h-10 items-center justify-center gap-1.5 rounded-[12px] border border-[#ead4d6] bg-[#fdf4f5] px-3 text-[12px] font-semibold text-[#9a575e]"
                    aria-label="Delete this saved page"
                  >
                    <JournalGlyph name="trash" />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewDate(null)
                      setConfirmDeleteDate(null)
                    }}
                    className="flex min-h-10 items-center justify-center rounded-[12px] border border-[#e1e6da] bg-white px-3.5 text-[12px] font-semibold text-[#6e7966]"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
