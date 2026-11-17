import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, UserPlus, XCircle, CalendarClock, CheckCircle2, Clock, MapPin, KeyRound, Phone, Repeat, Ban, TriangleAlert, LogIn, LogOut,
  Circle, Search, StickyNote, ClipboardList, History, UserRound, Heart,
} from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { TODAY, Visit, nowHM } from '../data/seed'
import { DAY_NAMES, checkCaregiver, coverQueue, dayOfWeek, liveState, minutesLate } from '../data/schedule'
import { plansFor } from '../data/clients'
import { AlertBanner, Avatar, Button, CardHead, Chip, ChipTone, EmptyState, Textarea } from '../components/ui'
import { CancelModal, ChangeTimeModal, KeepModal } from '../components/VisitActions'

const BACK: Record<string, string> = { '/cover': 'Cover needed', '/today': 'Today’s visits', '/schedule': 'Schedule', '/': 'My work' }
const vTone = (v: Visit): ChipTone => v.status === 'Completed' ? 'success' : v.status === 'Unassigned' ? 'danger' : v.status === 'Cancelled' ? 'neutral' : 'info'
const long = (d: string) => fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })

export default function VisitDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const from = params.get('from') ?? '/schedule'
  const backLabel = BACK[from] ?? (from.startsWith('/clients/') ? 'Client' : from.startsWith('/caregivers/') ? 'Caregiver' : from.startsWith('/incidents/') ? 'Incident' : from.startsWith('/requests/') ? 'Family request' : 'Back')
  const [picking, setPicking] = useState(params.get('assign') === '1')
  const [act, setAct] = useState<null | 'time' | 'cancel' | 'keep'>(null)
  useEffect(() => { setPicking(params.get('assign') === '1') }, [id])
  const v = s.visits.find(x => x.id === id)
  if (!v || !s.inBranch(v.branch)) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t find this visit" text="It may be in another branch, or the link is old." action={<Button onClick={() => nav('/schedule')}>Open Schedule</Button>} /></div>

  const c = s.client(v.clientId)!
  const g = s.caregiver(v.caregiverId)
  const plan = plansFor(v.clientId, s.carePlans).current
  const editable = v.date >= TODAY && ['Scheduled', 'Unassigned'].includes(v.status)
  const live = v.date === TODAY ? liveState(v) : null
  const cover = coverQueue(s.visits, s.caregivers, s.inBranch).find(i => i.visit.id === v.id)
  const history = s.audit.filter(a => a.record.includes('#' + v.id.slice(1)))
  const repeats = v.series ? s.visits.filter(x => x.series === v.series && x.status !== 'Cancelled') : []
  const repeatDays = Array.from(new Set(repeats.map(x => dayOfWeek(x.date)))).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
  const emergency = c.people.find(p => p.emergency)
  const setPick = (on: boolean) => { setPicking(on); const p = new URLSearchParams(params); if (on) p.set('assign', '1'); else p.delete('assign'); setParams(p, { replace: true }) }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to={from} className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />{backLabel}</Link>
          <div className="row wrap" style={{ gap: 10 }}>
            <h1 className="t-h1">{c.name} · Visit #{v.id.slice(1)}</h1>
            <Chip tone={vTone(v)}>{v.status}</Chip>
            {live && live !== 'Cancelled' && live !== 'Done' && <Chip tone={live === 'Late' || live === 'No caregiver' ? 'danger' : live === 'In progress' ? 'info' : 'warning'}>{live}</Chip>}
            {cover && cover.kind !== 'Late check-in' && cover.kind !== 'No caregiver' && <Chip tone={cover.kind === 'Needs review' ? 'warning' : 'danger'}>{cover.kind}</Chip>}
          </div>
          <div className="t-small t-muted" style={{ marginTop: 4 }}>{v.date === TODAY ? 'Today' : long(v.date)} · {v.start}–{v.end} · {v.service}{v.series && <> · <Repeat size={12} style={{ verticalAlign: -1 }} /> repeats {repeatDays.map(d => DAY_NAMES[d]).join(', ')}</>}</div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to={from}>{backLabel}</Link><span>/</span><span>Visit #{v.id.slice(1)}</span></div>
        </div>
        {editable && <div className="actions">
          {v.review && <Button variant="secondary" icon={CheckCircle2} onClick={() => setAct('keep')}>Keep as planned</Button>}
          <Button variant="danger" icon={XCircle} onClick={() => setAct('cancel')}>Cancel visit</Button>
          <Button variant="secondary" icon={CalendarClock} onClick={() => setAct('time')}>Change time</Button>
          {!picking && <Button icon={UserPlus} onClick={() => setPick(true)}>{v.caregiverId ? 'Change caregiver' : 'Find a caregiver'}</Button>}
        </div>}
      </div>

      {v.status === 'Unassigned' && <AlertBanner tone="danger" title="This visit has no caregiver">Choose someone below, or {c.name} will be missed.</AlertBanner>}
      {g?.readiness === 'Blocked' && editable && <AlertBanner tone="danger" title={`${g.name} can’t do this visit`}>{g.issue}. Choose another caregiver below.</AlertBanner>}
      {v.review && editable && <AlertBanner tone="warning" title="Needs review">{v.review}. Keep it as planned, change it, or cancel it.</AlertBanner>}
      {live === 'Late' && <AlertBanner tone="danger" title={`${g?.name} hasn’t checked in`}>{v.end <= nowHM() ? `The visit should have finished at ${v.end}. Check with the caregiver and ${c.name}; if it was missed, report an incident.` : `${minutesLate(v)} minutes past the start time. Call ${g?.phone}, or send someone else.`}</AlertBanner>}
      {v.status === 'Cancelled' && <AlertBanner tone="info" title="This visit was cancelled">{v.cancelReason ? `Reason: ${v.cancelReason}.` : ''} It stays in the history.</AlertBanner>}
      {v.status === 'Completed' && <AlertBanner tone="success" title="This visit is finished">The Care Supervisor reviews finished visits. It can’t be changed here.</AlertBanner>}

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          {picking && editable ? <CaregiverPicker v={v} onDone={() => setPick(false)} onCancel={() => setPick(false)} /> : (
            <div className="card">
              <CardHead title="Caregiver" action={g && <button className="link-btn" onClick={() => nav(`/caregivers/${g.id}?from=/visits/${v.id}`)}>See profile</button>} />
              <div className="card-body">
                {g ? <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                  <Avatar name={g.name} size="lg" />
                  <div className="grow col" style={{ gap: 4 }}>
                    <div className="row wrap" style={{ gap: 8 }}><span className="t-h3">{g.name}</span><Chip tone={g.readiness === 'Ready' ? 'success' : g.readiness === 'Warning' ? 'warning' : 'danger'}>{g.readiness === 'Blocked' ? 'Not ready' : g.readiness}</Chip></div>
                    <div className="t-small t-muted">{g.type} · trained for {g.skills.join(', ').toLowerCase()}</div>
                    <div className="row t-small" style={{ gap: 6 }}><Phone size={13} />{g.phone}</div>
                  </div>
                </div> : <div className="row" style={{ gap: 12 }}><div className="stat-icon tone-danger"><UserPlus /></div><div className="grow"><div className="t-medium">Nobody is assigned</div><div className="t-small t-muted">{editable ? 'Use “Find a caregiver” to see who can do it.' : 'This visit had no caregiver.'}</div></div>{editable && <Button icon={UserPlus} onClick={() => setPick(true)}>Find a caregiver</Button>}</div>}
              </div>
            </div>)}

          <div className="card">
            <CardHead title="Progress" sub={v.date === TODAY ? `Updates live from the caregiver app. Late is ${s.rules.lateArrivalMins} minutes after the start.` : undefined} />
            <div className="card-body col" style={{ gap: 14 }}>
              {[
                { label: 'Planned', sub: `${v.start}–${v.end}`, done: true, icon: CalendarClock },
                { label: g ? `${g.name} assigned` : 'Caregiver assigned', sub: g ? g.type : 'Not yet', done: !!g, icon: UserRound },
                { label: 'Checked in', sub: v.checkIn ? `at ${v.checkIn}${v.checkIn > v.start ? ` (${Math.round((+v.checkIn.slice(0, 2) * 60 + +v.checkIn.slice(3)) - (+v.start.slice(0, 2) * 60 + +v.start.slice(3)))} min after start)` : ''}` : live === 'Late' ? 'Late — not yet' : 'Not yet', done: !!v.checkIn, late: live === 'Late', icon: LogIn },
                { label: 'Checked out', sub: v.checkOut ? `at ${v.checkOut}` : 'Not yet', done: !!v.checkOut, icon: LogOut },
              ].map((st, i) => (
                <div key={i} className="row" style={{ gap: 12 }}>
                  {st.done ? <CheckCircle2 size={20} color="var(--status-success)" /> : st.late ? <TriangleAlert size={20} color="var(--status-danger)" /> : <Circle size={20} color="var(--border-strong)" />}
                  <span className="grow"><span className={st.done ? 't-medium' : 't-muted'} style={{ display: 'block' }}>{st.label}</span><span className="t-caption" style={{ color: st.late ? 'var(--status-danger)' : 'var(--text-muted)' }}>{st.sub}</span></span>
                </div>))}
              {v.status === 'Cancelled' && <div className="t-small t-muted">Cancelled — no check-in expected.</div>}
            </div>
          </div>

          <div className="card">
            <CardHead title={`Care plan for this visit${plan ? ` · version ${plan.version}` : ''}`} action={<button className="link-btn" onClick={() => nav(`/clients/${c.id}?tab=plan`)}>Open care plan</button>} />
            <div className="card-body col" style={{ gap: 10 }}>
              {!plan ? <div className="t-small t-muted">No approved care plan.</div> : <>
                <div className="col" style={{ gap: 6 }}>{plan.tasks.map(t => <div key={t} className="row t-small" style={{ gap: 8 }}><ClipboardList size={14} color="var(--text-muted)" />{t}</div>)}</div>
                {plan.instructions && <div className="t-small" style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 12px' }}>{plan.instructions}</div>}
              </>}
            </div>
          </div>

          <NotesCard v={v} editable={editable || v.status === 'In progress'} />
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Client" action={<button className="link-btn" onClick={() => nav(`/clients/${c.id}`)}>Open client</button>} />
            <div className="card-body">
              <div className="row" style={{ gap: 10, marginBottom: 12 }}><Avatar name={c.name} /><div><div className="t-medium">{c.name}</div><div className="t-caption t-muted">{c.services}</div></div></div>
              <dl className="kv" style={{ gridTemplateColumns: '100px 1fr' }}>
                <dt>Address</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><MapPin size={13} style={{ marginTop: 3 }} />{c.address || '—'}</dd>
                <dt>Getting in</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><KeyRound size={13} style={{ marginTop: 3 }} />{c.access || '—'}</dd>
                <dt>Phone</dt><dd>{c.phone}</dd>
                {c.preferences && <><dt>Likes, needs</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><Heart size={13} style={{ marginTop: 3 }} />{c.preferences}</dd></>}
                <dt>Emergency</dt><dd>{emergency ? <>{emergency.name}<div className="t-caption t-muted">{emergency.relationship} · {emergency.phone}</div></> : <span style={{ color: 'var(--status-danger)' }}>None added</span>}</dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <CardHead title="Visit details" />
            <div className="card-body">
              <dl className="kv" style={{ gridTemplateColumns: '100px 1fr' }}>
                <dt>Date</dt><dd>{long(v.date)}</dd>
                <dt>Time</dt><dd className="row" style={{ gap: 6 }}><Clock size={13} />{v.start} – {v.end}</dd>
                <dt>Service</dt><dd>{v.service}</dd>
                <dt>Branch</dt><dd>{s.branchName(v.branch)}</dd>
                <dt>Repeats</dt><dd>{v.series ? `Every ${repeatDays.map(d => DAY_NAMES[d]).join(', ')} (${repeats.filter(x => x.date >= TODAY).length} still to come)` : 'No — one-off visit'}</dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <CardHead title="Changes" sub="Every change to this visit. Nothing is removed." />
            <div className="card-body timeline">
              {history.length === 0 ? <div className="t-small t-muted">No changes since it was planned.</div> : history.map(h => (
                <div key={h.id} className="timeline-item"><div className="stat-icon tone-neutral"><History /></div><div><div className="t-small"><b>{h.action}</b>{(h.before || h.after) && <> · {h.before} → {h.after}</>}</div>{h.reason && <div className="t-caption t-muted">Reason: {h.reason}</div>}<div className="t-caption t-muted">{h.actor} · {h.at}</div></div></div>))}
            </div>
          </div>
        </div>
      </div>
      {act === 'time' && <ChangeTimeModal v={v} onClose={() => setAct(null)} />}
      {act === 'cancel' && <CancelModal v={v} presetReason={v.review?.includes('on hold') ? 'Client in hospital' : undefined} onClose={() => setAct(null)} />}
      {act === 'keep' && <KeepModal v={v} onClose={() => setAct(null)} />}
    </>
  )
}

/** Choose a caregiver right on the visit screen. Blocking problems stop the choice; warnings only remind. Coordinators can’t override. */
function CaregiverPicker({ v, onDone, onCancel }: { v: Visit; onDone: () => void; onCancel: () => void }) {
  const s = useStore()
  const [only, setOnly] = useState(true)
  const options = useMemo(() => s.caregivers.filter(g => g.branch === v.branch && g.id !== v.caregiverId).map(g => ({ g, ck: checkCaregiver(g, v, s.visits) }))
    .sort((a, b) => a.ck.blocking.length - b.ck.blocking.length || b.ck.good.length - a.ck.good.length || a.ck.warnings.length - b.ck.warnings.length), [s.caregivers, s.visits, v])
  const list = options.filter(o => !only || !o.ck.blocking.length)
  const hidden = options.length - list.length
  const assign = (gid: string) => {
    const g = s.caregiver(gid)!
    const before = s.caregiver(v.caregiverId)?.name ?? 'No caregiver'
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, caregiverId: gid, status: y.status === 'Unassigned' ? 'Scheduled' : y.status, review: undefined, coverNote: undefined } : y))
    s.log({ type: 'Schedule', action: v.caregiverId ? 'Changed caregiver' : 'Assigned a caregiver', record: `Visit #${v.id.slice(1)}`, before, after: g.name })
    s.toast(`${g.name} is on the visit. They and the family have been told.`); onDone()
  }
  const soft = (w: string[]) => w.filter(x => !x.startsWith('Has not'))
  return (
    <div className="card" style={{ borderColor: 'var(--border-focus)' }}>
      <CardHead title={v.caregiverId ? 'Change caregiver' : 'Find a caregiver'} sub="Best matches first. Caregivers with a red reason can’t be assigned." action={<div className="row">
        <label className="check t-small"><input type="checkbox" checked={only} onChange={e => setOnly(e.target.checked)} />Only who can do it</label>
        <Button size="sm" variant="secondary" onClick={onCancel}>Close</Button></div>} />
      <div className="card-body">
        {list.length === 0 ? <div className="col" style={{ gap: 8 }}><div className="t-medium">Nobody in {s.branchName(v.branch)} can do this visit.</div><div className="t-small t-muted">Try changing the time, add a note in Cover needed, or ask a Care Supervisor — only they can make an exception.</div></div> : list.map(({ g, ck }) => {
          const blocked = ck.blocking.length > 0
          return (
            <div key={g.id} className="list-row" style={{ alignItems: 'flex-start', opacity: blocked ? .8 : 1 }}>
              <Avatar name={g.name} />
              <div className="grow col" style={{ gap: 3 }}>
                <div className="row wrap" style={{ gap: 8 }}><Link to={`/caregivers/${g.id}?from=/visits/${v.id}`} className="t-medium" style={{ color: 'var(--text-primary)' }}>{g.name}</Link><span className="t-caption t-muted">{g.type} · {g.phone}</span></div>
                {ck.blocking.map(b => <span key={b} className="row t-caption" style={{ gap: 4, color: 'var(--status-danger)' }}><Ban size={12} />{b}</span>)}
                {!blocked && ck.warnings.map(w => <span key={w} className="row t-caption" style={{ gap: 4, color: 'var(--status-warning)' }}><TriangleAlert size={12} />{w}</span>)}
                {!blocked && ck.good.map(w => <span key={w} className="row t-caption" style={{ gap: 4, color: 'var(--status-success)' }}><CheckCircle2 size={12} />{w}</span>)}
              </div>
              <Chip tone={blocked ? 'danger' : soft(ck.warnings).length ? 'warning' : 'success'}>{blocked ? 'Can’t assign' : soft(ck.warnings).length ? 'Check first' : 'Good match'}</Chip>
              {!blocked && <Button size="sm" onClick={() => assign(g.id)}>Assign</Button>}
            </div>)
        })}
        {only && hidden > 0 && <button className="link-btn mt-2" onClick={() => setOnly(false)}>Show {hidden} who can’t do it, and why</button>}
        {!only && options.some(o => o.ck.blocking.length) && <div className="hint mt-2">Only a {s.rules.overrideRoles.join(' or ')} can make an exception for someone who can’t be assigned.</div>}
      </div>
    </div>
  )
}

/** Notes for this visit: why it isn’t covered yet, or what the caregiver said. Saved on the visit. */
function NotesCard({ v, editable }: { v: Visit; editable: boolean }) {
  const s = useStore()
  const [t, setT] = useState('')
  const save = () => {
    if (t.trim().length < 3) return
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, coverNote: `${t.trim()} (${nowHM()})` } : y))
    s.log({ type: 'Schedule', action: 'Added a note', record: `Visit #${v.id.slice(1)}`, reason: t.trim() })
    s.toast('Note saved'); setT('')
  }
  return (
    <div className="card">
      <CardHead title="Notes" sub="Why it isn’t covered yet, or what the caregiver told you. Not shown to the family." />
      <div className="card-body col" style={{ gap: 10 }}>
        {v.coverNote ? <div className="row t-small" style={{ gap: 8, alignItems: 'flex-start', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '10px 12px' }}><StickyNote size={15} color="var(--text-muted)" style={{ marginTop: 2 }} />{v.coverNote}</div> : <div className="t-small t-muted">No notes yet.</div>}
        {editable && <>
          <Textarea value={t} onChange={e => setT(e.target.value)} placeholder="For example: asked Rosa and Ben, waiting to hear back" />
          <div className="row" style={{ justifyContent: 'flex-end' }}><Button size="sm" disabled={t.trim().length < 3} onClick={save}>{v.coverNote ? 'Replace note' : 'Save note'}</Button></div>
        </>}
      </div>
    </div>
  )
}
