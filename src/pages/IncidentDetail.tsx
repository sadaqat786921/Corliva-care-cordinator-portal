import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, Clock, Search, CheckCircle2, Circle, Info, Send, CalendarDays } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { IncidentStatus, TODAY } from '../data/seed'
import { AlertBanner, Avatar, Button, CardHead, Chip, EmptyState, Textarea } from '../components/ui'
import { sevTone, stTone, stamp } from './Incidents'

const STEPS: { st: IncidentStatus; help: string }[] = [
  { st: 'Reported', help: 'Someone told us what happened.' },
  { st: 'Under review', help: 'The owner is looking into it.' },
  { st: 'Action required', help: 'Something needs to be done.' },
  { st: 'Resolved', help: 'The actions are done.' },
  { st: 'Closed', help: 'Checked and closed by the owner.' },
]

export default function IncidentDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const [t, setT] = useState('')
  const i = s.incidents.find(x => x.id === id)
  if (!i || !s.inBranch(i.branch) || (i.sensitive && i.reportedBy !== s.me.name)) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t show this incident" text="It may be in another branch, or only approved roles can see it." action={<Button onClick={() => nav('/incidents')}>All incidents</Button>} /></div>

  const at = STEPS.findIndex(x => x.st === i.status)
  const client = s.clients.find(c => c.name === i.client)
  const cg = s.caregivers.find(g => g.name === i.caregiver)
  const visitsThatDay = client ? s.visits.filter(v => v.clientId === client.id && v.date === i.date) : []
  const overdue = !['Resolved', 'Closed'].includes(i.status) && i.due < TODAY
  const [first, ...rest] = i.notes
  const add = () => {
    if (t.trim().length < 3) return
    s.setIncidents(x => x.map(y => y.id === i.id ? { ...y, notes: [...y.notes, { by: s.me.name, at: stamp(), text: t.trim() }] } : y))
    s.toast(`Note added. ${i.owner} can see it.`); setT('')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/incidents" className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />Incidents</Link>
          <div className="row wrap" style={{ gap: 10 }}>
            <h1 className="t-h1">{i.title}</h1>
            <Chip tone={stTone(i.status)}>{i.status}</Chip><Chip tone={sevTone(i.severity)}>{i.severity}</Chip>
            {i.sensitive && <Chip tone="neutral">Private</Chip>}
          </div>
          <div className="t-small t-muted" style={{ marginTop: 4 }}>{i.id} · {i.category} · happened {fmtDate(i.date, { weekday: 'long', day: 'numeric', month: 'long' })} · reported by {i.reportedBy}</div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to="/incidents">Incidents</Link><span>/</span><span>{i.id}</span></div>
        </div>
      </div>

      {overdue && <AlertBanner tone="danger" title={`Past the target date (${fmtDate(i.due, { day: 'numeric', month: 'short' })})`}>{i.owner} has been reminded.</AlertBanner>}
      {i.sensitive && <AlertBanner tone="info" title="Private incident">Only approved roles can see this.</AlertBanner>}

      <div className="card card-pad">
        <div className="stepper">
          {STEPS.map((x, k) => { const state = k < at || i.status === 'Closed' ? 'done' : k === at ? 'current' : 'todo'; return (
            <div key={x.st} className={`stp ${state}`} style={{ cursor: 'default' }}>
              <span className="stp-dot">{state === 'done' ? <CheckCircle2 size={15} /> : k + 1}</span>
              <span className="stp-txt"><span className="stp-name">{x.st}</span><span className="stp-sub">{x.help}</span></span>
            </div>) })}
        </div>
      </div>

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="What happened" sub={first ? `${first.by} · ${first.at}` : undefined} />
            <div className="card-body">{first ? <div style={{ fontSize: 15 }}>{first.text}</div> : <div className="t-small t-muted">No description yet.</div>}</div>
          </div>
          <div className="card">
            <CardHead title="Notes and actions" sub="Everyone working on this incident sees these. Nothing is removed." />
            <div className="card-body col" style={{ gap: 14 }}>
              {rest.length === 0 ? <div className="t-small t-muted">No follow-up notes yet.</div> : <div className="timeline">{rest.map((n, k) => (
                <div key={k} className="timeline-item"><Avatar name={n.by} size="sm" /><div><div className="t-small">{n.text}</div><div className="t-caption t-muted row" style={{ gap: 4 }}><Clock size={11} />{n.by} · {n.at}</div></div></div>))}</div>}
              {i.status !== 'Closed' ? <>
                <div className="divider" />
                <Textarea value={t} onChange={e => setT(e.target.value)} placeholder="Add anything you’ve learned — e.g. spoke to the family, they’ve booked a GP visit" />
                <div className="row between"><span className="t-caption t-muted">{i.owner} is told when you add a note.</span><Button icon={Send} disabled={t.trim().length < 3} onClick={add}>Add note</Button></div>
              </> : <div className="row t-caption t-muted" style={{ gap: 6 }}><Lock size={12} />Closed incidents can’t be changed.</div>}
            </div>
          </div>
        </div>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Who handles this" />
            <div className="card-body col" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 10 }}><Avatar name={i.owner} /><div><div className="t-medium">{i.owner}</div><div className="t-caption t-muted">Owner · Care Supervisor</div></div></div>
              <div className="row t-small" style={{ gap: 8, alignItems: 'flex-start' }}><Info size={15} color="var(--status-info)" style={{ marginTop: 2 }} />The owner decides the actions, moves it along and closes it. You can add notes.</div>
              <div className="t-small"><b>Target date:</b> <span style={{ color: overdue ? 'var(--status-danger)' : undefined }}>{fmtDate(i.due, { weekday: 'short', day: 'numeric', month: 'long' })}</span></div>
            </div>
          </div>
          <div className="card">
            <CardHead title="Details" />
            <div className="card-body">
              <dl className="kv" style={{ gridTemplateColumns: '110px 1fr' }}>
                <dt>Type</dt><dd>{i.category}</dd>
                <dt>Severity</dt><dd><Chip tone={sevTone(i.severity)}>{i.severity}</Chip></dd>
                <dt>Client</dt><dd>{client ? <Link to={`/clients/${client.id}`}>{i.client}</Link> : i.client}</dd>
                <dt>Caregiver</dt><dd>{cg ? <Link to={`/caregivers/${cg.id}`}>{cg.name}</Link> : i.caregiver ?? '—'}</dd>
                <dt>Reported by</dt><dd>{i.reportedBy}</dd>
                <dt>Happened</dt><dd>{fmtDate(i.date, { day: 'numeric', month: 'long', year: 'numeric' })}</dd>
                <dt>Branch</dt><dd>{s.branchName(i.branch)}</dd>
              </dl>
            </div>
          </div>
          {visitsThatDay.length > 0 && <div className="card">
            <CardHead title="Visits that day" />
            <div className="card-body">{visitsThatDay.map(v => (
              <button key={v.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/visits/${v.id}?from=/incidents/${i.id}`)}>
                <CalendarDays size={16} color="var(--text-muted)" /><div className="grow"><div className="t-small t-medium">{v.start}–{v.end} · {v.service}</div><div className="t-caption t-muted">{s.caregiver(v.caregiverId)?.name ?? 'No caregiver'} · {v.status}</div></div>
              </button>))}</div>
          </div>}
          {i.status === 'Closed' && <div className="row t-small" style={{ gap: 8 }}><Circle size={10} color="var(--status-success)" fill="var(--status-success)" />Closed — kept in history and reports.</div>}
        </div>
      </div>
    </>
  )
}
