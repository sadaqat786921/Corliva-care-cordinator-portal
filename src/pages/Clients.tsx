import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Home } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { CarePlan, Client, TODAY } from '../data/seed'
import { onboarding, plansFor, reviewDue, reviewOverdue } from '../data/clients'
import { Avatar, Button, Chip, ChipTone, EmptyState, PageHead, Pager, usePaged } from '../components/ui'

const stTone = (s: Client['status']): ChipTone => s === 'Active' ? 'success' : s === 'On hold' ? 'warning' : 'neutral'
export function planLabel(current?: CarePlan, working?: CarePlan): { text: string; tone: ChipTone } {
  if (working?.status === 'Changes requested') return { text: 'Changes requested', tone: 'warning' }
  if (working?.status === 'Awaiting review') return { text: current ? 'New version with Supervisor' : 'With Supervisor', tone: 'info' }
  if (working?.status === 'Draft' && !current) return { text: 'Draft — not sent', tone: 'neutral' }
  if (!current) return { text: 'No care plan', tone: 'danger' }
  if (reviewOverdue(current)) return { text: 'Review overdue', tone: 'danger' }
  if (reviewDue(current)) return { text: 'Review due soon', tone: 'warning' }
  return { text: 'Approved', tone: 'success' }
}

export default function Clients() {
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [who, setWho] = useState('Mine')
  const [status, setStatus] = useState('Active')
  const [show, setShow] = useState('Everyone')

  const rows = useMemo(() => s.clients.filter(c => s.inBranch(c.branch)).map(c => {
    const p = plansFor(c.id, s.carePlans)
    const steps = onboarding(c, s.carePlans, s.documents, s.visits)
    const next = s.visits.filter(v => v.clientId === c.id && v.date >= TODAY && ['Scheduled', 'Unassigned', 'In progress'].includes(v.status)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
    return { c, plan: planLabel(p.current, p.working), steps, next }
  }).filter(x =>
    (who === 'Everyone' || x.c.coordinator === s.me.name) &&
    (status === 'All statuses' || x.c.status === status) &&
    (show === 'Everyone' || (show === 'Set-up not finished' ? x.steps.some(st => !st.done) : x.plan.tone !== 'success')) &&
    (!q.trim() || x.c.name.toLowerCase().includes(q.trim().toLowerCase()))), [s.clients, s.carePlans, s.documents, s.visits, who, status, show, q])
  const pg = usePaged(rows, 10)

  const legacy = params.get('open')
  if (legacy) return <Navigate to={`/clients/${legacy}`} replace />

  return (
    <>
      <PageHead title="Clients" crumb="Clients" sub={`Everyone you look after in ${s.branchName(s.me.branch)}. Open a client to finish their set-up, care plan and visits.`} />
      <div className="card">
        <div className="toolbar">
          <div className="search"><Search /><input aria-label="Search clients" placeholder="Search by name" value={q} onChange={e => { setQ(e.target.value); pg.setPage(1) }} /></div>
          <select className="select-sm" aria-label="Whose clients" value={who} onChange={e => setWho(e.target.value)}><option value="Mine">My clients</option><option value="Everyone">All {s.branchName(s.me.branch)} clients</option></select>
          <select className="select-sm" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}>{['Active', 'On hold', 'Discharged', 'All statuses'].map(o => <option key={o}>{o}</option>)}</select>
          <select className="select-sm" aria-label="Show" value={show} onChange={e => setShow(e.target.value)}>{['Everyone', 'Set-up not finished', 'Care plan needs attention'].map(o => <option key={o}>{o}</option>)}</select>
          <span className="grow" /><span className="t-caption t-muted">{rows.length} client{rows.length === 1 ? '' : 's'}</span>
        </div>
        {rows.length === 0 ? <EmptyState icon={Home} tone="neutral" title="No clients match" text="Try another name or change the filters." action={<Button variant="secondary" onClick={() => { setQ(''); setWho('Everyone'); setStatus('All statuses'); setShow('Everyone') }}>Clear filters</Button>} /> : <>
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Client</th><th>Coordinator</th><th>Services</th><th>Next visit</th><th>Care plan</th><th>Set-up</th><th>Status</th></tr></thead>
            <tbody>{pg.slice.map(({ c, plan, steps, next }) => { const done = steps.filter(x => x.done).length; return (
              <tr key={c.id} className="clickable" onClick={() => nav(`/clients/${c.id}`)}>
                <td><span className="row"><Avatar name={c.name} /><span><span className="t-medium" style={{ display: 'block' }}>{c.name}</span><span className="t-caption t-muted">Since {c.since}</span></span></span></td>
                <td>{c.coordinator === s.me.name ? 'You' : c.coordinator}</td><td>{c.services}</td>
                <td>{next ? <>{next.date === TODAY ? 'Today' : fmtDate(next.date)} {next.start}{!next.caregiverId && <div className="t-caption" style={{ color: 'var(--status-danger)' }}>No caregiver yet</div>}</> : <span className="t-muted">—</span>}</td>
                <td><Chip tone={plan.tone}>{plan.text}</Chip></td>
                <td>{done === steps.length ? <span className="t-small" style={{ color: 'var(--status-success)' }}>Complete</span> : <><div className="bar" style={{ width: 90 }}><span style={{ width: `${done / steps.length * 100}%`, background: 'var(--status-warning)' }} /></div><span className="t-caption t-muted">{done} of {steps.length}</span></>}</td>
                <td><Chip tone={stTone(c.status)}>{c.status}</Chip></td>
              </tr>) })}</tbody>
          </table></div>
          <Pager {...pg} onPage={pg.setPage} />
        </>}
      </div>
    </>
  )
}
