import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, UserPlus, XCircle, CheckCircle2, LayoutGrid, List, Clock, MapPin, X, Plus, CalendarClock, TriangleAlert, KeyRound, Phone, Repeat } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { Visit, TODAY, iso } from '../data/seed'
import { liveState } from '../data/schedule'
import { plansFor } from '../data/clients'
import { AlertBanner, Avatar, Button, Chip, ChipTone, Drawer, EmptyState, Field, Modal, PageHead, Textarea } from '../components/ui'
import { AssignModal, CancelModal, ChangeTimeModal, NewVisitsModal } from '../components/VisitActions'

const vTone = (v: Visit): ChipTone => v.status === 'Completed' ? 'success' : v.status === 'Unassigned' ? 'danger' : v.status === 'Cancelled' ? 'neutral' : 'info'
const mondayOf = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }

export default function Schedule() {
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const [week, setWeek] = useState(() => mondayOf(new Date()))
  const [view, setView] = useState<'board' | 'list'>('board')
  const [show, setShow] = useState('All visits')
  const [cg, setCg] = useState(params.get('caregiver') ?? 'all')
  const [cl, setCl] = useState(params.get('client') && !params.get('new') ? params.get('client')! : 'all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState<{ clientId?: string } | null>(params.get('new') ? { clientId: params.get('client') ?? undefined } : null)
  useEffect(() => {
    const vid = params.get('visit')
    if (vid) { const v = s.visits.find(x => x.id === vid); if (v) { setOpenId(v.id); setWeek(mondayOf(new Date(v.date + 'T12:00'))) } }
    if (params.get('new')) setCreating({ clientId: params.get('client') ?? undefined })
    if (params.get('caregiver')) setCg(params.get('caregiver')!)
  }, [params])
  const clearUrl = () => { if ([...params.keys()].length) setParams({}, { replace: true }) }

  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(week); d.setDate(d.getDate() + i); return iso(d) })
  const vis = useMemo(() => s.visits.filter(v => s.inBranch(v.branch) && days.includes(v.date) &&
    (show === 'All visits' || (show === 'Needs a caregiver' ? v.status === 'Unassigned' : v.status !== 'Cancelled')) &&
    (cg === 'all' || v.caregiverId === cg) && (cl === 'all' || v.clientId === cl)), [s.visits, days.join(), show, cg, cl])
  const cgs = s.caregivers.filter(g => s.inBranch(g.branch) && (cg === 'all' || g.id === cg))
  const open = s.visits.find(v => v.id === openId)
  const cls = (v: Visit) => v.status === 'Cancelled' ? 'cancel' : v.status === 'Unassigned' ? 'open' : v.status === 'Completed' ? 'done' : v.review || s.caregiver(v.caregiverId)?.readiness === 'Blocked' ? 'warn' : 'ok'
  const Shift = ({ v }: { v: Visit }) => (
    <button className={`shift ${cls(v)}`} onClick={() => setOpenId(v.id)} title={`${s.client(v.clientId)?.name} ${v.start}–${v.end}`}>
      <b>{v.start}</b> {s.client(v.clientId)?.name}<div className="t-caption" style={{ opacity: .8 }}>{v.service}</div>
    </button>)

  return (
    <>
      <PageHead title="Schedule" crumb="Schedule" sub={`${s.branchName(s.me.branch)} · all times in ${s.agency.timezone}.`} actions={<Button icon={Plus} onClick={() => setCreating({})}>Plan visits</Button>} />
      <div className="card">
        <div className="toolbar">
          <div className="row" style={{ gap: 6 }}>
            <button className="icon-btn" aria-label="Previous week" onClick={() => { const d = new Date(week); d.setDate(d.getDate() - 7); setWeek(d) }}><ChevronLeft size={16} /></button>
            <Button size="sm" variant="secondary" onClick={() => setWeek(mondayOf(new Date()))}>This week</Button>
            <button className="icon-btn" aria-label="Next week" onClick={() => { const d = new Date(week); d.setDate(d.getDate() + 7); setWeek(d) }}><ChevronRight size={16} /></button>
            <span className="t-strong" style={{ marginLeft: 6 }}>{fmtDate(days[0], { day: 'numeric', month: 'short' })} – {fmtDate(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <span className="grow" />
          <select className="select-sm" aria-label="Which visits" value={show} onChange={e => setShow(e.target.value)}>{['All visits', 'Needs a caregiver', 'Hide cancelled'].map(o => <option key={o}>{o}</option>)}</select>
          <select className="select-sm" aria-label="Caregiver" value={cg} onChange={e => { setCg(e.target.value); clearUrl() }}><option value="all">All caregivers</option>{s.caregivers.filter(g => s.inBranch(g.branch)).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <select className="select-sm" aria-label="Client" value={cl} onChange={e => { setCl(e.target.value); clearUrl() }}><option value="all">All clients</option>{s.clients.filter(c => s.inBranch(c.branch) && c.status !== 'Discharged').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          {(cg !== 'all' || cl !== 'all' || show !== 'All visits') && <Button size="sm" variant="ghost" icon={X} onClick={() => { setCg('all'); setCl('all'); setShow('All visits'); clearUrl() }}>Clear</Button>}
          <div className="seg" role="group" aria-label="View">
            <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}><LayoutGrid size={14} style={{ verticalAlign: -2 }} /> Week</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><List size={14} style={{ verticalAlign: -2 }} /> List</button>
          </div>
        </div>
        <div className="row t-caption t-secondary" style={{ gap: 16, padding: '10px 16px', borderBottom: '1px solid var(--border-default)' }}>
          {[['ok', 'Planned'], ['done', 'Done'], ['open', 'No caregiver'], ['warn', 'Needs review'], ['cancel', 'Cancelled']].map(([c, l]) => <span key={c} className="row" style={{ gap: 6 }}><span className={`shift ${c}`} style={{ width: 14, height: 10, padding: 0, margin: 0 }} />{l}</span>)}
        </div>
        {vis.length === 0 ? <EmptyState icon={CheckCircle2} title={show === 'Needs a caregiver' ? 'Every visit has a caregiver' : 'No visits this week'} text="Try another week or clear the filters." action={<Button variant="secondary" icon={Plus} onClick={() => setCreating({})}>Plan visits</Button>} />
          : view === 'board' ? (
            <div className="table-wrap"><div className="board">
              <div className="bh">Caregiver</div>
              {days.map(d => <div key={d} className={`bh ${d === TODAY ? 'today' : ''}`}>{fmtDate(d, { weekday: 'short', day: 'numeric' })}{d === TODAY && ' · Today'}</div>)}
              {cg === 'all' && <>
                <div style={{ background: 'var(--status-danger-soft)' }}><div className="t-strong" style={{ color: 'var(--status-danger)' }}>No caregiver yet</div><div className="t-caption t-muted">{vis.filter(v => !v.caregiverId && v.status !== 'Cancelled').length} visits</div></div>
                {days.map(d => <div key={d}>{vis.filter(v => v.date === d && !v.caregiverId).map(v => <Shift key={v.id} v={v} />)}</div>)}
              </>}
              {show !== 'Needs a caregiver' && cgs.map(g => (
                <Row key={g.id}>
                  <div><div className="row" style={{ gap: 8 }}><Avatar name={g.name} size="sm" /><span className="t-medium">{g.name}</span></div>
                    <div className="t-caption t-muted" style={{ marginTop: 4 }}>{g.type}</div>
                    {g.readiness !== 'Ready' && <div className="t-caption" style={{ color: g.readiness === 'Blocked' ? 'var(--status-danger)' : 'var(--status-warning)' }}>{g.readiness === 'Blocked' ? 'Not ready' : 'Warning'}</div>}</div>
                  {days.map(d => <div key={d}>{vis.filter(v => v.date === d && v.caregiverId === g.id).map(v => <Shift key={v.id} v={v} />)}</div>)}
                </Row>))}
            </div></div>
          ) : (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Date</th><th>Time</th><th>Client</th><th>Service</th><th>Caregiver</th><th>Status</th></tr></thead>
              <tbody>{vis.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map(v => (
                <tr key={v.id} className="clickable" onClick={() => setOpenId(v.id)}>
                  <td>{v.date === TODAY ? 'Today' : fmtDate(v.date)}</td><td>{v.start}–{v.end}</td><td className="t-medium">{s.client(v.clientId)?.name}</td><td>{v.service}</td>
                  <td>{s.caregiver(v.caregiverId)?.name ?? <span style={{ color: 'var(--status-danger)' }}>None yet</span>}</td>
                  <td><Chip tone={vTone(v)}>{v.status}</Chip>{v.review && <div className="t-caption" style={{ color: 'var(--status-warning)' }}>Needs review</div>}</td>
                </tr>))}</tbody>
            </table></div>
          )}
      </div>
      {open && <VisitDrawer v={open} onClose={() => { setOpenId(null); clearUrl() }} />}
      {creating && <NewVisitsModal preset={{ clientId: creating.clientId }} onClose={() => { setCreating(null); clearUrl() }} />}
    </>
  )
}

function Row({ children }: { children: React.ReactNode }) { return <>{children}</> }

export function VisitDrawer({ v, onClose }: { v: Visit; onClose: () => void }) {
  const s = useStore()
  const nav = useNavigate()
  const [act, setAct] = useState<null | 'assign' | 'time' | 'cancel' | 'keep'>(null)
  const c = s.client(v.clientId)!
  const g = s.caregiver(v.caregiverId)
  const plan = plansFor(v.clientId, s.carePlans).current
  const editable = v.date >= TODAY && ['Scheduled', 'Unassigned'].includes(v.status)
  const history = s.audit.filter(a => a.record.includes('#' + v.id.slice(1)))
  const st = v.date === TODAY ? liveState(v) : null
  return (
    <Drawer title={`Visit #${v.id.slice(1)}`} sub={<span className="row" style={{ gap: 8 }}><Chip tone={vTone(v)}>{v.status}</Chip>{v.date === TODAY ? 'Today' : fmtDate(v.date, { weekday: 'long', day: 'numeric', month: 'long' })}{v.series && <span className="row t-caption" style={{ gap: 4 }}><Repeat size={12} />Repeats</span>}</span>} onClose={onClose} footer={editable ? <>
      <Button variant="danger" icon={XCircle} onClick={() => setAct('cancel')}>Cancel visit</Button>
      <Button variant="secondary" icon={CalendarClock} onClick={() => setAct('time')}>Change time</Button>
      <Button icon={UserPlus} onClick={() => setAct('assign')}>{v.caregiverId ? 'Change caregiver' : 'Assign caregiver'}</Button>
    </> : <Button variant="secondary" onClick={onClose}>Close</Button>}>
      {v.status === 'Unassigned' && <AlertBanner tone="danger" title="This visit has no caregiver">Assign someone, or the client will be missed.</AlertBanner>}
      {g?.readiness === 'Blocked' && editable && <AlertBanner tone="danger" title={`${g.name} can’t do this visit`}>{g.issue}. Choose another caregiver.</AlertBanner>}
      {v.review && editable && <AlertBanner tone="warning" title="Needs review" action={<Button size="sm" variant="secondary" onClick={() => setAct('keep')}>Keep as planned</Button>}>{v.review}</AlertBanner>}
      {st === 'Late' && <AlertBanner tone="danger" title={`${g?.name} hasn’t checked in`}>Call them on {g?.phone}, or change the caregiver.</AlertBanner>}
      {!editable && v.status !== 'Unassigned' && <AlertBanner tone="info" title={v.status === 'Cancelled' ? 'This visit was cancelled' : v.status === 'Completed' ? 'This visit is finished' : 'This visit has started'}>{v.cancelReason ? `Reason: ${v.cancelReason}. ` : ''}{v.status === 'Completed' ? 'Finished visits can’t be changed here; the Care Supervisor reviews them.' : ''}</AlertBanner>}
      <dl className="kv">
        <dt>Client</dt><dd><button className="link-btn" onClick={() => nav(`/clients/${c.id}`)}>{c.name}</button></dd>
        <dt>Time</dt><dd className="row" style={{ gap: 6 }}><Clock size={13} />{v.start} – {v.end}{v.checkIn && <span className="t-caption t-muted"> · checked in {v.checkIn}{v.checkOut ? `, out ${v.checkOut}` : ''}</span>}</dd>
        <dt>Service</dt><dd>{v.service}</dd>
        <dt>Address</dt><dd className="row" style={{ gap: 6 }}><MapPin size={13} />{c.address || '—'}</dd>
        <dt>Getting in</dt><dd className="row" style={{ gap: 6, alignItems: 'flex-start' }}><KeyRound size={13} style={{ marginTop: 3 }} />{c.access || '—'}</dd>
        <dt>Caregiver</dt><dd>{g ? <span className="row" style={{ gap: 8 }}><Avatar name={g.name} size="sm" />{g.name}<span className="t-caption t-muted row" style={{ gap: 4 }}><Phone size={11} />{g.phone}</span></span> : <span style={{ color: 'var(--status-danger)' }}>Not assigned</span>}</dd>
        {v.coverNote && <><dt>Cover note</dt><dd>{v.coverNote}</dd></>}
      </dl>
      {plan && <><div className="divider" /><div><div className="t-h3" style={{ marginBottom: 6 }}>Care plan tasks (version {plan.version})</div><ul style={{ margin: 0, paddingLeft: 18 }} className="t-small">{plan.tasks.map(t => <li key={t}>{t}</li>)}</ul>{plan.instructions && <div className="t-small t-secondary mt-2" style={{ whiteSpace: 'pre-wrap' }}>{plan.instructions}</div>}</div></>}
      {history.length > 0 && <><div className="divider" /><div><div className="t-h3" style={{ marginBottom: 8 }}>Changes</div>{history.map(h => <div key={h.id} className="t-small" style={{ marginBottom: 8 }}><b>{h.action}</b> by {h.actor} · <span className="t-muted">{h.at}</span>{(h.before || h.after) && <div className="t-caption t-muted">{h.before} → {h.after}</div>}{h.reason && <div className="t-caption t-muted">Reason: {h.reason}</div>}</div>)}</div></>}
      {act === 'assign' && <AssignModal v={v} onClose={() => setAct(null)} />}
      {act === 'time' && <ChangeTimeModal v={v} onClose={() => setAct(null)} />}
      {act === 'cancel' && <CancelModal v={v} onClose={() => setAct(null)} onDone={onClose} />}
      {act === 'keep' && <KeepModal v={v} onClose={() => setAct(null)} />}
    </Drawer>
  )
}

/** Clear a "needs review" mark after checking the visit should still go ahead. */
export function KeepModal({ v, onClose }: { v: Visit; onClose: () => void }) {
  const s = useStore()
  const [t, setT] = useState(''); const [tried, setTried] = useState(false); const bad = t.trim().length < 5
  return <Modal title="Keep this visit as planned?" sub={v.review} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => {
    setTried(true); if (bad) return
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, review: undefined } : y))
    s.log({ type: 'Schedule', action: 'Checked a visit and kept it', record: `Visit #${v.id.slice(1)}`, reason: t.trim() }); s.toast('Visit kept as planned'); onClose()
  }}>Keep visit</Button></>}>
    <Field label="Why can it go ahead?" required error={tried && bad ? 'Please write a short note.' : undefined}><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} placeholder="For example: checked with the family, she’s home by then" error={tried && bad} /></Field>
  </Modal>
}
