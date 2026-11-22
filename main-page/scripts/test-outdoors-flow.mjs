import {
  requestOutdoorsAccess,
  getCaregiverPictureState,
  getPatientPictureState,
  reviewOutdoorsAccess,
  startPatientPictureSession,
  resetPatientPictureSession,
} from '../src/lib/picture-day-store.ts'

const PATIENT = '439cb075-88c5-4fe3-b562-68f4a50062e2'
const CAREGIVER = 'd089a6c9-31cc-4950-bff3-59534fd02ac4'

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exitCode = 1
  } else {
    console.log('ok  :', msg)
  }
}

// 1. Patient asks for outdoors access.
const ask = await requestOutdoorsAccess(PATIENT, CAREGIVER)
assert(ask.ok && ask.request.status === 'pending', 'request created as pending')

// 2. Caregiver can see the pending request.
const cgPending = await getCaregiverPictureState(CAREGIVER, PATIENT)
assert(cgPending.outdoorsRequest?.status === 'pending', 'caregiver sees pending request')

// 3. Patient state reflects pending too.
const ptPending = await getPatientPictureState(PATIENT, CAREGIVER)
assert(ptPending.outdoorsRequest?.status === 'pending', 'patient state reflects pending')

// 4. Caregiver approves.
const review = await reviewOutdoorsAccess(CAREGIVER, PATIENT, ask.request.id, 'approve')
assert(review.ok && review.state.outdoorsRequest?.status === 'approved', 'caregiver approves -> approved')

// 5. Patient sees the approved grant.
const ptApproved = await getPatientPictureState(PATIENT, CAREGIVER)
assert(ptApproved.outdoorsRequest?.status === 'approved', 'patient sees approved grant')

// 6. Patient asks again -> reuses the standing approved grant (no re-wait).
const ask2 = await requestOutdoorsAccess(PATIENT, CAREGIVER)
assert(ask2.request.status === 'approved' && ask2.request.id === ask.request.id, 're-ask reuses approved grant')

// 7. Patient starts an outdoor session -> grant is consumed.
const started = await startPatientPictureSession(PATIENT, CAREGIVER, 'outdoors', [
  { object: 'tree', title: 'Find a tree', guidance: 'x' },
])
assert(Boolean(started.session), 'outdoor session started')
assert(started.outdoorsRequest === null, 'grant consumed after session start')

// 8. Next ask is a fresh pending (no leftover grant).
const ask3 = await requestOutdoorsAccess(PATIENT, CAREGIVER)
assert(ask3.request.status === 'pending' && ask3.request.id !== ask.request.id, 'fresh pending after consumption')

// 9. Caregiver denies -> request becomes denied; re-ask creates a new pending.
await reviewOutdoorsAccess(CAREGIVER, PATIENT, ask3.request.id, 'deny')
const ask4 = await requestOutdoorsAccess(PATIENT, CAREGIVER)
assert(ask4.request.status === 'pending', 'new pending after denial')

// Clean up the sessions we created.
await resetPatientPictureSession(PATIENT, CAREGIVER)
await resetPatientPictureSession(PATIENT, CAREGIVER)

console.log('done')
