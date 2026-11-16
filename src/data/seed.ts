// Demo data for the CORLIVA Care Coordinator portal.
// The signed-in person is Aisha Rahman, Care Coordinator for North Branch.
// Everything is relative to "today" so the demo always looks current.

export type Role =
  | 'Agency Admin'
  | 'Care Coordinator'
  | 'Care Supervisor'
  | 'HR Officer'
  | 'Finance Officer'
  | 'Caregiver'
  | 'Client / Family'

export interface Branch { id: string; name: string }
export interface User { id: string; name: string; email: string; role: Role; branch: string; status: 'Invited' | 'Active' | 'Switched off'; phone: string }
export interface ListItem { id: string; name: string; active: boolean; note?: string }
export type Stage = 'Enquiry' | 'Qualification' | 'Assessment' | 'Decision' | 'Converted' | 'Closed'
export interface Note { by: string; at: string; text: string }

/* ---- Clients ---- */
export interface Person { id: string; name: string; relationship: string; phone: string; email: string; emergency: boolean; representative: boolean; appAccess: 'No access' | 'Invited' | 'Active' | 'Removed' }
export interface Client {
  id: string; name: string; dob: string; branch: string; status: 'Active' | 'On hold' | 'Discharged'; coordinator: string
  services: string; since: string; phone: string; address: string; payer: string
  language: string; preferences: string; access: string; people: Person[]; fromReferral?: string
  statusReason?: string; history: Note[]
}

/* ---- Care plans (Coordinator drafts, Care Supervisor approves) ---- */
export type PlanStatus = 'Draft' | 'Awaiting review' | 'Approved' | 'Changes requested' | 'Superseded'
export interface CarePlan {
  id: string; clientId: string; version: number; status: PlanStatus
  services: string[]; tasks: string[]; instructions: string; goals: string; hoursPerWeek: number | null; reviewDate: string
  createdBy: string; createdDate: string; submittedDate?: string; approvedBy?: string; approvedDate?: string; effectiveDate?: string
  comments: Note[]
}

/* ---- Documents (uploading does not mean checked) ---- */
export interface ClientDoc { id: string; clientId: string; name: string; category: string; uploadedBy: string; date: string; expiry?: string; status: 'Not checked' | 'Checked' | 'Replaced' }
export const DOC_CATEGORIES = ['Service agreement', 'Signed care plan', 'Hospital discharge letter', 'Insurance or funding letter', 'Photo ID', 'Consent form', 'Other']

/* ---- Caregivers (HR keeps these; Coordinators view them to match visits) ---- */
export interface Caregiver {
  id: string; name: string; branch: string; type: 'Certified aide' | 'Companion' | 'Home health aide'
  skills: string[]; days: number[]; from: string; to: string; maxHours: number
  readiness: 'Ready' | 'Warning' | 'Blocked'; issue?: string; phone: string
}

/* ---- Visits ---- */
export type VisitStatus = 'Scheduled' | 'In progress' | 'Completed' | 'Unassigned' | 'Cancelled'
export interface Visit {
  id: string; clientId: string; caregiverId: string | null; date: string; start: string; end: string; branch: string; service: string
  status: VisitStatus; series?: string; checkIn?: string; checkOut?: string; review?: string; coverNote?: string; cancelReason?: string
}

/* ---- Family requests (they never change the schedule directly) ---- */
export type RequestType = 'Change a visit time' | 'Cancel a visit' | 'Add an extra visit' | 'Change caregiver' | 'Question'
export interface FamilyRequest {
  id: string; from: string; relationship: string; clientId: string; type: RequestType; text: string; preferred: string; visitId?: string
  date: string; time: string; status: 'New' | 'Waiting for family' | 'Approved' | 'Declined' | 'Answered'
  thread: { from: 'family' | 'agency'; by: string; at: string; text: string }[]
}

export type IncidentStatus = 'Reported' | 'Under review' | 'Action required' | 'Resolved' | 'Closed'
export interface Incident { id: string; title: string; category: string; severity: 'Low' | 'Medium' | 'High'; client: string; caregiver?: string; reportedBy: string; date: string; owner: string; due: string; status: IncidentStatus; branch: string; sensitive: boolean; notes: Note[] }
export interface AuditEntry { id: string; at: string; actor: string; action: string; record: string; type: string; before?: string; after?: string; reason?: string }
export interface Inbox { id: string; title: string; body: string; at: string; read: boolean; link: string; tone: 'danger' | 'warning' | 'info' | 'success' }
export interface CalEvent { id: string; date: string; title: string; time: string; tone: 'info' | 'warning' | 'danger'; note: string }

const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const addDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }
export const TODAY = addDays(0)
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
const shift = (hm: string, mins: number) => { const [h, m] = hm.split(':').map(Number); const t = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + mins)); return `${pad(Math.floor(t / 60))}:${pad(t % 60)}` }

export const ME = { name: 'Aisha Rahman', role: 'Care Coordinator' as Role, branch: 'north', email: 'aisha@royalityhomecare.com', phone: '(217) 555-0101', initials: 'AR' }

export const ROLES: { role: Role; does: string }[] = [
  { role: 'Care Coordinator', does: 'Handles referrals, client set-up, care plan drafts, schedules, finding cover and family requests.' },
  { role: 'Care Supervisor', does: 'Approves care plans, reviews finished visits, follows up incidents and can override blocking rules.' },
]

export const branches: Branch[] = [{ id: 'north', name: 'North Branch' }, { id: 'south', name: 'South Branch' }]

export const users: User[] = [
  { id: 'u0', name: 'Fred Morgan', email: 'fred@royalityhomecare.com', role: 'Agency Admin', branch: 'all', status: 'Active', phone: '(217) 555-0100' },
  { id: 'u1', name: 'Aisha Rahman', email: 'aisha@royalityhomecare.com', role: 'Care Coordinator', branch: 'north', status: 'Active', phone: '(217) 555-0101' },
  { id: 'u2', name: 'Michael Brooks', email: 'michael@royalityhomecare.com', role: 'Care Supervisor', branch: 'all', status: 'Active', phone: '(217) 555-0102' },
  { id: 'u3', name: 'Lena Ortiz', email: 'lena@royalityhomecare.com', role: 'HR Officer', branch: 'north', status: 'Active', phone: '(217) 555-0103' },
  { id: 'u8', name: 'Sara Kim', email: 'sara@royalityhomecare.com', role: 'Care Coordinator', branch: 'north', status: 'Active', phone: '(217) 555-0108' },
]

export const lists: Record<string, ListItem[]> = {
  services: [
    { id: 's1', name: 'Personal care', active: true, note: 'Bathing, dressing, toileting' },
    { id: 's2', name: 'Companionship', active: true, note: 'Company, outings, conversation' },
    { id: 's3', name: 'Homemaking', active: true, note: 'Light cleaning, laundry, meals' },
    { id: 's4', name: 'Respite care', active: true, note: 'Short breaks for family carers' },
    { id: 's5', name: 'Medication reminders', active: true, note: 'Prompts only, no administering' },
  ],
  sources: [
    { id: 'r1', name: 'Hospital discharge', active: true }, { id: 'r2', name: 'Family or friend', active: true }, { id: 'r3', name: 'Doctor’s office', active: true },
    { id: 'r4', name: 'Website enquiry', active: true }, { id: 'r5', name: 'Insurance or care manager', active: true },
  ],
  tasks: [
    { id: 't1', name: 'Help with bathing', active: true }, { id: 't2', name: 'Help getting dressed', active: true }, { id: 't3', name: 'Prepare a meal', active: true },
    { id: 't4', name: 'Medication reminder', active: true }, { id: 't5', name: 'Light housekeeping', active: true }, { id: 't6', name: 'Walk or gentle exercise', active: true },
    { id: 't7', name: 'Laundry', active: true }, { id: 't8', name: 'Company and conversation', active: true },
  ],
  incidents: [
    { id: 'i1', name: 'Fall', active: true }, { id: 'i2', name: 'Medication concern', active: true }, { id: 'i3', name: 'Missed visit', active: true },
    { id: 'i4', name: 'Injury to caregiver', active: true }, { id: 'i5', name: 'Complaint', active: true }, { id: 'i6', name: 'Safeguarding concern', active: true, note: 'Only approved roles can see these' },
  ],
  reasons: [
    { id: 'c1', name: 'Client in hospital', active: true }, { id: 'c2', name: 'Client asked to cancel', active: true },
    { id: 'c3', name: 'No caregiver available', active: true }, { id: 'c4', name: 'Weather or travel problem', active: true },
  ],
}

/** Set by the Agency Admin. Care Coordinators are not on the override list. */
export const rules = { overrideRoles: ['Agency Admin', 'Care Supervisor'] as Role[], lateArrivalMins: 15 }

export const caregivers: Caregiver[] = [
  { id: 'g1', name: 'Grace Mensah', branch: 'north', type: 'Certified aide', skills: ['Personal care', 'Medication reminders', 'Homemaking', 'Companionship'], days: [1, 2, 3, 4, 5, 6], from: '07:00', to: '15:00', maxHours: 40, readiness: 'Ready', phone: '(217) 555-0201' },
  { id: 'g2', name: 'Daniel Osei', branch: 'north', type: 'Certified aide', skills: ['Personal care', 'Medication reminders', 'Respite care'], days: [1, 2, 3, 4, 5], from: '08:00', to: '18:00', maxHours: 40, readiness: 'Blocked', issue: 'First-aid certificate expired', phone: '(217) 555-0202' },
  { id: 'g3', name: 'Maria Lopez', branch: 'north', type: 'Certified aide', skills: ['Personal care', 'Medication reminders', 'Companionship', 'Homemaking'], days: [0, 1, 2, 3, 4, 5, 6], from: '10:00', to: '19:00', maxHours: 40, readiness: 'Ready', phone: '(217) 555-0203' },
  { id: 'g7', name: 'Hannah Lee', branch: 'north', type: 'Companion', skills: ['Companionship', 'Homemaking'], days: [1, 2, 3, 4, 5], from: '09:00', to: '17:00', maxHours: 30, readiness: 'Blocked', issue: 'Background check not verified', phone: '(217) 555-0207' },
  { id: 'g9', name: 'Rosa Diaz', branch: 'north', type: 'Home health aide', skills: ['Personal care', 'Medication reminders', 'Respite care', 'Homemaking'], days: [0, 1, 2, 3, 4, 5, 6], from: '06:00', to: '14:00', maxHours: 40, readiness: 'Ready', phone: '(217) 555-0209' },
  { id: 'g10', name: 'Ben Okafor', branch: 'north', type: 'Certified aide', skills: ['Personal care', 'Companionship', 'Respite care'], days: [1, 2, 3, 4, 5, 6], from: '09:00', to: '17:00', maxHours: 35, readiness: 'Warning', issue: 'Annual training due in 9 days', phone: '(217) 555-0210' },
  { id: 'g11', name: 'Lily Chen', branch: 'north', type: 'Companion', skills: ['Companionship', 'Homemaking'], days: [0, 2, 4, 6], from: '12:00', to: '20:00', maxHours: 24, readiness: 'Ready', phone: '(217) 555-0211' },
  { id: 'g5', name: 'Sofia Novak', branch: 'south', type: 'Certified aide', skills: ['Personal care', 'Homemaking'], days: [1, 2, 3, 4, 5], from: '08:00', to: '16:00', maxHours: 40, readiness: 'Ready', phone: '(217) 555-0205' },
]

const P = (id: string, name: string, relationship: string, phone: string, email: string, emergency: boolean, representative: boolean, appAccess: Person['appAccess']): Person => ({ id, name, relationship, phone, email, emergency, representative, appAccess })
export const clients: Client[] = [
  { id: 'c1', name: 'Margaret Hale', dob: '1937-05-02', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Personal care, Medication reminders', since: 'Mar 2025', phone: '(217) 555-0311', address: '14 Elm St, Springfield, IL 62701', payer: 'Long-term care insurance', language: 'English', preferences: 'Prefers female caregivers. Likes a cup of tea after her bath.', access: 'Key safe by the front door, code given by phone. Small dog — friendly.',
    people: [P('p1', 'Susan Hale', 'Daughter', '(217) 555-0611', 'susan.hale@example.com', true, true, 'Active'), P('p2', 'Tom Hale', 'Son', '(217) 555-0612', '', true, false, 'No access')], history: [] },
  { id: 'c2', name: 'Robert King', dob: '1944-10-19', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Companionship', since: 'Jan 2026', phone: '(217) 555-0312', address: '9 Oak Lane, Springfield, IL 62702', payer: 'Private pay', language: 'English', preferences: 'Loves baseball and short walks to the park.', access: 'Ring the bell twice. Hard of hearing.',
    people: [P('p3', 'Mark King', 'Son', '(217) 555-0613', 'mark.king@example.com', true, true, 'Active')], history: [] },
  { id: 'c5', name: 'Dorothy Fields', dob: '1935-02-11', branch: 'north', status: 'On hold', coordinator: 'Aisha Rahman', services: 'Personal care', since: 'Nov 2024', phone: '(217) 555-0315', address: '31 Maple Dr, Springfield, IL 62704', payer: 'Private pay', language: 'English', preferences: '', access: 'Son lets carers in.', statusReason: 'In hospital since 2 Nov',
    people: [P('p4', 'Jim Fields', 'Son', '(217) 555-0615', 'jim.fields@example.com', true, true, 'Invited')], history: [{ by: 'Aisha Rahman', at: '2 Nov, 09:10', text: 'Put on hold. Reason: in hospital since 2 Nov.' }] },
  { id: 'c6', name: 'Harold Jenkins', dob: '1940-08-19', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Medication reminders', since: 'Sep 2026', phone: '(217) 555-0316', address: '88 Cedar Ave, Springfield, IL 62701', payer: 'Private pay', language: 'English', preferences: 'Afternoon visits only.', access: 'Wife at home to let carers in.',
    people: [P('p5', 'Linda Jenkins', 'Wife', '(217) 555-0418', '', true, true, 'No access')], fromReferral: 'R-1020', history: [] },
  { id: 'c9', name: 'Edith Morris', dob: '1939-12-07', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Personal care', since: 'May 2026', phone: '(217) 555-0319', address: '40 Grove St, Springfield, IL 62702', payer: 'Long-term care insurance', language: 'English', preferences: 'Early riser. Likes porridge for breakfast.', access: 'Key under the blue pot (agreed with family).',
    people: [P('p6', 'Paul Morris', 'Son', '(217) 555-0619', 'paul.morris@example.com', true, true, 'Active')], history: [] },
  { id: 'c12', name: 'Samuel Grant', dob: '1942-03-28', branch: 'north', status: 'Active', coordinator: 'Sara Kim', services: 'Personal care', since: 'Dec 2025', phone: '(217) 555-0322', address: '27 Park Ave, Springfield, IL 62701', payer: 'Private pay', language: 'English, some Spanish', preferences: 'Uses a walking frame indoors.', access: 'Wife at home.',
    people: [P('p7', 'Ruth Grant', 'Wife', '(217) 555-0622', '', true, true, 'No access')], history: [] },
  { id: 'c13', name: 'Gloria Vance', dob: '1946-07-15', branch: 'north', status: 'Active', coordinator: 'Aisha Rahman', services: 'Personal care, Homemaking', since: 'Nov 2026', phone: '(217) 555-0323', address: '', payer: 'Medicaid waiver', language: 'English', preferences: '', access: '',
    people: [], fromReferral: 'R-1010', history: [] },
  { id: 'c3', name: 'Evelyn Price', dob: '1941-01-09', branch: 'south', status: 'Active', coordinator: 'Daniel Reed', services: 'Homemaking, Personal care', since: 'Aug 2025', phone: '(217) 555-0313', address: '72 River Rd, Springfield', payer: 'Medicaid waiver', language: 'English', preferences: '', access: '', people: [], history: [] },
]

export const carePlans: CarePlan[] = [
  { id: 'cp1', clientId: 'c1', version: 2, status: 'Approved', services: ['Personal care', 'Medication reminders'], tasks: ['Help with bathing', 'Help getting dressed', 'Medication reminder', 'Prepare a meal'], instructions: 'Shower seat in the bathroom. Check skin on heels for redness. Medicines are in the blue box on the kitchen table.', goals: 'Stay safe and independent at home.', hoursPerWeek: 14, reviewDate: addDays(-3), createdBy: 'Aisha Rahman', createdDate: addDays(-185), submittedDate: addDays(-184), approvedBy: 'Michael Brooks', approvedDate: addDays(-183), effectiveDate: addDays(-183), comments: [] },
  { id: 'cp1a', clientId: 'c1', version: 1, status: 'Superseded', services: ['Personal care'], tasks: ['Help with bathing', 'Help getting dressed'], instructions: 'Shower seat in the bathroom.', goals: 'Stay safe at home.', hoursPerWeek: 10, reviewDate: addDays(-185), createdBy: 'Aisha Rahman', createdDate: addDays(-370), approvedBy: 'Michael Brooks', approvedDate: addDays(-368), effectiveDate: addDays(-368), comments: [] },
  { id: 'cp2', clientId: 'c2', version: 1, status: 'Approved', services: ['Companionship'], tasks: ['Company and conversation', 'Walk or gentle exercise'], instructions: 'Short walk to the park if the weather is fine.', goals: 'Less lonely; keep active.', hoursPerWeek: 6, reviewDate: addDays(60), createdBy: 'Aisha Rahman', createdDate: addDays(-300), approvedBy: 'Michael Brooks', approvedDate: addDays(-298), effectiveDate: addDays(-298), comments: [] },
  { id: 'cp5', clientId: 'c5', version: 1, status: 'Approved', services: ['Personal care'], tasks: ['Help with bathing', 'Help getting dressed'], instructions: '', goals: '', hoursPerWeek: 10, reviewDate: addDays(30), createdBy: 'Aisha Rahman', createdDate: addDays(-360), approvedBy: 'Michael Brooks', approvedDate: addDays(-358), effectiveDate: addDays(-358), comments: [] },
  { id: 'cp6', clientId: 'c6', version: 1, status: 'Approved', services: ['Medication reminders'], tasks: ['Medication reminder'], instructions: 'Three afternoon medicines in the pill box. Remind him to drink water.', goals: 'Never miss afternoon medicines.', hoursPerWeek: 7, reviewDate: addDays(120), createdBy: 'Aisha Rahman', createdDate: addDays(-50), approvedBy: 'Michael Brooks', approvedDate: addDays(-49), effectiveDate: addDays(-49), comments: [] },
  { id: 'cp9', clientId: 'c9', version: 1, status: 'Approved', services: ['Personal care'], tasks: ['Help getting dressed', 'Prepare a meal'], instructions: 'Porridge for breakfast.', goals: '', hoursPerWeek: 7.5, reviewDate: addDays(40), createdBy: 'Aisha Rahman', createdDate: addDays(-180), approvedBy: 'Michael Brooks', approvedDate: addDays(-178), effectiveDate: addDays(-178), comments: [] },
  { id: 'cp9b', clientId: 'c9', version: 2, status: 'Changes requested', services: ['Personal care', 'Homemaking'], tasks: ['Help getting dressed', 'Prepare a meal', 'Laundry'], instructions: 'Porridge for breakfast. Laundry on Fridays.', goals: '', hoursPerWeek: 10, reviewDate: addDays(180), createdBy: 'Aisha Rahman', createdDate: addDays(-4), submittedDate: addDays(-4), comments: [{ by: 'Michael Brooks', at: `${addDays(-2)}`, text: 'Please add the goals and say who does the laundry if Edith is unwell. Then send it back to me.' }] },
  { id: 'cp12', clientId: 'c12', version: 1, status: 'Approved', services: ['Personal care'], tasks: ['Help with bathing', 'Help getting dressed', 'Walk or gentle exercise'], instructions: 'Uses a walking frame indoors.', goals: '', hoursPerWeek: 15, reviewDate: addDays(25), createdBy: 'Sara Kim', createdDate: addDays(-330), approvedBy: 'Michael Brooks', approvedDate: addDays(-328), effectiveDate: addDays(-328), comments: [] },
  { id: 'cp13', clientId: 'c13', version: 1, status: 'Draft', services: ['Personal care', 'Homemaking'], tasks: ['Help with bathing'], instructions: '', goals: '', hoursPerWeek: 10, reviewDate: '', createdBy: 'Aisha Rahman', createdDate: addDays(-2), comments: [] },
]

export const documents: ClientDoc[] = [
  { id: 'd1', clientId: 'c1', name: 'Service agreement (signed).pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-370), status: 'Checked' },
  { id: 'd2', clientId: 'c1', name: 'Lifeway insurance letter.pdf', category: 'Insurance or funding letter', uploadedBy: 'Aisha Rahman', date: addDays(-200), expiry: addDays(20), status: 'Checked' },
  { id: 'd3', clientId: 'c2', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-300), status: 'Checked' },
  { id: 'd4', clientId: 'c6', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-50), status: 'Checked' },
  { id: 'd5', clientId: 'c9', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-180), status: 'Checked' },
  { id: 'd6', clientId: 'c12', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Sara Kim', date: addDays(-330), status: 'Checked' },
  { id: 'd7', clientId: 'c13', name: 'Hospital discharge letter.pdf', category: 'Hospital discharge letter', uploadedBy: 'Aisha Rahman', date: addDays(-3), status: 'Not checked' },
  { id: 'd8', clientId: 'c5', name: 'Service agreement.pdf', category: 'Service agreement', uploadedBy: 'Aisha Rahman', date: addDays(-360), status: 'Checked' },
]

// Weekly visit pattern per client: [weekdays (0=Sun), start, end, service, regular caregiver]
const PATTERN: Record<string, [number[], string, string, string, string]> = {
  c1: [[1, 2, 3, 4, 5, 6, 0], '09:00', '11:00', 'Personal care', 'g1'],
  c2: [[1, 3, 5], '11:00', '13:00', 'Companionship', 'g3'],
  c6: [[1, 2, 3, 4, 5, 6, 0], '15:00', '16:00', 'Medication reminders', 'g3'],
  c9: [[1, 2, 3, 4, 5], '07:00', '08:30', 'Personal care', 'g9'],
  c12: [[2, 3, 4, 5, 6], '09:30', '12:30', 'Personal care', 'g10'],
}
// Visits that still need a caregiver: [dayOffset, clientId]
const OPEN: [number, string][] = [[1, 'c6'], [1, 'c12'], [2, 'c2'], [4, 'c9']]
// Past visits cancelled because nobody was free
const MISSED: [number, string][] = [[-4, 'c12'], [-2, 'c2']]

function buildVisits(): Visit[] {
  const out: Visit[] = []
  const now = nowHM()
  let n = 4700
  // Find today's most recently started visit: it shows as "late, not checked in"
  const todayStarts = Object.entries(PATTERN).filter(([cid, [days]]) => days.includes(new Date().getDay()) && clients.find(c => c.id === cid)?.status === 'Active').map(([cid, p]) => ({ cid, start: p[1] })).filter(x => x.start <= shift(now, -rules.lateArrivalMins)).sort((a, b) => b.start.localeCompare(a.start))
  const lateCid = todayStarts[0]?.cid
  for (let day = -7; day <= 13; day++) {
    const d = new Date(); d.setDate(d.getDate() + day)
    for (const [cid, [days, start, end, service, cg]] of Object.entries(PATTERN)) {
      if (!days.includes(d.getDay())) continue
      const c = clients.find(x => x.id === cid)!
      if (c.status !== 'Active') continue
      n += 1
      const open = OPEN.some(([o, x]) => o === day && x === cid)
      const missed = MISSED.some(([o, x]) => o === day && x === cid)
      const v: Visit = { id: 'v' + n, clientId: cid, caregiverId: open || missed ? null : cg, date: iso(d), start, end, branch: c.branch, service, status: 'Scheduled', series: 's-' + cid }
      if (day < 0) { v.status = missed ? 'Cancelled' : 'Completed'; if (missed) v.cancelReason = 'No caregiver available'; else { v.checkIn = shift(start, 2); v.checkOut = shift(end, 1) } }
      else if (day === 0) {
        if (cid === lateCid) { /* late: not checked in yet */ }
        else if (end <= now) { v.status = 'Completed'; v.checkIn = shift(start, 3); v.checkOut = shift(end, 0) }
        else if (start <= now) { v.status = 'In progress'; v.checkIn = shift(start, 4) }
      }
      if (open) v.status = 'Unassigned'
      out.push(v)
    }
  }
  // Daniel Osei's first-aid certificate expired after he was booked: flag his future visit for review
  const flagged = out.find(v => v.clientId === 'c2' && v.date > TODAY && v.status === 'Scheduled')
  if (flagged) { flagged.caregiverId = 'g2'; flagged.review = 'Daniel Osei is no longer ready to work (first-aid certificate expired)' }
  return out
}
export const visits: Visit[] = buildVisits()


export type ContactType = 'Phone call' | 'Text message' | 'Email' | 'Home visit' | 'Letter'
export interface ContactRecord { id: string; date: string; time: string; by: string; type: ContactType; direction: 'Outgoing' | 'Incoming'; withWhom: string; summary: string; outcome: string; response: string; followUp?: string; stage: Stage }
export interface StageEntry { stage: Stage | 'Closed'; date: string; time: string; by: string; note?: string }
export interface Qualification { area: boolean; service: boolean; times: boolean; funding: string; notes: string }
export interface Assessment { status: 'Not booked' | 'Booked' | 'Done'; date: string; time: string; assessor: string; where: string; needs: string; risks: string; mobility: string; hours: number | null; recommended: string; notes: string; doneBy?: string; doneDate?: string }
export interface Decision { agreementSigned: boolean; startDate: string; result?: 'Accepted' | 'Declined'; reason?: string; by?: string; date?: string }
export interface Referral {
  id: string; name: string; dob: string; address: string; phone: string; email: string
  contact: string; relationship: string; contactPhone: string
  source: string; services: string[]; urgency: 'Routine' | 'Soon' | 'Urgent'; preferredTimes: string; reasonForCare: string
  owner: string; stage: Stage; branch: string; outcome?: string; closedAt?: Stage
  hold?: { reason: string; until: string; by: string; date: string }
  stageLog: StageEntry[]; qualification: Qualification; assessment: Assessment; decision: Decision
  contacts: ContactRecord[]; history: Note[]
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** Display stamp like "12 Nov, 10:15" for a day offset from today. */
export const stampFor = (dayOffset: number, time: string) => { const d = new Date(); d.setDate(d.getDate() + dayOffset); return `${d.getDate()} ${MON[d.getMonth()]}, ${time}` }

const Q0: Qualification = { area: false, service: false, times: false, funding: '', notes: '' }
const A0: Assessment = { status: 'Not booked', date: '', time: '', assessor: '', where: 'Client’s home', needs: '', risks: '', mobility: '', hours: null, recommended: '', notes: '' }
const D0: Decision = { agreementSigned: false, startDate: '' }
let cn = 0
const C = (day: number, time: string, by: string, type: ContactType, direction: ContactRecord['direction'], withWhom: string, summary: string, outcome: string, response: string, stage: Stage, followUp?: string): ContactRecord =>
  ({ id: 'k' + (++cn), date: addDays(day), time, by, type, direction, withWhom, summary, outcome, response, stage, followUp: followUp ? addDays(Number(followUp)) : undefined })
const L = (stage: StageEntry['stage'], day: number, time: string, by: string, note?: string): StageEntry => ({ stage, date: addDays(day), time, by, note })
const H = (day: number, time: string, by: string, text: string): Note => ({ by, at: stampFor(day, time), text })

export const FUNDING = ['Private pay', 'Long-term care insurance', 'Medicaid waiver', 'Veterans benefits', 'Other']
export const CONTACT_OUTCOMES = ['Spoke to them', 'Left a message', 'No answer', 'Sent information', 'They asked for a call back', 'Not interested']

export const referrals: Referral[] = [
  {
    id: 'R-1042', name: 'Alice Turner', dob: '1941-03-14', address: '', phone: '(217) 555-0451', email: '',
    contact: 'Nurse Kim, St. Mary’s Hospital', relationship: 'Hospital discharge nurse', contactPhone: '(217) 555-0411',
    source: 'Hospital discharge', services: ['Personal care'], urgency: 'Urgent', preferredTimes: 'Mornings, 7 days', reasonForCare: 'Going home after a hip operation. Needs help washing and dressing for about 6 weeks.',
    owner: 'Aisha Rahman', stage: 'Enquiry', branch: 'north',
    stageLog: [L('Enquiry', 0, '08:40', 'Aisha Rahman', 'Created from a hospital phone call')],
    qualification: { ...Q0 }, assessment: { ...A0 }, decision: { ...D0 },
    contacts: [C(0, '08:35', 'Aisha Rahman', 'Phone call', 'Incoming', 'Nurse Kim (St. Mary’s)', 'Hospital called about Alice going home on Monday after a hip operation.', 'Spoke to them', 'Discharge is Monday morning. Nurse will send the discharge summary. Home address to follow from the family.', 'Enquiry', '0')],
    history: [H(0, '08:40', 'Aisha Rahman', 'Referral created.')],
  },
  {
    id: 'R-1041', name: 'George Bell', dob: '1938-11-02', address: '17 Linden St, Springfield, IL 62704', phone: '(217) 555-0452', email: '',
    contact: 'Carol Bell', relationship: 'Daughter', contactPhone: '(217) 555-0412',
    source: 'Family or friend', services: ['Companionship', 'Homemaking'], urgency: 'Routine', preferredTimes: 'Weekday afternoons', reasonForCare: 'Lives alone and is getting lonely. Daughter works full time and would like someone to visit and help around the house.',
    owner: 'Daniel Reed', stage: 'Enquiry', branch: 'south',
    stageLog: [L('Enquiry', -1, '14:10', 'Daniel Reed')],
    qualification: { ...Q0 }, assessment: { ...A0 }, decision: { ...D0 },
    contacts: [
      C(-1, '14:05', 'Daniel Reed', 'Phone call', 'Incoming', 'Carol Bell (daughter)', 'Carol called asking about companionship visits for her father.', 'Spoke to them', 'Wants 2–3 afternoons a week. Asked for prices by email.', 'Enquiry'),
      C(-1, '15:30', 'Daniel Reed', 'Email', 'Outgoing', 'Carol Bell (daughter)', 'Sent our services leaflet and price list.', 'Sent information', 'Carol replied: “Thanks, this looks right. Happy to go ahead.”', 'Enquiry'),
    ],
    history: [H(-1, '14:10', 'Daniel Reed', 'Referral created.')],
  },
  {
    id: 'R-1039', name: 'Nancy Ward', dob: '1944-06-21', address: '52 Oak Hollow Rd, Springfield, IL 62702', phone: '(217) 555-0453', email: 'nancy.ward@example.com',
    contact: 'Dr. Patel, Westside Clinic', relationship: 'Family doctor', contactPhone: '(217) 555-0413',
    source: 'Doctor’s office', services: ['Personal care', 'Homemaking'], urgency: 'Soon', preferredTimes: 'Mon, Wed, Fri mornings', reasonForCare: 'Arthritis is making washing and cooking hard. Doctor recommends help 3 mornings a week.',
    owner: 'Aisha Rahman', stage: 'Qualification', branch: 'north',
    stageLog: [L('Enquiry', -4, '10:00', 'Aisha Rahman'), L('Qualification', -2, '11:20', 'Aisha Rahman')],
    qualification: { area: true, service: true, times: true, funding: '', notes: 'Nancy thinks she has long-term care insurance but needs to find the policy.' }, assessment: { ...A0 }, decision: { ...D0 },
    contacts: [
      C(-4, '09:45', 'Aisha Rahman', 'Email', 'Incoming', 'Dr. Patel', 'Referral letter received from Westside Clinic.', 'Sent information', 'Letter asks for personal care and meal help.', 'Enquiry'),
      C(-3, '10:30', 'Aisha Rahman', 'Phone call', 'Outgoing', 'Nancy Ward', 'Called Nancy to introduce ourselves and check she wants care.', 'Spoke to them', 'Nancy is keen. Mornings suit her best.', 'Enquiry'),
      C(-1, '16:00', 'Aisha Rahman', 'Phone call', 'Outgoing', 'Nancy Ward', 'Asked how the care will be paid for.', 'They asked for a call back', 'Nancy will look for her insurance policy and call back on Monday.', 'Qualification', '2'),
    ],
    history: [H(-4, '10:00', 'Aisha Rahman', 'Referral created.'), H(-2, '11:20', 'Aisha Rahman', 'Moved to Qualification.')],
  },
  {
    id: 'R-1036', name: 'Paul Rivera', dob: '1950-01-30', address: '9 Kent Ave, Springfield, IL 62704', phone: '(217) 555-0414', email: 'paul.rivera@example.com',
    contact: 'Paul Rivera', relationship: 'Self', contactPhone: '(217) 555-0414',
    source: 'Website enquiry', services: ['Respite care'], urgency: 'Routine', preferredTimes: 'Weekends', reasonForCare: 'Cares for his wife and needs a break at weekends.',
    owner: 'Unassigned', stage: 'Qualification', branch: 'south',
    stageLog: [L('Enquiry', -6, '09:00', 'System', 'Website form'), L('Qualification', -4, '12:00', 'Daniel Reed')],
    qualification: { area: true, service: true, times: false, funding: 'Private pay', notes: '' }, assessment: { ...A0 }, decision: { ...D0 },
    contacts: [
      C(-6, '09:00', 'System', 'Email', 'Incoming', 'Paul Rivera', 'Website enquiry form received.', 'Sent information', 'Asks for weekend respite so he can rest.', 'Enquiry'),
      C(-5, '11:00', 'Daniel Reed', 'Phone call', 'Outgoing', 'Paul Rivera', 'Called to talk through respite care.', 'Spoke to them', 'Wants Saturday and Sunday, 9am–1pm. Will pay privately.', 'Enquiry'),
    ],
    history: [H(-6, '09:00', 'System', 'Referral created from the website.'), H(-4, '12:00', 'Daniel Reed', 'Moved to Qualification.'), H(-3, '09:00', 'Daniel Reed', 'Daniel went on leave. Referral has no owner.')],
  },
  {
    id: 'R-1033', name: 'Betty Collins', dob: '1936-09-08', address: '3 Primrose Ln, Springfield, IL 62701', phone: '(217) 555-0455', email: '',
    contact: 'Jo Adams, Prairie Care Management', relationship: 'Care manager', contactPhone: '(217) 555-0415',
    source: 'Insurance or care manager', services: ['Personal care'], urgency: 'Soon', preferredTimes: 'Daily, 8–10am', reasonForCare: 'Needs help getting up and dressed each morning after a stroke last year.',
    owner: 'Aisha Rahman', stage: 'Assessment', branch: 'north',
    stageLog: [L('Enquiry', -7, '10:15', 'Aisha Rahman'), L('Qualification', -5, '09:30', 'Aisha Rahman'), L('Assessment', -1, '15:00', 'Aisha Rahman')],
    qualification: { area: true, service: true, times: true, funding: 'Long-term care insurance', notes: 'Policy number confirmed by the care manager.' },
    assessment: { ...A0, status: 'Booked', date: addDays(1), time: '10:00', assessor: 'Michael Brooks', where: 'Client’s home' }, decision: { ...D0 },
    contacts: [
      C(-7, '10:00', 'Aisha Rahman', 'Phone call', 'Incoming', 'Jo Adams (care manager)', 'Care manager referred Betty for morning personal care.', 'Spoke to them', 'Insurance will cover 10 hours a week.', 'Enquiry'),
      C(-6, '14:00', 'Aisha Rahman', 'Phone call', 'Outgoing', 'Betty Collins', 'Introduced the agency to Betty.', 'Spoke to them', 'Happy for us to visit. Prefers early mornings.', 'Enquiry'),
      C(-5, '09:15', 'Aisha Rahman', 'Email', 'Incoming', 'Jo Adams (care manager)', 'Insurance details sent.', 'Sent information', 'Policy covers personal care, 10 hours a week.', 'Qualification'),
      C(-1, '14:45', 'Aisha Rahman', 'Text message', 'Outgoing', 'Betty Collins', 'Confirmed the home assessment time.', 'Spoke to them', 'Betty replied “Yes, see you then.”', 'Assessment'),
    ],
    history: [H(-7, '10:15', 'Aisha Rahman', 'Referral created.'), H(-5, '09:30', 'Aisha Rahman', 'Moved to Qualification.'), H(-1, '15:00', 'Aisha Rahman', 'Moved to Assessment. Home visit booked with Michael Brooks.')],
  },
  {
    id: 'R-1030', name: 'Arthur Lane', dob: '1939-04-11', address: '61 Station Rd, Springfield, IL 62703', phone: '(217) 555-0456', email: '',
    contact: 'Margaret Lane', relationship: 'Wife', contactPhone: '(217) 555-0416',
    source: 'Hospital discharge', services: ['Personal care', 'Medication reminders'], urgency: 'Urgent', preferredTimes: 'Twice daily, 8am and 6pm', reasonForCare: 'Home from hospital after a chest infection. Weak and needs help morning and evening.',
    owner: 'Daniel Reed', stage: 'Decision', branch: 'south',
    stageLog: [L('Enquiry', -10, '11:00', 'Daniel Reed'), L('Qualification', -9, '10:00', 'Daniel Reed'), L('Assessment', -7, '16:00', 'Daniel Reed'), L('Decision', -5, '13:00', 'Priya Shah')],
    qualification: { area: true, service: true, times: true, funding: 'Medicaid waiver', notes: 'Waiver approved for 14 hours a week.' },
    assessment: { status: 'Done', date: addDays(-5), time: '11:00', assessor: 'Priya Shah', where: 'Client’s home', needs: 'Help with washing, dressing and getting to the toilet. Reminders for 4 daily medicines.', risks: 'Loose rug in the hallway. Steep stairs to the bathroom.', mobility: 'Walks with a frame', hours: 14, recommended: 'Personal care, Medication reminders', notes: 'Wife is very supportive but cannot lift him.', doneBy: 'Priya Shah', doneDate: addDays(-5) },
    decision: { agreementSigned: false, startDate: addDays(2) },
    contacts: [
      C(-10, '10:40', 'Daniel Reed', 'Phone call', 'Incoming', 'Ward 4B nurse', 'Hospital asked for care to start on discharge.', 'Spoke to them', 'Discharge planned within the week.', 'Enquiry'),
      C(-9, '09:30', 'Daniel Reed', 'Phone call', 'Outgoing', 'Margaret Lane (wife)', 'Checked times and payment.', 'Spoke to them', 'Morning and evening visits. Medicaid waiver in place.', 'Qualification'),
      C(-5, '11:00', 'Priya Shah', 'Home visit', 'Outgoing', 'Arthur and Margaret Lane', 'Home assessment done.', 'Spoke to them', 'Both happy with the plan. Agreement left with Margaret to sign.', 'Assessment'),
      C(-3, '10:00', 'Daniel Reed', 'Phone call', 'Outgoing', 'Margaret Lane (wife)', 'Asked about the signed service agreement.', 'Left a message', 'No answer. Left a voicemail.', 'Decision', '0'),
    ],
    history: [H(-10, '11:00', 'Daniel Reed', 'Referral created.'), H(-9, '10:00', 'Daniel Reed', 'Moved to Qualification.'), H(-7, '16:00', 'Daniel Reed', 'Moved to Assessment.'), H(-5, '13:00', 'Priya Shah', 'Assessment saved. Moved to Decision.')],
  },
  {
    id: 'R-1028', name: 'Linda Shaw', dob: '1947-12-03', address: '24 Willow Way, Springfield, IL 62701', phone: '(217) 555-0457', email: 'mike.shaw@example.com',
    contact: 'Mike Shaw', relationship: 'Son', contactPhone: '(217) 555-0417',
    source: 'Family or friend', services: ['Companionship'], urgency: 'Routine', preferredTimes: 'Tue and Thu, 1–4pm', reasonForCare: 'Early memory loss. Son wants company for her and a gentle walk twice a week.',
    owner: 'Aisha Rahman', stage: 'Decision', branch: 'north',
    stageLog: [L('Enquiry', -9, '12:00', 'Aisha Rahman'), L('Qualification', -8, '10:00', 'Aisha Rahman'), L('Assessment', -6, '09:00', 'Aisha Rahman'), L('Decision', -1, '16:30', 'Michael Brooks')],
    qualification: { area: true, service: true, times: true, funding: 'Private pay', notes: '' },
    assessment: { status: 'Done', date: addDays(-1), time: '14:00', assessor: 'Michael Brooks', where: 'Client’s home', needs: 'Company and conversation, a short walk, a light snack.', risks: 'May forget to lock the back door.', mobility: 'Walks without help', hours: 6, recommended: 'Companionship', notes: 'Lovely lady, enjoys gardening.', doneBy: 'Michael Brooks', doneDate: addDays(-1) },
    decision: { agreementSigned: true, startDate: addDays(5) },
    contacts: [
      C(-9, '11:30', 'Aisha Rahman', 'Phone call', 'Incoming', 'Mike Shaw (son)', 'Mike asked about companionship for his mother.', 'Spoke to them', 'Tuesdays and Thursdays suit. Will pay privately.', 'Enquiry'),
      C(-1, '14:00', 'Michael Brooks', 'Home visit', 'Outgoing', 'Linda and Mike Shaw', 'Home assessment done.', 'Spoke to them', 'Both keen to start. Agreement signed during the visit.', 'Assessment'),
    ],
    history: [H(-9, '12:00', 'Aisha Rahman', 'Referral created.'), H(-8, '10:00', 'Aisha Rahman', 'Moved to Qualification.'), H(-6, '09:00', 'Aisha Rahman', 'Moved to Assessment.'), H(-1, '16:30', 'Michael Brooks', 'Assessment saved. Moved to Decision.')],
  },
  {
    id: 'R-1020', name: 'Harold Jenkins', dob: '1940-08-19', address: '88 Cedar Ave, Springfield, IL 62701', phone: '(217) 555-0316', email: '',
    contact: 'Linda Jenkins', relationship: 'Wife', contactPhone: '(217) 555-0418',
    source: 'Doctor’s office', services: ['Medication reminders'], urgency: 'Soon', preferredTimes: 'Afternoons', reasonForCare: 'Keeps forgetting his afternoon medicines.',
    owner: 'Aisha Rahman', stage: 'Converted', branch: 'north', outcome: 'Accepted and set up as a client',
    stageLog: [L('Enquiry', -60, '10:00', 'Aisha Rahman'), L('Qualification', -58, '10:00', 'Aisha Rahman'), L('Assessment', -55, '10:00', 'Aisha Rahman'), L('Decision', -52, '15:00', 'Michael Brooks'), L('Converted', -50, '09:00', 'Aisha Rahman')],
    qualification: { area: true, service: true, times: true, funding: 'Private pay', notes: '' },
    assessment: { status: 'Done', date: addDays(-52), time: '13:00', assessor: 'Michael Brooks', where: 'Client’s home', needs: 'Reminder to take 3 afternoon medicines and drink water.', risks: 'None found.', mobility: 'Walks with a stick', hours: 7, recommended: 'Medication reminders', notes: '', doneBy: 'Michael Brooks', doneDate: addDays(-52) },
    decision: { agreementSigned: true, startDate: addDays(-48), result: 'Accepted', by: 'Aisha Rahman', date: addDays(-50) },
    contacts: [
      C(-60, '09:40', 'Aisha Rahman', 'Email', 'Incoming', 'Dr. Patel', 'Referral letter received.', 'Sent information', 'Asks for daily medication reminders.', 'Enquiry'),
      C(-58, '11:00', 'Aisha Rahman', 'Phone call', 'Outgoing', 'Linda Jenkins (wife)', 'Talked through the service and costs.', 'Spoke to them', 'Happy to go ahead, afternoons best.', 'Qualification'),
      C(-52, '13:00', 'Michael Brooks', 'Home visit', 'Outgoing', 'Harold and Linda Jenkins', 'Home assessment done.', 'Spoke to them', 'Agreement signed.', 'Assessment'),
    ],
    history: [H(-60, '10:00', 'Aisha Rahman', 'Referral created.'), H(-50, '09:00', 'Aisha Rahman', 'Accepted and converted to a client.')],
  },
  {
    id: 'R-1015', name: 'Ruth Adler', dob: '1943-02-17', address: '12 Brook St, Springfield, IL 62704', phone: '(217) 555-0459', email: '',
    contact: 'Sam Adler', relationship: 'Son', contactPhone: '(217) 555-0419',
    source: 'Family or friend', services: ['Respite care'], urgency: 'Routine', preferredTimes: 'One week in December', reasonForCare: 'Son needs cover while he is away for a week.',
    owner: 'Daniel Reed', stage: 'Closed', closedAt: 'Qualification', branch: 'south', outcome: 'Withdrawn by family: they found a family member to help instead.',
    stageLog: [L('Enquiry', -20, '10:00', 'Daniel Reed'), L('Qualification', -18, '10:00', 'Daniel Reed'), L('Closed', -12, '15:00', 'Daniel Reed', 'Withdrawn by family')],
    qualification: { area: true, service: true, times: false, funding: 'Private pay', notes: 'Needs 24-hour cover for a week. We can only offer daytime.' }, assessment: { ...A0 }, decision: { ...D0 },
    contacts: [
      C(-20, '09:50', 'Daniel Reed', 'Phone call', 'Incoming', 'Sam Adler (son)', 'Sam asked about a week of respite care.', 'Spoke to them', 'Needs cover 18–25 December.', 'Enquiry'),
      C(-12, '14:30', 'Daniel Reed', 'Phone call', 'Incoming', 'Sam Adler (son)', 'Sam called to cancel.', 'Not interested', 'His sister will stay with their mother instead. Thanked us.', 'Qualification'),
    ],
    history: [H(-20, '10:00', 'Daniel Reed', 'Referral created.'), H(-12, '15:00', 'Daniel Reed', 'Closed: withdrawn by family.')],
  },
  {
    id: 'R-1010', name: 'Gloria Vance', dob: '1946-07-15', address: '', phone: '(217) 555-0323', email: '',
    contact: 'Nurse Patel, Memorial Hospital', relationship: 'Hospital discharge nurse', contactPhone: '(217) 555-0420',
    source: 'Hospital discharge', services: ['Personal care', 'Homemaking'], urgency: 'Soon', preferredTimes: 'Weekday mornings', reasonForCare: 'Recovering from a fall. Needs help washing and with the house for a few months.',
    owner: 'Aisha Rahman', stage: 'Converted', branch: 'north', outcome: 'Accepted and set up as a client',
    stageLog: [L('Enquiry', -12, '10:00', 'Aisha Rahman'), L('Qualification', -10, '11:00', 'Aisha Rahman'), L('Assessment', -8, '09:00', 'Aisha Rahman'), L('Decision', -5, '15:00', 'Michael Brooks'), L('Converted', -3, '10:30', 'Aisha Rahman')],
    qualification: { area: true, service: true, times: true, funding: 'Medicaid waiver', notes: 'Waiver approved for 10 hours a week.' },
    assessment: { status: 'Done', date: addDays(-6), time: '10:00', assessor: 'Michael Brooks', where: 'Hospital', needs: 'Help washing and dressing; light housework while her hip heals.', risks: 'Moving home to a ground-floor flat. Address to confirm.', mobility: 'Walks with a frame', hours: 10, recommended: 'Personal care, Homemaking', notes: '', doneBy: 'Michael Brooks', doneDate: addDays(-6) },
    decision: { agreementSigned: true, startDate: addDays(4), result: 'Accepted', by: 'Aisha Rahman', date: addDays(-3) },
    contacts: [C(-12, '09:40', 'Aisha Rahman', 'Phone call', 'Incoming', 'Nurse Patel (Memorial)', 'Hospital referral for Gloria.', 'Spoke to them', 'Going home in about 2 weeks.', 'Enquiry')],
    history: [H(-12, '10:00', 'Aisha Rahman', 'Referral created.'), H(-3, '10:30', 'Aisha Rahman', 'Accepted and converted to a client.')],
  },
]


export const incidents: Incident[] = [
  { id: 'INC-208', title: 'Client slipped in bathroom', category: 'Fall', severity: 'High', client: 'Margaret Hale', caregiver: 'Grace Mensah', reportedBy: 'Grace Mensah', date: addDays(-1), owner: 'Michael Brooks', due: addDays(1), status: 'Under review', branch: 'north', sensitive: false, notes: [{ by: 'Grace Mensah', at: stampFor(-1, '10:12'), text: 'Client slipped stepping out of the shower. No visible injury. Family told.' }, { by: 'Michael Brooks', at: stampFor(-1, '14:30'), text: 'Called family. Asked for a grab rail check.' }] },
  { id: 'INC-207', title: 'Medication box was empty', category: 'Medication concern', severity: 'Medium', client: 'Harold Jenkins', caregiver: 'Maria Lopez', reportedBy: 'Maria Lopez', date: addDays(-2), owner: 'Michael Brooks', due: addDays(2), status: 'Action required', branch: 'north', sensitive: false, notes: [{ by: 'Maria Lopez', at: stampFor(-2, '15:20'), text: 'Weekly pill box empty on arrival. Called his wife.' }] },
  { id: 'INC-204', title: 'Visit missed — no caregiver', category: 'Missed visit', severity: 'Medium', client: 'Samuel Grant', reportedBy: 'Sara Kim', date: addDays(-4), owner: 'Michael Brooks', due: addDays(-1), status: 'Resolved', branch: 'north', sensitive: false, notes: [{ by: 'Sara Kim', at: stampFor(-4, '10:00'), text: 'No cover found for the morning visit. Wife helped instead.' }, { by: 'Michael Brooks', at: stampFor(-2, '11:00'), text: 'Agreed a back-up caregiver for Tuesdays.' }] },
  { id: 'INC-206', title: 'Visit missed — caregiver unwell', category: 'Missed visit', severity: 'Medium', client: 'Walter Brooks', reportedBy: 'James Carter', date: addDays(-3), owner: 'Daniel Reed', due: addDays(0), status: 'Reported', branch: 'south', sensitive: false, notes: [] },
]

export const audit: AuditEntry[] = []

export const inbox: Inbox[] = [
  { id: 'n1', title: 'A caregiver has not checked in', body: 'Today’s visit is over 15 minutes late', at: 'Just now', read: false, link: '/today', tone: 'danger' },
  { id: 'n2', title: 'New family request from Susan Hale', body: 'About Margaret Hale', at: '20 min ago', read: false, link: '/requests', tone: 'info' },
  { id: 'n3', title: 'Care plan sent back: Edith Morris', body: 'Michael Brooks asked for changes', at: '2 days ago', read: false, link: '/clients/c9?tab=plan', tone: 'warning' },
  { id: 'n4', title: 'Daniel Osei is not ready to work', body: 'One of his upcoming visits needs a new caregiver', at: 'Yesterday', read: true, link: '/cover', tone: 'danger' },
]

export const familyRequests: FamilyRequest[] = []
// Built after visits exist, so requests can point at real visits
const firstVisit = (cid: string, minDay: number) => visits.filter(v => v.clientId === cid && v.date >= addDays(minDay) && v.status === 'Scheduled').sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
{
  const m = firstVisit('c1', 2), r = firstVisit('c2', 1)
  familyRequests.push(
    { id: 'f1', from: 'Susan Hale', relationship: 'Daughter', clientId: 'c1', type: 'Change a visit time', text: `Could Mum’s visit on ${m ? new Date(m.date + 'T12:00').toLocaleDateString('en-US', { weekday: 'long' }) : 'Friday'} start at 10 instead of 9? She has an eye appointment first thing.`, preferred: '10:00 to 12:00', visitId: m?.id, date: TODAY, time: '09:10', status: 'New', thread: [] },
    { id: 'f2', from: 'Mark King', relationship: 'Son', clientId: 'c2', type: 'Question', text: 'Who is coming to see Dad next time? He likes to know in advance.', preferred: '', visitId: r?.id, date: addDays(-1), time: '18:05', status: 'New', thread: [] },
    { id: 'f3', from: 'Paul Morris', relationship: 'Son', clientId: 'c9', type: 'Add an extra visit', text: 'Could Mum have an extra visit on Saturday morning? I’m away this weekend.', preferred: 'Saturday 8:00 to 9:30', date: addDays(-1), time: '12:30', status: 'Waiting for family', thread: [{ from: 'agency', by: 'Aisha Rahman', at: stampFor(-1, '14:00'), text: 'Happy to help. Is this just for this Saturday, or every weekend from now on?' }] },
    { id: 'f4', from: 'Susan Hale', relationship: 'Daughter', clientId: 'c1', type: 'Change caregiver', text: 'Mum gets on really well with Grace. Can she keep Grace on weekdays?', preferred: 'Grace Mensah on weekdays', date: addDays(-6), time: '11:00', status: 'Approved', thread: [{ from: 'agency', by: 'Aisha Rahman', at: stampFor(-5, '09:30'), text: 'Yes — Grace is now her regular caregiver Monday to Friday.' }] },
  )
}

export const events: CalEvent[] = []
