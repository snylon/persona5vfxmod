'use client'

import { useEffect, useRef, useState } from 'react'
import type { FormEvent, MouseEvent } from 'react'

type FruitVariant = 'apple' | 'berry' | 'peach' | 'plum' | 'pear' | 'lemon'

type FamilyMember = {
  id: string
  name: string
  role: string
  phone: string
  photoDataUrl?: string
  x: number
  y: number
  variant: FruitVariant
  isCurrent?: boolean
}

const STORAGE_KEY = 'unforgotten-family-tree-members'
const MAX_AVATAR_DIMENSION = 480

const defaultMembers: FamilyMember[] = [
  {
    id: 'margaret',
    name: 'Margaret',
    role: 'Grandmother',
    phone: '',
    x: 20,
    y: 17,
    variant: 'apple',
  },
  {
    id: 'robert',
    name: 'Robert',
    role: 'Grandfather',
    phone: '',
    x: 80,
    y: 20,
    variant: 'berry',
  },
  {
    id: 'sarah',
    name: 'Sarah',
    role: 'Mother',
    phone: '',
    x: 16,
    y: 43,
    variant: 'peach',
  },
  {
    id: 'daniel',
    name: 'Daniel',
    role: 'Father',
    phone: '',
    x: 84,
    y: 47,
    variant: 'plum',
  },
  {
    id: 'jamie',
    name: 'Jamie',
    role: 'You',
    phone: '',
    x: 27,
    y: 69,
    variant: 'pear',
    isCurrent: true,
  },
  {
    id: 'alex',
    name: 'Alex',
    role: 'Sibling',
    phone: '',
    x: 74,
    y: 72,
    variant: 'lemon',
  },
]

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'AP'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
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

async function compressAvatarFile(file: File): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file)
  if (file.type === 'image/svg+xml' || file.size < 120_000) {
    return rawDataUrl
  }

  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          MAX_AVATAR_DIMENSION / Math.max(img.naturalWidth || 1, img.naturalHeight || 1),
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
        const compressed = canvas.toDataURL('image/jpeg', 0.8)
        resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl)
      } catch {
        resolve(rawDataUrl)
      }
    }
    img.onerror = () => resolve(rawDataUrl)
    img.src = rawDataUrl
  })
}

function TreeGlyph({
  name,
  size = 18,
}: {
  name: 'family' | 'close' | 'phone' | 'edit' | 'trash' | 'camera' | 'plus' | 'leaf'
  size?: number
}) {
  const paths = {
    family: (
      <>
        <circle cx="12" cy="5" r="3" />
        <circle cx="6" cy="19" r="3" />
        <circle cx="18" cy="19" r="3" />
        <path d="M12 8v4M6 16v-4h12v4" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" />,
    phone: (
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
    ),
    edit: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7" />
        <path d="M10 11v6m4-6v6" />
      </>
    ),
    camera: (
      <>
        <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    leaf: (
      <>
        <path d="M20 3C9 2 2 7 5 15s17 5 15-12Z" />
        <path d="M3 22 15 9" />
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
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

type ModalMode =
  | { kind: 'create'; x: number; y: number }
  | { kind: 'view'; id: string }
  | { kind: 'edit'; id: string }
  | null

export default function FamilyTree() {
  const [members, setMembers] = useState<FamilyMember[]>(defaultMembers)
  const [modal, setModal] = useState<ModalMode>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [formRole, setFormRole] = useState('')
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formPhoto, setFormPhoto] = useState<string | undefined>(undefined)
  const [formError, setFormError] = useState('')
  const [storageError, setStorageError] = useState('')
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const treeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as FamilyMember[]
        if (Array.isArray(parsed)) {
          setMembers(parsed)
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (!modal) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modal])

  function persistMembers(updater: (current: FamilyMember[]) => FamilyMember[]) {
    setStorageError('')
    setMembers((current) => {
      const next = updater(current)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      } catch {
        queueMicrotask(() =>
          setStorageError(
            'Storage is full. Try using a smaller photo or removing an unused apple.',
          ),
        )
        return current
      }
    })
  }

  function closeModal() {
    setModal(null)
    setConfirmDelete(false)
    setFormError('')
  }

  function openCreateAt(x: number, y: number) {
    setFormRole('')
    setFormName('')
    setFormPhone('')
    setFormPhoto(undefined)
    setFormError('')
    setConfirmDelete(false)
    setModal({ kind: 'create', x, y })
  }

  function openView(member: FamilyMember) {
    setConfirmDelete(false)
    setFormError('')
    setModal({ kind: 'view', id: member.id })
  }

  function openEdit(member: FamilyMember) {
    setFormRole(member.role)
    setFormName(member.name)
    setFormPhone(member.phone)
    setFormPhoto(member.photoDataUrl)
    setFormError('')
    setConfirmDelete(false)
    setModal({ kind: 'edit', id: member.id })
  }

  function handleTreeClick(event: MouseEvent<HTMLDivElement>) {
    const container = treeRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const rawX = ((event.clientX - rect.left) / rect.width) * 100
    const rawY = ((event.clientY - rect.top) / rect.height) * 100
    openCreateAt(clamp(Math.round(rawX), 15, 85), clamp(Math.round(rawY), 14, 72))
  }

  async function handlePhotoUpload(files: FileList | null) {
    setFormError('')
    const file = files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFormError('Please choose an image file (JPG, PNG, WebP, etc.).')
      return
    }
    try {
      const compressed = await compressAvatarFile(file)
      setFormPhoto(compressed)
    } catch {
      setFormError('That photo could not be loaded. Please try another image.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!modal || (modal.kind !== 'create' && modal.kind !== 'edit')) return

    const trimmedName = formName.trim()
    const trimmedRole = formRole.trim()
    const trimmedPhone = formPhone.trim()

    if (!trimmedName) {
      setFormError('Please enter a name for this family member.')
      return
    }
    if (!trimmedRole) {
      setFormError('Please enter a family role (e.g., Aunt, Cousin, Brother).')
      return
    }

    if (modal.kind === 'create') {
      const newMember: FamilyMember = {
        id: `apple-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: trimmedName,
        role: trimmedRole,
        phone: trimmedPhone,
        photoDataUrl: formPhoto,
        x: modal.x,
        y: modal.y,
        variant: 'apple',
      }
      persistMembers((current) => [...current, newMember])
      closeModal()
      return
    }

    const editId = modal.id
    persistMembers((current) =>
      current.map((member) =>
        member.id === editId
          ? {
              ...member,
              name: trimmedName,
              role: trimmedRole,
              phone: trimmedPhone,
              photoDataUrl: formPhoto,
            }
          : member,
      ),
    )
    setModal({ kind: 'view', id: editId })
    setFormError('')
  }

  function handleDelete(id: string) {
    persistMembers((current) => current.filter((member) => member.id !== id))
    closeModal()
  }

  const activeMember =
    modal && (modal.kind === 'view' || modal.kind === 'edit')
      ? members.find((member) => member.id === modal.id) ?? null
      : null

  return (
    <section className="family-tree-panel" aria-label="Lewis family tree">
      <div className="family-tree-intro justify-between">
        <div className="flex items-center gap-3">
          <span className="family-tree-icon">
            <TreeGlyph name="family" size={22} />
          </span>
          <div>
            <h3>The Lewis family</h3>
            <p>Tap anywhere on the tree to add an apple.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openCreateAt(50, 34)}
          className="flex min-h-9 shrink-0 items-center gap-1 rounded-full bg-[#edf3e4] px-3 text-[10px] font-semibold text-[#5b7447] hover:bg-[#e1ecd4]"
          aria-label="Add apple to family tree"
        >
          <TreeGlyph name="plus" size={14} />
          Add apple
        </button>
      </div>

      <div
        ref={treeRef}
        className="family-tree cursor-crosshair"
        onClick={handleTreeClick}
        role="region"
        aria-label="Interactive family tree canvas. Click anywhere on the tree to add a new family apple."
      >
        <svg
          className="family-tree-branches pointer-events-none"
          viewBox="0 0 320 440"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="tree-ground"
            d="M57 436C83 423 104 417 123 414C137 372 143 337 142 292C141 257 137 230 131 208C117 192 99 178 79 168L91 151C117 166 139 181 154 203C153 163 154 125 159 84H176C180 126 179 164 176 204C194 180 216 163 245 147L254 163C225 181 200 201 184 225C180 255 178 280 179 307C181 353 187 391 199 422C224 429 252 432 282 432C257 445 224 446 190 439C179 437 171 434 164 431C151 438 142 441 126 439C102 436 81 440 57 436Z"
          />
          <g className="tree-limbs">
            <path d="M158 143C127 105 91 83 47 73" />
            <path d="M162 161C197 119 233 98 279 88" />
            <path d="M158 229C120 199 82 188 34 194" />
            <path d="M162 246C205 211 246 201 289 211" />
            <path d="M158 313C127 285 99 284 71 307" />
            <path d="M162 324C194 294 224 296 255 320" />
          </g>
          <path
            className="tree-canopy"
            d="M18 257C3 238 8 211 29 201C10 177 22 147 50 141C38 115 56 88 85 87C82 56 109 37 137 49C151 22 188 22 204 49C231 28 267 43 270 74C299 73 316 99 304 123C329 137 331 169 311 187C331 209 320 241 294 247C302 278 276 301 248 291C236 319 204 329 181 307C163 332 128 326 117 301C91 319 58 302 60 274C38 287 17 278 18 257Z"
          />
        </svg>

        <div className="family-tree-members">
          {members.map((member) => (
            <button
              type="button"
              key={member.id}
              onClick={(event) => {
                event.stopPropagation()
                openView(member)
              }}
              style={{
                left: `${member.x}%`,
                top: `${member.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`family-person cursor-pointer hover:scale-105 ${member.isCurrent ? 'current' : ''}`}
              aria-label={`View ${member.name} (${member.role})`}
            >
              <small className="family-relation">{member.role}</small>
              <span className={`family-avatar ${member.variant}`}>
                <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit]">
                  {member.photoDataUrl ? (
                    <img
                      src={member.photoDataUrl}
                      alt={`${member.name} profile picture`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(member.name)
                  )}
                </span>
              </span>
              <strong>{member.name}</strong>
            </button>
          ))}

          {modal?.kind === 'create' && (
            <div
              aria-hidden="true"
              style={{
                left: `${modal.x}%`,
                top: `${modal.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="family-person pointer-events-none opacity-75"
            >
              <span className="family-avatar apple border-dashed">
                <TreeGlyph name="plus" size={20} />
              </span>
              <strong>New apple</strong>
            </div>
          )}
        </div>
      </div>

      <div className="family-tree-note">
        <TreeGlyph name="leaf" size={15} />
        Tap any apple to view contact details, edit, or remove.
      </div>
      {storageError && (
        <p className="mt-2 text-center text-[10px] leading-relaxed text-[#a1676d]">
          {storageError}
        </p>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#303d35]/40 p-4 backdrop-blur-[2px]"
          onClick={closeModal}
        >
          {modal.kind === 'view' && activeMember ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="family-member-view-title"
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[82dvh] w-full max-w-[356px] flex-col overflow-hidden rounded-[26px] border border-[#e3e9db] bg-white shadow-[0_20px_50px_rgba(48,61,53,0.22)]"
            >
              <div className="relative bg-[#e8efdc] px-5 pb-5 pt-6 text-center">
                <button
                  type="button"
                  onClick={closeModal}
                  className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-[#5d6e54]"
                  aria-label="Close family member details"
                >
                  <TreeGlyph name="close" />
                </button>
                <div className="mx-auto mb-3 mt-2 flex justify-center">
                  <span
                    className={`family-avatar ${activeMember.variant}`}
                    style={{ width: 82, height: 78, fontSize: 22 }}
                  >
                    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit]">
                      {activeMember.photoDataUrl ? (
                        <img
                          src={activeMember.photoDataUrl}
                          alt={`${activeMember.name} profile picture`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(activeMember.name)
                      )}
                    </span>
                  </span>
                </div>
                <span className="inline-block rounded-full bg-white/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[1px] text-[#6d825d]">
                  {activeMember.role}
                </span>
                <h3
                  id="family-member-view-title"
                  className="mt-2 font-['Manrope'] text-[22px] font-semibold tracking-[-0.5px] text-[#3f503d]"
                >
                  {activeMember.name}
                </h3>
              </div>

              <div className="space-y-3 px-5 py-5">
                <div className="rounded-[16px] border border-[#e6ebe0] bg-[#fafbf8] p-4">
                  <span className="block text-[9px] font-semibold uppercase tracking-[1.2px] text-[#9ba591]">
                    Contact information
                  </span>
                  {activeMember.phone ? (
                    <a
                      href={`tel:${activeMember.phone.replace(/[^+\d]/g, '')}`}
                      className="mt-2 flex items-center gap-2.5 text-[14px] font-semibold text-[#4d6841] hover:underline"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e8efdc] text-[#5e7a4a]">
                        <TreeGlyph name="phone" size={15} />
                      </span>
                      <span>{activeMember.phone}</span>
                    </a>
                  ) : (
                    <p className="mt-1.5 text-[12px] text-[#929c8a]">
                      No phone number added yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-[#edf0e9] bg-[#fafbf8] px-5 py-3.5">
                {confirmDelete ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#8a5d62]">
                      Remove {activeMember.name}?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="flex min-h-10 items-center justify-center rounded-[12px] border border-[#e1e6da] bg-white px-3.5 text-[12px] font-semibold text-[#6e7966]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(activeMember.id)}
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
                      onClick={() => openEdit(activeMember)}
                      className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-[#dfeace] text-[12px] font-semibold text-[#566f43]"
                    >
                      <TreeGlyph name="edit" size={15} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex min-h-10 items-center justify-center gap-1.5 rounded-[12px] border border-[#ead4d6] bg-[#fdf4f5] px-3 text-[12px] font-semibold text-[#9a575e]"
                      aria-label={`Delete ${activeMember.name}`}
                    >
                      <TreeGlyph name="trash" size={15} />
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex min-h-10 items-center justify-center rounded-[12px] border border-[#e1e6da] bg-white px-3.5 text-[12px] font-semibold text-[#6e7966]"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="family-apple-form-title"
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[85dvh] w-full max-w-[366px] flex-col overflow-hidden rounded-[26px] border border-[#e3e9db] bg-white shadow-[0_20px_50px_rgba(48,61,53,0.22)]"
            >
              <div className="flex items-start justify-between gap-3 bg-[#e8efdc] px-5 pb-4 pt-5">
                <div>
                  <span className="inline-block rounded-full bg-white/75 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[1px] text-[#758865]">
                    {modal.kind === 'create' ? 'New family apple' : 'Edit family apple'}
                  </span>
                  <h3
                    id="family-apple-form-title"
                    className="mt-2 font-['Manrope'] text-[20px] font-semibold tracking-[-0.5px] text-[#3f503d]"
                  >
                    {modal.kind === 'create' ? 'Add a family member' : `Edit ${activeMember?.name ?? ''}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 text-[#5d6e54]"
                  aria-label="Close apple form"
                >
                  <TreeGlyph name="close" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="flex items-center gap-4 rounded-[16px] border border-[#e8e2d8] bg-[#fbf7f0] p-3.5">
                  <span
                    className={`family-avatar ${modal.kind === 'edit' && activeMember ? activeMember.variant : 'apple'} shrink-0`}
                    style={{ width: 64, height: 60, fontSize: 16 }}
                  >
                    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[inherit]">
                      {formPhoto ? (
                        <img
                          src={formPhoto}
                          alt="Profile picture preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(formName || 'New')
                      )}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-[#6e6256]">
                      Profile picture
                    </span>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        void handlePhotoUpload(event.target.files)
                        event.target.value = ''
                      }}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="flex min-h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[10px] font-semibold text-[#7d6c5d] shadow-xs"
                      >
                        <TreeGlyph name="camera" size={14} />
                        {formPhoto ? 'Change photo' : 'Upload picture'}
                      </button>
                      {formPhoto && (
                        <button
                          type="button"
                          onClick={() => setFormPhoto(undefined)}
                          className="min-h-8 px-2 text-[10px] font-semibold text-[#a1676d]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[1.2px] text-[#9ba591]">
                    Family role
                  </span>
                  <input
                    value={formRole}
                    onChange={(event) => setFormRole(event.target.value.slice(0, 40))}
                    placeholder="e.g. Aunt, Cousin, Daughter"
                    required
                    autoFocus
                    className="w-full rounded-[13px] border border-[#e3e8dd] bg-[#fafbf8] px-3.5 py-2.5 text-[13px] text-[#455241] outline-none placeholder:text-[#afb7a8] focus:border-[#9eb48c]"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[1.2px] text-[#9ba591]">
                    Name
                  </span>
                  <input
                    value={formName}
                    onChange={(event) => setFormName(event.target.value.slice(0, 50))}
                    placeholder="e.g. Clara Lewis"
                    required
                    className="w-full rounded-[13px] border border-[#e3e8dd] bg-[#fafbf8] px-3.5 py-2.5 text-[13px] text-[#455241] outline-none placeholder:text-[#afb7a8] focus:border-[#9eb48c]"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[1.2px] text-[#9ba591]">
                    Phone number
                  </span>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(event) => setFormPhone(event.target.value.slice(0, 30))}
                    placeholder="e.g. (555) 234-5678"
                    className="w-full rounded-[13px] border border-[#e3e8dd] bg-[#fafbf8] px-3.5 py-2.5 text-[13px] text-[#455241] outline-none placeholder:text-[#afb7a8] focus:border-[#9eb48c]"
                  />
                </label>

                {formError && (
                  <p className="text-[11px] leading-relaxed text-[#a1676d]">{formError}</p>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex min-h-11 flex-1 items-center justify-center rounded-[13px] bg-[#dfeace] text-[12px] font-semibold text-[#566f43]"
                  >
                    {modal.kind === 'create' ? 'Create apple' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modal.kind === 'edit' && activeMember) {
                        setModal({ kind: 'view', id: activeMember.id })
                        setFormError('')
                      } else {
                        closeModal()
                      }
                    }}
                    className="flex min-h-11 items-center justify-center rounded-[13px] border border-[#e1e6da] bg-white px-4 text-[12px] font-semibold text-[#6e7966]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
