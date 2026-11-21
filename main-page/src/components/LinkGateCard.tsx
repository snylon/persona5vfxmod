'use client'

import type { UserRole } from '@/lib/auth-store'

export default function LinkGateCard({
  role,
  patientCode,
  hasIncomingInvite = false,
  onGoToSettings,
  onCopyCode,
  compact = false,
}: {
  role: UserRole
  patientCode?: string
  hasIncomingInvite?: boolean
  onGoToSettings?: () => void
  onCopyCode?: () => void
  compact?: boolean
}) {
  return (
    <section
      className={`rounded-[22px] border border-dashed border-[#cfd9c4] bg-white text-center shadow-[0_6px_24px_rgba(52,77,62,0.04)] ${
        compact ? 'px-5 py-7' : 'px-6 py-10'
      }`}
      aria-label="Account link required"
    >
      <div className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-[16px] bg-[#edf3e4] text-[#668251]">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>

      <h3 className="font-['Manrope'] text-[17px] font-bold tracking-[-0.3px] text-[#3a4d3d]">
        Link up to use these features
      </h3>

      {role === 'caregiver' ? (
        <>
          <p className="mx-auto mt-2 max-w-[260px] text-[12px] leading-relaxed text-[#7e8b77]">
            Enter your patient&rsquo;s ID in the Settings tab to send them a link invite and unlock
            all caregiver features.
          </p>
          {onGoToSettings && (
            <button
              type="button"
              onClick={onGoToSettings}
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] bg-[#dfeace] px-4 text-[12px] font-semibold text-[#4d683c] hover:bg-[#d3e2be]"
            >
              Go to Settings to link
            </button>
          )}
        </>
      ) : (
        <>
          <p className="mx-auto mt-2 max-w-[265px] text-[12px] leading-relaxed text-[#7e8b77]">
            {hasIncomingInvite
              ? 'You have a link invite waiting — accept the notification above to unlock all features.'
              : 'Share your Patient ID with your caregiver so they can send you a link invite.'}
          </p>
          {patientCode && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d9e4cc] bg-[#f3f7ec] px-3.5 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.8px] text-[#788b68]">
                Your ID
              </span>
              <strong className="font-['Manrope'] text-[12px] font-extrabold tracking-[0.6px] text-[#3e5739]">
                {patientCode}
              </strong>
              {onCopyCode && (
                <button
                  type="button"
                  onClick={onCopyCode}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#5b7548] shadow-2xs"
                >
                  Copy
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
