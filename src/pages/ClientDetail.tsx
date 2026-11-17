import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, PauseCircle, PlayCircle, Phone, MapPin, CalendarDays, Lock, Search, Pencil, Plus, Users, KeyRound, Languages, Heart,
  CheckCircle2, Circle, Send, Undo2, FileText, Upload, ShieldCheck, Smartphone, UserX, History, ClipboardList, Copy, Mail,
} from 'lucide-react'
import { useStore, fmtDate, showAt, stampNow } from '../data/store'
import { CarePlan, Client, ClientDoc, DOC_CATEGORIES, Person, TODAY } from '../data/seed'
import { canSchedule } from '../data/schedule'
import { onboarding, plansFor, reviewDue, reviewOverdue } from '../data/clients'
import { AlertBanner, Avatar, Button, CardHead, Chip, ChipTone, EmptyState, Field, Input, Modal, Select, Tabs, Textarea } from '../components/ui'
import { planLabel } from './Clients'

const stTone = (s: Client['status']): ChipTone => s === 'Active' ? 'success' : s === 'On hold' ? 'warning' : 'neutral'
const long = (d?: string) => d ? fmtDate(d, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const planTone = (s: CarePlan['status']): ChipTone => s === 'Approved' ? 'success' : s === 'Changes requested' ? 'warning' : s === 'Awaiting review' ? 'info' : 'neutral'
type Tab = 'overview' | 'people' | 'plan' | 'documents' | 'visits'
const TABS: Tab[] = ['overview', 'people', 'plan', 'documents', 'visits']

export default function ClientDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (TABS.includes(params.get('tab') as Tab) ? params.get('tab') : 'overview') as Tab
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })
  const [act, setAct] = useState<null | 'hold' | 'edit'>(null)
  const c = s.clients.find(x => x.id === id)
  if (!c || !s.inBranch(c.branch)) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t find this client" text="They may be in another branch. Go back to the client list." action={<Button onClick={() => nav('/clients')}>All clients</Button>} /></div>

  const p = plansFor(c.id, s.carePlans)
  const steps = onboarding(c, s.carePlans, s.documents, s.visits)
  const sched = canSchedule(c, s.carePlans)
  const pl = planLabel(p.current, p.working)

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/clients" className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />All clients</Link>
          <div className="row wrap" style={{ gap: 10 }}>
            <Avatar name={c.name} size="lg" />
            <div>
              <div className="row wrap" style={{ gap: 10 }}><h1 className="t-h1">{c.name}</h1><Chip tone={stTone(c.status)}>{c.status}</Chip></div>
              <div className="t-small t-muted" style={{ marginTop: 2 }}>{s.branchName(c.branch)} · Coordinator: <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.coordinator === s.me.name ? 'You' : c.coordinator}</b> · Client since {c.since}</div>
            </div>
          </div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to="/clients">Clients</Link><span>/</span><span>{c.name}</span></div>
        </div>
        {c.status !== 'Discharged' && <div className="actions">
          <Button variant={c.status === 'On hold' ? 'primary' : 'danger'} icon={c.status === 'On hold' ? PlayCircle : PauseCircle} onClick={() => setAct('hold')}>{c.status === 'On hold' ? 'Restart care' : 'Put on hold'}</Button>
          <Button icon={Plus} disabled={!sched.ok} title={sched.ok ? '' : sched.why} onClick={() => nav(`/schedule?new=1&client=${c.id}`)}>Plan visits</Button>
        </div>}
      </div>

      {c.status === 'On hold' && <AlertBanner tone="warning" title="Care is on hold">{c.statusReason ?? ''} Upcoming visits are marked for review in Cover needed — nothing was deleted.</AlertBanner>}
      {c.status === 'Active' && !sched.ok && <AlertBanner tone="info" title="Visits can’t be planned yet">{sched.why}</AlertBanner>}

      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'people', label: 'Contacts', count: c.people.length },
          { id: 'plan', label: `Care plan · ${pl.text}` },
          { id: 'documents', label: 'Documents', count: s.documents.filter(d => d.clientId === c.id && d.status !== 'Replaced').length },
          { id: 'visits', label: 'Visits', count: s.visits.filter(v => v.clientId === c.id && v.date >= TODAY && v.status !== 'Cancelled').length },
        ]} /></div>
      </div>

      {tab === 'overview' && <Overview c={c} steps={steps} go={setTab} onEdit={() => setAct('edit')} />}
      {tab === 'people' && <People c={c} />}
      {tab === 'plan' && <PlanTab c={c} />}
      {tab === 'documents' && <Documents c={c} />}
      {tab === 'visits' && <VisitsTab c={c} canPlan={sched} />}

      {act === 'hold' && <HoldModal c={c} onClose={() => setAct(null)} />}
      {act === 'edit' && <EditDetails c={c} onClose={() => setAct(null)} />}
    </>
  )
}

/* ---------------- Overview ---------------- */

function Overview({ c, steps, go, onEdit }: { c: Client; steps: ReturnType<typeof onboarding>; go: (t: Tab) => void; onEdit: () => void }) {
  const s = useStore()
  const nav = useNavigate()
  const done = steps.filter(x => x.done).length
  const upcoming = s.visits.filter(v => v.clientId === c.id && v.date >= TODAY && !['Cancelled', 'Completed'].includes(v.status)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 5)
  return (
    <div className="grid g-main-side" style={{ alignItems: 'start' }}>
      <div className="col" style={{ gap: 16 }}>
        {done < steps.length && c.status !== 'Discharged' && (
          <div className="card">
            <CardHead title="Finish setting up" sub={`${done} of ${steps.length} done. The client can have visits once the care plan is approved.`} />
            <div className="card-body col" style={{ gap: 10 }}>
              {steps.map(st => (
                <div key={st.label} className="row" style={{ gap: 10 }}>
                  {st.done ? <CheckCircle2 size={18} color="var(--status-success)" /> : <Circle size={18} color="var(--border-strong)" />}
                  <span className={`grow t-small ${st.done ? '' : 't-strong'}`}>{st.label}</span>
                  {!st.done && <button className="link-btn" onClick={() => st.tab === 'overview' ? onEdit() : go(st.tab)}>{st.tab === 'overview' ? 'Add' : 'Open'}</button>}
                </div>))}
            </div>
          </div>)}
        <div className="card">
          <CardHead title="Details" action={c.status !== 'Discharged' && <Button size="sm" variant="secondary" icon={Pencil} onClick={onEdit}>Edit details</Button>} />
          <div className="card-body">
            <dl className="kv">
              <dt>Date of birth</dt><dd>{c.dob ? long(c.dob) : '—'}</dd>
              <dt>Phone</dt><dd className="row" style={{ gap: 6 }}><Phone size={13} />{c.phone || '—'}</dd>
              <dt>Home address</dt><dd className="row" style={{ gap: 6 }}><MapPin size={13} />{c.address || <span style={{ color: 'var(--status-danger)' }}>Not added yet</span>}</dd>
              <dt>Getting in</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><KeyRound size={13} style={{ marginTop: 3 }} />{c.access || <span style={{ color: 'var(--status-danger)' }}>Not added yet</span>}</dd>
              <dt>Language</dt><dd className="row" style={{ gap: 6 }}><Languages size={13} />{c.language || '—'}</dd>
              <dt>Likes and needs</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><Heart size={13} style={{ marginTop: 3 }} />{c.preferences || '—'}</dd>
              <dt>Services</dt><dd>{c.services}</dd>
              <dt>Paid by</dt><dd>{c.payer} <span className="t-caption t-muted">· rates and invoices are handled by Finance</span></dd>
              {c.fromReferral && <><dt>Came from</dt><dd><Link to={`/referrals/${c.fromReferral}`}>Referral {c.fromReferral}</Link></dd></>}
            </dl>
          </div>
        </div>
        <div className="card">
          <CardHead title="Upcoming visits" action={<button className="link-btn" onClick={() => go('visits')}>See all visits</button>} />
          <div className="card-body">
            {upcoming.length === 0 ? <div className="t-small t-muted">No visits planned.</div> : upcoming.map(v => (
              <button key={v.id} className="list-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/visits/${v.id}?from=/clients/${c.id}`)}>
                <CalendarDays size={16} color="var(--text-muted)" />
                <div className="grow"><div className="t-medium t-small">{v.date === TODAY ? 'Today' : fmtDate(v.date)} · {v.start}–{v.end}</div><div className="t-caption t-muted">{v.service}{v.review ? ' · needs review' : ''}</div></div>
                {v.caregiverId ? <span className="t-small">{s.caregiver(v.caregiverId)?.name}</span> : <Chip tone="danger">No caregiver</Chip>}
              </button>))}
          </div>
        </div>
      </div>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <CardHead title="Emergency contacts" action={<button className="link-btn" onClick={() => go('people')}>Manage</button>} />
          <div className="card-body col" style={{ gap: 10 }}>
            {c.people.filter(x => x.emergency).length === 0 ? <div className="t-small" style={{ color: 'var(--status-danger)' }}>No emergency contact yet.</div> : c.people.filter(x => x.emergency).map(x => (
              <div key={x.id} className="row"><Avatar name={x.name} size="sm" /><div className="grow"><div className="t-medium t-small">{x.name}</div><div className="t-caption t-muted">{x.relationship} · {x.phone}</div></div></div>))}
          </div>
        </div>
        <div className="card">
          <CardHead title="History" sub="Every change to this client. Nothing is removed." />
          <div className="card-body timeline">
            {c.history.length === 0 ? <div className="t-small t-muted">No changes yet.</div> : [...c.history].reverse().map((h, i) => (
              <div key={i} className="timeline-item"><div className="stat-icon tone-neutral"><History /></div><div><div className="t-small">{h.text}</div><div className="t-caption t-muted">{h.by} · {h.at}</div></div></div>))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EditDetails({ c, onClose }: { c: Client; onClose: () => void }) {
  const s = useStore()
  const [f, setF] = useState({ dob: c.dob, phone: c.phone, address: c.address, access: c.access, language: c.language, preferences: c.preferences })
  const dirty = JSON.stringify(f) !== JSON.stringify({ dob: c.dob, phone: c.phone, address: c.address, access: c.access, language: c.language, preferences: c.preferences })
  const save = () => {
    const changed = (Object.keys(f) as (keyof typeof f)[]).filter(k => f[k] !== c[k])
    s.setClients(x => x.map(y => y.id === c.id ? { ...y, ...f } : y))
    s.clientNote(c.id, `Details updated: ${changed.map(k => ({ dob: 'date of birth', phone: 'phone', address: 'address', access: 'getting in', language: 'language', preferences: 'likes and needs' }[k])).join(', ')}.`)
    s.toast('Client details saved'); onClose()
  }
  return (
    <Modal wide title={`Edit ${c.name}’s details`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!dirty} onClick={save}>Save details</Button></>}>
      <div className="grid g-2">
        <Field label="Date of birth"><Input type="date" max={TODAY} value={f.dob} onChange={e => setF({ ...f, dob: e.target.value })} /></Field>
        <Field label="Phone"><Input icon={Phone} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
      </div>
      <Field label="Home address" required><Input icon={MapPin} value={f.address} onChange={e => setF({ ...f, address: e.target.value })} placeholder="Street, town, ZIP code" /></Field>
      <Field label="How do caregivers get in?" helper="Key safe, door code, who lets them in, pets. Only people working with this client see this."><Textarea value={f.access} onChange={e => setF({ ...f, access: e.target.value })} /></Field>
      <div className="grid g-2">
        <Field label="Language"><Input icon={Languages} value={f.language} onChange={e => setF({ ...f, language: e.target.value })} /></Field>
        <div />
      </div>
      <Field label="Likes, dislikes and needs"><Textarea value={f.preferences} onChange={e => setF({ ...f, preferences: e.target.value })} placeholder="e.g. Prefers female caregivers. Hard of hearing." /></Field>
    </Modal>
  )
}

function HoldModal({ c, onClose }: { c: Client; onClose: () => void }) {
  const s = useStore()
  const restart = c.status === 'On hold'
  const [t, setT] = useState(''); const [tried, setTried] = useState(false)
  const bad = t.trim().length < 5
  const future = s.visits.filter(v => v.clientId === c.id && v.date >= TODAY && ['Scheduled', 'Unassigned'].includes(v.status))
  const save = () => {
    setTried(true); if (bad) return
    s.setClients(x => x.map(y => y.id === c.id ? { ...y, status: restart ? 'Active' : 'On hold', statusReason: restart ? undefined : t.trim() } : y))
    s.setVisits(x => x.map(v => future.some(f => f.id === v.id) ? { ...v, review: restart ? undefined : `${c.name} is on hold: ${t.trim()}` } : v))
    s.clientNote(c.id, restart ? `Care restarted. ${t.trim()}` : `Put on hold. Reason: ${t.trim()}`)
    s.log({ type: 'Client', action: restart ? 'Restarted care' : 'Put a client on hold', record: c.name, reason: t.trim() })
    s.toast(restart ? `${c.name}’s care restarted` : `${c.name} is on hold. ${future.length} visit${future.length === 1 ? '' : 's'} to review in Cover needed.`); onClose()
  }
  return <Modal title={restart ? `Restart care for ${c.name}?` : `Put ${c.name} on hold?`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={restart ? 'primary' : 'danger-solid'} onClick={save}>{restart ? 'Restart care' : 'Put on hold'}</Button></>}>
    {!restart && future.length > 0 && <AlertBanner tone="warning" title={`${future.length} upcoming visit${future.length > 1 ? 's' : ''} will be marked for review`}>They are not deleted. Check each one in Cover needed and cancel or keep it.</AlertBanner>}
    {restart && future.length > 0 && <AlertBanner tone="info" title="Upcoming visits go back to normal">The review mark is removed from {future.length} visit{future.length > 1 ? 's' : ''}.</AlertBanner>}
    <Field label={restart ? 'What has changed?' : 'Reason'} required error={tried && bad ? 'Please write a short reason.' : undefined} helper="Saved in the client’s history."><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} placeholder={restart ? 'For example: home from hospital' : 'For example: in hospital from 12 Nov'} error={tried && bad} /></Field>
  </Modal>
}

/* ---------------- Contacts and family app access ---------------- */

function People({ c }: { c: Client }) {
  const s = useStore()
  const [edit, setEdit] = useState<Person | 'new' | null>(null)
  const [revoke, setRevoke] = useState<Person | null>(null)
  const setPerson = (pid: string, patch: Partial<Person>, note: string) => {
    s.setClients(x => x.map(y => y.id === c.id ? { ...y, people: y.people.map(p => p.id === pid ? { ...p, ...patch } : p) } : y))
    s.clientNote(c.id, note)
  }
  const accTone = (a: Person['appAccess']): ChipTone => a === 'Active' ? 'success' : a === 'Invited' ? 'info' : a === 'Removed' ? 'danger' : 'neutral'
  return (
    <div className="card">
      <CardHead title="Contacts" sub="Emergency contacts and the people who can speak for the client. Only representatives can use the family app." action={c.status !== 'Discharged' && <Button size="sm" icon={Plus} onClick={() => setEdit('new')}>Add a person</Button>} />
      {c.people.length === 0 ? <EmptyState icon={Users} tone="warning" title="No contacts yet" text="Add at least one emergency contact before care starts." action={<Button icon={Plus} onClick={() => setEdit('new')}>Add a person</Button>} /> :
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Name</th><th>Relationship</th><th>Phone / email</th><th>Role</th><th>Family app</th><th style={{ width: 230 }} /></tr></thead>
          <tbody>{c.people.map(p => (
            <tr key={p.id} className={p.appAccess === 'Removed' ? 'muted' : ''}>
              <td><span className="row"><Avatar name={p.name} size="sm" />{p.name}</span></td><td>{p.relationship}</td>
              <td>{p.phone}{p.email && <div className="t-caption t-muted">{p.email}</div>}</td>
              <td><span className="row wrap" style={{ gap: 6 }}>{p.emergency && <Chip tone="danger">Emergency</Chip>}{p.representative && <Chip tone="info">Representative</Chip>}{!p.emergency && !p.representative && <span className="t-muted">—</span>}</span></td>
              <td><Chip tone={accTone(p.appAccess)}>{p.appAccess}</Chip></td>
              <td><div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEdit(p)}>Edit</Button>
                {p.representative && (p.appAccess === 'No access' || p.appAccess === 'Removed') && <Button size="sm" icon={Smartphone} disabled={!p.email} title={p.email ? '' : 'Add an email first'} onClick={() => { setPerson(p.id, { appAccess: 'Invited' }, `${p.name} invited to the family app.`); s.toast(`Invite sent to ${p.email}`) }}>Invite to app</Button>}
                {p.appAccess === 'Invited' && <Button size="sm" variant="secondary" icon={Mail} onClick={() => s.toast(`Invite sent again to ${p.email}`)}>Resend</Button>}
                {(p.appAccess === 'Active' || p.appAccess === 'Invited') && <Button size="sm" variant="danger" icon={UserX} onClick={() => setRevoke(p)}>Remove access</Button>}
              </div></td>
            </tr>))}</tbody>
        </table></div>}
      <div className="card-body row t-caption t-muted" style={{ gap: 6 }}><ShieldCheck size={13} />The family app only shows this client’s visits and approved updates — never internal notes, other clients or pay.</div>
      {edit && <PersonModal c={c} person={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {revoke && <ReasonModal title={`Remove ${revoke.name}’s app access?`} sub="They will no longer see anything about this client. You can invite them again later." label="Reason" confirm="Remove access" danger onClose={() => setRevoke(null)} onSave={reason => {
        setPerson(revoke.id, { appAccess: 'Removed' }, `${revoke.name}’s family app access removed. Reason: ${reason}`)
        s.log({ type: 'Client', action: 'Removed family app access', record: `${c.name} — ${revoke.name}`, reason }); s.toast('Access removed'); setRevoke(null)
      }} />}
    </div>
  )
}

function PersonModal({ c, person, onClose }: { c: Client; person: Person | null; onClose: () => void }) {
  const s = useStore()
  const [f, setF] = useState<Person>(person ?? { id: 'p' + Date.now(), name: '', relationship: '', phone: '', email: '', emergency: true, representative: false, appAccess: 'No access' })
  const [tried, setTried] = useState(false)
  const errs = { name: !f.name.trim(), phone: !f.phone.trim(), email: !!f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()) }
  const save = () => {
    setTried(true); if (errs.name || errs.phone || errs.email) return
    const clean = { ...f, name: f.name.trim(), email: f.email.trim() }
    s.setClients(x => x.map(y => y.id === c.id ? { ...y, people: person ? y.people.map(p => p.id === f.id ? clean : p) : [...y.people, clean] } : y))
    s.clientNote(c.id, person ? `${clean.name}’s contact details updated.` : `${clean.name} (${clean.relationship || 'contact'}) added.`)
    s.toast(person ? 'Contact saved' : `${clean.name} added`); onClose()
  }
  return (
    <Modal title={person ? `Edit ${person.name}` : 'Add a person'} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>{person ? 'Save' : 'Add person'}</Button></>}>
      <div className="grid g-2">
        <Field label="Full name" required error={tried && errs.name ? 'Please enter a name.' : undefined}><Input autoFocus value={f.name} onChange={e => setF({ ...f, name: e.target.value })} error={tried && errs.name} /></Field>
        <Field label="Relationship"><Input value={f.relationship} onChange={e => setF({ ...f, relationship: e.target.value })} placeholder="e.g. Daughter, neighbour" /></Field>
        <Field label="Phone" required error={tried && errs.phone ? 'Please enter a phone number.' : undefined}><Input icon={Phone} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} error={tried && errs.phone} /></Field>
        <Field label="Email" helper="Needed to invite them to the family app." error={tried && errs.email ? 'Please enter a valid email.' : undefined}><Input icon={Mail} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} error={tried && errs.email} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={f.emergency} onChange={e => setF({ ...f, emergency: e.target.checked })} />Emergency contact — call them if something happens</label>
      <label className="check"><input type="checkbox" checked={f.representative} onChange={e => setF({ ...f, representative: e.target.checked })} />Representative — can speak for the client and use the family app</label>
      {f.representative && <div className="hint">Only add someone as a representative if the client (or their legal paperwork) agrees.</div>}
    </Modal>
  )
}

/* ---------------- Care plan ---------------- */

function PlanTab({ c }: { c: Client }) {
  const s = useStore()
  const { current, working, all } = plansFor(c.id, s.carePlans)
  const [view, setView] = useState<CarePlan | null>(null)
  const supervisor = s.users.find(u => u.role === 'Care Supervisor')?.name ?? 'the Care Supervisor'
  const startNew = () => {
    const base = current!
    s.setCarePlans(x => [...x, { ...base, id: 'cp' + Date.now(), version: Math.max(...all.map(p => p.version)) + 1, status: 'Draft', createdBy: s.me.name, createdDate: TODAY, submittedDate: undefined, approvedBy: undefined, approvedDate: undefined, effectiveDate: undefined, comments: [] }])
    s.clientNote(c.id, `Started care plan version ${Math.max(...all.map(p => p.version)) + 1} (draft).`)
    s.toast('New draft started. The approved plan stays in use until the new one is approved.')
  }
  return (
    <div className="grid g-main-side" style={{ alignItems: 'start' }}>
      <div className="col" style={{ gap: 16 }}>
        {working ? <PlanEditor c={c} plan={working} hasCurrent={!!current} supervisor={supervisor} />
          : current ? <div className="card"><CardHead title={`Care plan · version ${current.version}`} sub={`Approved by ${current.approvedBy} on ${long(current.approvedDate)}. In use since ${long(current.effectiveDate)}.`} action={c.status !== 'Discharged' && <Button size="sm" icon={Copy} onClick={startNew}>Start a new version</Button>} />
            <div className="card-body col" style={{ gap: 12 }}>
              {reviewOverdue(current) ? <AlertBanner tone="danger" title={`Review was due ${long(current.reviewDate)}`}>Start a new version, check it with the client, and send it to {supervisor}.</AlertBanner>
                : reviewDue(current) ? <AlertBanner tone="warning" title={`Review due ${long(current.reviewDate)}`}>Start a new version when you’re ready to review it.</AlertBanner> : null}
              <PlanView p={current} />
            </div></div>
            : <div className="card"><EmptyState icon={ClipboardList} tone="warning" title="No care plan yet" text="Start one from the assessment. The Care Supervisor approves it before visits can be planned." action={<Button icon={Plus} onClick={() => {
              s.setCarePlans(x => [...x, { id: 'cp' + Date.now(), clientId: c.id, version: 1, status: 'Draft', services: c.services.split(',').map(t => t.trim()).filter(Boolean), tasks: [], instructions: '', goals: '', hoursPerWeek: null, reviewDate: '', createdBy: s.me.name, createdDate: TODAY, comments: [] }])
              s.clientNote(c.id, 'Started a care plan (draft).')
            }}>Start a care plan</Button>} /></div>}
        {working && current && <div className="card"><CardHead title={`In use now · version ${current.version}`} sub={`Caregivers keep following this until version ${working.version} is approved.`} action={<Button size="sm" variant="secondary" onClick={() => setView(current)}>View</Button>} /></div>}
      </div>
      <div className="col" style={{ gap: 16 }}>
        <div className="card">
          <CardHead title="How care plans work" />
          <div className="card-body col t-small" style={{ gap: 8 }}>
            {['You write the plan (draft).', `You send it to ${supervisor}.`, 'They approve it, or send it back with comments.', 'Once approved, caregivers see it on every visit.', 'Older versions are kept, so past visits always show the plan that applied.'].map((t, i) => (
              <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start' }}><span className="avatar sm" style={{ background: 'var(--bg-selected)' }}>{i + 1}</span><span>{t}</span></div>))}
          </div>
        </div>
        <div className="card">
          <CardHead title="All versions" sub="Nothing is ever deleted." />
          <div className="card-body col" style={{ gap: 8 }}>
            {all.length === 0 ? <div className="t-small t-muted">No versions yet.</div> : all.map(p => (
              <button key={p.id} className="list-row" style={{ marginTop: 0, width: '100%', textAlign: 'left' }} onClick={() => setView(p)}>
                <FileText size={16} color="var(--text-muted)" /><span className="grow"><span className="t-medium t-small" style={{ display: 'block' }}>Version {p.version}</span><span className="t-caption t-muted">{p.approvedDate ? `Approved ${long(p.approvedDate)}` : `Started ${long(p.createdDate)}`}</span></span><Chip tone={planTone(p.status)}>{p.status}</Chip>
              </button>))}
          </div>
        </div>
      </div>
      {view && <Modal wide title={`Care plan · version ${view.version}`} sub={`${view.status}${view.approvedBy ? ` · approved by ${view.approvedBy} on ${long(view.approvedDate)}` : ''}`} onClose={() => setView(null)} footer={<Button onClick={() => setView(null)}>Close</Button>}><PlanView p={view} /></Modal>}
    </div>
  )
}

function PlanView({ p }: { p: CarePlan }) {
  return (
    <div className="col" style={{ gap: 12 }}>
      <dl className="kv">
        <dt>Services</dt><dd>{p.services.join(', ') || '—'}</dd>
        <dt>Hours a week</dt><dd>{p.hoursPerWeek ?? '—'}</dd>
        <dt>Tasks each visit</dt><dd>{p.tasks.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{p.tasks.map(t => <li key={t}>{t}</li>)}</ul> : '—'}</dd>
        <dt>Instructions</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{p.instructions || '—'}</dd>
        <dt>Goals</dt><dd>{p.goals || '—'}</dd>
        <dt>Review by</dt><dd>{long(p.reviewDate)}</dd>
      </dl>
      {p.comments.length > 0 && <div><div className="t-h3" style={{ marginBottom: 8 }}>Comments</div>{p.comments.map((cm, i) => <div key={i} className="t-small" style={{ marginBottom: 6 }}><b>{cm.by}</b> · <span className="t-muted">{showAt(cm.at)}</span><div>{cm.text}</div></div>)}</div>}
    </div>
  )
}

function PlanEditor({ c, plan, hasCurrent, supervisor }: { c: Client; plan: CarePlan; hasCurrent: boolean; supervisor: string }) {
  const s = useStore()
  const pick = (p: CarePlan) => ({ services: p.services, tasks: p.tasks, instructions: p.instructions, goals: p.goals, hoursPerWeek: p.hoursPerWeek, reviewDate: p.reviewDate })
  const [f, setF] = useState(pick(plan))
  const [tried, setTried] = useState(false)
  useEffect(() => setF(pick(plan)), [plan.id, plan.status])
  const editable = plan.status === 'Draft' || plan.status === 'Changes requested'
  const dirty = JSON.stringify(f) !== JSON.stringify(pick(plan))
  const allServices = s.lists.services.filter(x => x.active || f.services.includes(x.name)).map(x => x.name)
  const allTasks = Array.from(new Set([...s.lists.tasks.filter(x => x.active).map(x => x.name), ...f.tasks]))
  const missing = [!f.services.length && 'at least one service', !f.tasks.length && 'at least one task', !f.hoursPerWeek && 'hours a week', !f.reviewDate && 'a review date', !f.instructions.trim() && 'instructions for caregivers'].filter(Boolean) as string[]
  const setPlan = (patch: Partial<CarePlan>) => s.setCarePlans(x => x.map(p => p.id === plan.id ? { ...p, ...patch } : p))
  const save = () => { setPlan(f); s.toast('Draft saved') }
  const send = () => {
    setTried(true); if (missing.length) return
    setPlan({ ...f, status: 'Awaiting review', submittedDate: TODAY, comments: plan.status === 'Changes requested' ? [...plan.comments, { by: s.me.name, at: stampNow(), text: 'Changes made and sent back for review.' }] : plan.comments })
    s.clientNote(c.id, `Care plan version ${plan.version} sent to ${supervisor} for approval.`)
    s.log({ type: 'Care plan', action: 'Sent a care plan for approval', record: `${c.name} v${plan.version}` })
    s.toast(`Sent to ${supervisor}. You’ll get an alert when it’s approved.`)
  }
  const chipList = (all: string[], sel: string[], key: 'services' | 'tasks') => (
    <div className="row wrap" style={{ gap: 8 }}>{all.map(x => { const on = sel.includes(x); return (
      <button key={x} type="button" aria-pressed={on} disabled={!editable} className="chip nodot" onClick={() => setF({ ...f, [key]: on ? sel.filter(y => y !== x) : [...sel, x] })}
        style={{ height: 32, padding: '0 12px', cursor: editable ? 'pointer' : 'default', border: `1px solid ${on ? 'var(--border-focus)' : 'var(--border-strong)'}`, background: on ? 'var(--bg-selected)' : '#fff', color: on ? 'var(--text-link)' : 'var(--text-secondary)', fontSize: 13 }}>{on && <CheckCircle2 size={13} />}{x}</button>) })}</div>)

  return (
    <div className="card">
      <CardHead title={`Care plan · version ${plan.version}`} sub={plan.status === 'Awaiting review' ? `Sent to ${supervisor} on ${long(plan.submittedDate)}.` : `Started by ${plan.createdBy} on ${long(plan.createdDate)}.`} action={<Chip tone={planTone(plan.status)}>{plan.status}</Chip>} />
      <div className="card-body col" style={{ gap: 14 }}>
        {plan.status === 'Changes requested' && <AlertBanner tone="warning" title={`${plan.comments.filter(x => x.by !== s.me.name).slice(-1)[0]?.by ?? supervisor} asked for changes`}>{plan.comments.filter(x => x.by !== s.me.name).slice(-1)[0]?.text}</AlertBanner>}
        {plan.status === 'Awaiting review' && <AlertBanner tone="info" title={`Waiting for ${supervisor}`}>{hasCurrent ? 'The approved plan stays in use until this one is approved.' : 'Visits can be planned once it’s approved.'}</AlertBanner>}
        <div className="field"><span className="label">Services <span className="req">*</span></span>{chipList(allServices, f.services, 'services')}</div>
        <div className="field"><span className="label">Tasks for each visit <span className="req">*</span></span>{chipList(allTasks, f.tasks, 'tasks')}<span className="helper">Caregivers tick these off on the app.</span></div>
        <Field label="Instructions for caregivers" required><Textarea disabled={!editable} value={f.instructions} onChange={e => setF({ ...f, instructions: e.target.value })} placeholder="What should every caregiver know? e.g. where medicines are kept, how to help with the shower" /></Field>
        <Field label="Goals"><Textarea disabled={!editable} value={f.goals} onChange={e => setF({ ...f, goals: e.target.value })} placeholder="What does the client want from their care?" /></Field>
        <div className="grid g-2">
          <Field label="Hours a week" required><Input disabled={!editable} type="number" min={1} max={168} value={f.hoursPerWeek ?? ''} onChange={e => setF({ ...f, hoursPerWeek: e.target.value ? Number(e.target.value) : null })} /></Field>
          <Field label="Review by" required helper="Usually every 6 months."><Input disabled={!editable} type="date" min={TODAY} value={f.reviewDate} onChange={e => setF({ ...f, reviewDate: e.target.value })} /></Field>
        </div>
        {tried && missing.length > 0 && <AlertBanner tone="danger" title="Not ready to send">Please add {missing.join(', ')}.</AlertBanner>}
        {editable ? <div className="row" style={{ justifyContent: 'flex-end' }}>
          {dirty && <span className="t-caption" style={{ color: 'var(--status-warning)', marginRight: 'auto' }}>Changes not saved yet.</span>}
          <Button variant="secondary" disabled={!dirty} onClick={save}>Save draft</Button>
          <Button icon={Send} onClick={send}>{plan.status === 'Changes requested' ? 'Send back for approval' : 'Send for approval'}</Button>
        </div> : <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button variant="secondary" icon={Undo2} onClick={() => { setPlan({ status: 'Draft', comments: [...plan.comments, { by: s.me.name, at: stampNow(), text: 'Taken back to edit before review.' }] }); s.clientNote(c.id, `Care plan version ${plan.version} taken back to edit.`); s.toast('Taken back. Send it again when ready.') }}>Take back to edit</Button>
        </div>}
        {plan.comments.length > 0 && <div><div className="t-h3" style={{ marginBottom: 8 }}>Comments</div>{plan.comments.map((cm, i) => <div key={i} className="t-small" style={{ marginBottom: 8 }}><b>{cm.by}</b> · <span className="t-muted">{showAt(cm.at)}</span><div>{cm.text}</div></div>)}</div>}
      </div>
    </div>
  )
}

/* ---------------- Documents ---------------- */

function Documents({ c }: { c: Client }) {
  const s = useStore()
  const [up, setUp] = useState<ClientDoc | 'new' | null>(null)
  const docs = s.documents.filter(d => d.clientId === c.id).sort((a, b) => Number(a.status === 'Replaced') - Number(b.status === 'Replaced') || b.date.localeCompare(a.date))
  const stTone = (d: ClientDoc): ChipTone => d.status === 'Checked' ? 'success' : d.status === 'Replaced' ? 'neutral' : 'warning'
  return (
    <div className="card">
      <CardHead title="Documents" sub="Uploading a document doesn’t mean it has been checked. The Care Supervisor checks them." action={c.status !== 'Discharged' && <Button size="sm" icon={Upload} onClick={() => setUp('new')}>Upload</Button>} />
      {docs.length === 0 ? <EmptyState icon={FileText} tone="warning" title="No documents yet" text="Upload the signed service agreement before care starts." action={<Button icon={Upload} onClick={() => setUp('new')}>Upload a document</Button>} /> :
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Document</th><th>Type</th><th>Uploaded</th><th>Expires</th><th>Status</th><th style={{ width: 110 }} /></tr></thead>
          <tbody>{docs.map(d => { const expired = d.expiry && d.expiry < TODAY; return (
            <tr key={d.id} className={d.status === 'Replaced' ? 'muted' : ''}>
              <td><span className="row" style={{ gap: 8 }}><FileText size={16} color="var(--text-muted)" />{d.name}</span></td><td>{d.category}</td>
              <td>{long(d.date)}<div className="t-caption t-muted">{d.uploadedBy}</div></td>
              <td style={{ color: expired ? 'var(--status-danger)' : undefined }}>{d.expiry ? long(d.expiry) : '—'}{expired && <div className="t-caption">Expired</div>}</td>
              <td><Chip tone={stTone(d)}>{d.status}</Chip></td>
              <td>{d.status !== 'Replaced' && <Button size="sm" variant="secondary" onClick={() => setUp(d)}>Replace</Button>}</td>
            </tr>) })}</tbody>
        </table></div>}
      <div className="card-body row t-caption t-muted" style={{ gap: 6 }}><Lock size={13} />Replaced documents are kept so the history stays complete.</div>
      {up && <UploadModal c={c} replacing={up === 'new' ? null : up} onClose={() => setUp(null)} />}
    </div>
  )
}

function UploadModal({ c, replacing, onClose }: { c: Client; replacing: ClientDoc | null; onClose: () => void }) {
  const s = useStore()
  const [file, setFile] = useState<{ name: string; size: number } | null>(null)
  const [cat, setCat] = useState(replacing?.category ?? DOC_CATEGORIES[0])
  const [expiry, setExpiry] = useState('')
  const [tried, setTried] = useState(false)
  const tooBig = !!file && file.size > 10 * 1024 * 1024
  const badType = !!file && !/\.(pdf|jpg|jpeg|png|docx?)$/i.test(file.name)
  const save = () => {
    setTried(true); if (!file || tooBig || badType) return
    const doc: ClientDoc = { id: 'd' + Date.now(), clientId: c.id, name: file.name, category: cat, uploadedBy: s.me.name, date: TODAY, expiry: expiry || undefined, status: 'Not checked' }
    s.setDocuments(x => [...x.map(d => replacing && d.id === replacing.id ? { ...d, status: 'Replaced' as const } : d), doc])
    s.clientNote(c.id, replacing ? `${replacing.name} replaced by ${file.name}.` : `${file.name} uploaded (${cat.toLowerCase()}).`)
    s.toast(`${file.name} uploaded. It will be checked by the Care Supervisor.`); onClose()
  }
  return (
    <Modal title={replacing ? `Replace ${replacing.name}` : 'Upload a document'} sub="PDF, JPG, PNG or Word. Up to 10 MB." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={Upload} onClick={save}>Upload</Button></>}>
      <label className="dropzone" style={{ borderColor: tried && (!file || tooBig || badType) ? 'var(--status-danger)' : undefined }}>
        <Upload size={20} color="var(--action-primary)" />
        <span className="grow"><span className="t-medium" style={{ display: 'block' }}>{file ? file.name : 'Choose a file'}</span><span className="t-caption t-muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : 'Click to pick a file from your computer'}</span></span>
        <input type="file" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; if (f) setFile({ name: f.name, size: f.size }) }} />
      </label>
      {tried && !file && <span className="helper error">Please choose a file.</span>}
      {tooBig && <span className="helper error">This file is over 10 MB.</span>}
      {badType && <span className="helper error">Please use a PDF, JPG, PNG or Word file.</span>}
      <div className="grid g-2">
        <Field label="Type"><Select value={cat} onChange={e => setCat(e.target.value)} options={DOC_CATEGORIES} /></Field>
        <Field label="Expires" helper="Leave empty if it doesn’t expire."><Input type="date" min={TODAY} value={expiry} onChange={e => setExpiry(e.target.value)} /></Field>
      </div>
    </Modal>
  )
}

/* ---------------- Visits ---------------- */

function VisitsTab({ c, canPlan }: { c: Client; canPlan: { ok: boolean; why: string } }) {
  const s = useStore()
  const nav = useNavigate()
  const [show, setShow] = useState<'upcoming' | 'past'>('upcoming')
  const list = useMemo(() => s.visits.filter(v => v.clientId === c.id).filter(v => show === 'upcoming' ? v.date >= TODAY && v.status !== 'Completed' : v.date < TODAY || v.status === 'Completed')
    .sort((a, b) => show === 'upcoming' ? (a.date + a.start).localeCompare(b.date + b.start) : (b.date + b.start).localeCompare(a.date + a.start)), [s.visits, c.id, show])
  const tone = (st: string): ChipTone => st === 'Completed' ? 'success' : st === 'Unassigned' ? 'danger' : st === 'Cancelled' ? 'neutral' : 'info'
  return (
    <div className="card">
      <CardHead title="Visits" sub="Click a visit to open it in Schedule." action={<div className="row">
        <div className="seg" role="group"><button className={show === 'upcoming' ? 'on' : ''} onClick={() => setShow('upcoming')}>Upcoming</button><button className={show === 'past' ? 'on' : ''} onClick={() => setShow('past')}>Past</button></div>
        <Button size="sm" icon={Plus} disabled={!canPlan.ok} title={canPlan.why} onClick={() => nav(`/schedule?new=1&client=${c.id}`)}>Plan visits</Button>
      </div>} />
      {!canPlan.ok && c.status === 'Active' && <div className="card-body" style={{ paddingBottom: 0 }}><AlertBanner tone="info" title="Visits can’t be planned yet">{canPlan.why}</AlertBanner></div>}
      {list.length === 0 ? <EmptyState icon={CalendarDays} tone="neutral" title={show === 'upcoming' ? 'No visits planned' : 'No past visits yet'} text={show === 'upcoming' ? 'Use “Plan visits” to add one-off or repeating visits.' : 'Finished visits appear here.'} /> :
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th>Date</th><th>Time</th><th>Service</th><th>Caregiver</th><th>Status</th></tr></thead>
          <tbody>{list.map(v => (
            <tr key={v.id} className="clickable" onClick={() => nav(`/visits/${v.id}?from=/clients/${c.id}`)}>
              <td>{v.date === TODAY ? 'Today' : fmtDate(v.date)}</td><td>{v.start}–{v.end}</td><td>{v.service}</td>
              <td>{s.caregiver(v.caregiverId)?.name ?? <span style={{ color: 'var(--status-danger)' }}>None yet</span>}</td>
              <td><Chip tone={tone(v.status)}>{v.status}</Chip>{v.review && <div className="t-caption" style={{ color: 'var(--status-warning)' }}>Needs review</div>}{v.cancelReason && <div className="t-caption t-muted">{v.cancelReason}</div>}</td>
            </tr>))}</tbody>
        </table></div>}
    </div>
  )
}

function ReasonModal({ title, sub, label, confirm, danger, onClose, onSave }: { title: string; sub?: string; label: string; confirm: string; danger?: boolean; onClose: () => void; onSave: (t: string) => void }) {
  const [t, setT] = useState(''); const [tried, setTried] = useState(false); const bad = t.trim().length < 5
  return <Modal title={title} sub={sub} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger-solid' : 'primary'} onClick={() => { setTried(true); if (!bad) onSave(t.trim()) }}>{confirm}</Button></>}>
    <Field label={label} required error={tried && bad ? 'Please write a short reason.' : undefined}><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} error={tried && bad} /></Field>
  </Modal>
}
