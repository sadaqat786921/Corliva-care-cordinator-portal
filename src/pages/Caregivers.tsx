import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Phone, Lock, CalendarDays, Users } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { Caregiver, TODAY } from '../data/seed'
import { DAY_NAMES, weekHours } from '../data/schedule'
import { AlertBanner, Avatar, Button, Chip, ChipTone, Drawer, EmptyState, PageHead } from '../components/ui'

const rTone = (r: Caregiver['readiness']): ChipTone => r === 'Ready' ? 'success' : r === 'Warning' ? 'warning' : 'danger'
const rText = (r: Caregiver['readiness']) => r === 'Blocked' ? 'Not ready' : r === 'Warning' ? 'Ready with warning' : 'Ready'

export default function Caregivers() {
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [skill, setSkill] = useState('Any service')
  const [ready, setReady] = useState('Everyone')
  const [openId, setOpenId] = useState<string | null>(params.get('open'))
  useEffect(() => { const o = params.get('open'); if (o) setOpenId(o) }, [params])
  const rows = useMemo(() => s.caregivers.filter(g => s.inBranch(g.branch) && (skill === 'Any service' || g.skills.includes(skill)) &&
    (ready === 'Everyone' || (ready === 'Ready to work' ? g.readiness !== 'Blocked' : g.readiness === 'Blocked')) &&
    (!q.trim() || g.name.toLowerCase().includes(q.trim().toLowerCase()))), [s.caregivers, skill, ready, q])
  const open = s.caregivers.find(g => g.id === openId)

  return (
    <>
      <PageHead title="Caregivers" crumb="Caregivers" sub={`Who can work in ${s.branchName(s.me.branch)}, what they’re trained for and when they’re free. Use this to match visits.`} />
      <div className="row t-small" style={{ gap: 10, padding: '10px 14px', background: '#fff', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
        <Lock size={16} color="var(--text-muted)" /><span>Caregiver records and documents are kept by the HR Officer. Pay rates are not shown here.</span>
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="search"><Search /><input aria-label="Search caregivers" placeholder="Search by name" value={q} onChange={e => setQ(e.target.value)} /></div>
          <select className="select-sm" aria-label="Trained for" value={skill} onChange={e => setSkill(e.target.value)}>{['Any service', ...s.lists.services.filter(x => x.active).map(x => x.name)].map(o => <option key={o}>{o}</option>)}</select>
          <select className="select-sm" aria-label="Readiness" value={ready} onChange={e => setReady(e.target.value)}>{['Everyone', 'Ready to work', 'Not ready'].map(o => <option key={o}>{o}</option>)}</select>
          <span className="grow" /><span className="t-caption t-muted">{rows.length} caregiver{rows.length === 1 ? '' : 's'}</span>
        </div>
        {rows.length === 0 ? <EmptyState icon={Users} tone="neutral" title="No caregivers match" text="Try changing the filters." /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Caregiver</th><th>Type</th><th>Trained for</th><th>Usually works</th><th>This week</th><th>Status</th></tr></thead>
            <tbody>{rows.map(g => { const h = weekHours(g.id, TODAY, s.visits); return (
              <tr key={g.id} className="clickable" onClick={() => setOpenId(g.id)}>
                <td><span className="row"><Avatar name={g.name} /><span><span className="t-medium" style={{ display: 'block' }}>{g.name}</span><span className="t-caption t-muted">{g.phone}</span></span></span></td>
                <td>{g.type}</td><td>{g.skills.join(', ')}</td>
                <td>{g.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DAY_NAMES[d]).join(', ')}<div className="t-caption t-muted">{g.from}–{g.to}</div></td>
                <td><div className="bar" style={{ width: 90 }}><span style={{ width: `${Math.min(100, h / g.maxHours * 100)}%`, background: h > g.maxHours ? 'var(--status-danger)' : 'var(--action-primary)' }} /></div><span className="t-caption t-muted">{h} of {g.maxHours} hrs</span></td>
                <td><Chip tone={rTone(g.readiness)}>{rText(g.readiness)}</Chip>{g.issue && <div className="t-caption t-muted">{g.issue}</div>}</td>
              </tr>) })}</tbody>
          </table></div>}
      </div>
      {open && <CaregiverDrawer g={open} onClose={() => { setOpenId(null); if (params.get('open')) setParams({}, { replace: true }) }} />}
    </>
  )
}

function CaregiverDrawer({ g, onClose }: { g: Caregiver; onClose: () => void }) {
  const s = useStore()
  const nav = useNavigate()
  const upcoming = s.visits.filter(v => v.caregiverId === g.id && v.date >= TODAY && v.status !== 'Cancelled' && v.status !== 'Completed').sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 8)
  const clientsKnown = Array.from(new Set(s.visits.filter(v => v.caregiverId === g.id && v.status === 'Completed').map(v => s.client(v.clientId)?.name).filter(Boolean)))
  return (
    <Drawer title={<span className="row"><Avatar name={g.name} size="lg" />{g.name}</span>} sub={<span className="row" style={{ gap: 8 }}><Chip tone={rTone(g.readiness)}>{rText(g.readiness)}</Chip>{g.type}</span>} onClose={onClose} footer={<Button icon={CalendarDays} onClick={() => nav(`/schedule?caregiver=${g.id}`)}>See their schedule</Button>}>
      {g.readiness === 'Blocked' && <AlertBanner tone="danger" title="Can’t be given visits">{g.issue}. HR is sorting this out. Their upcoming visits show in Cover needed.</AlertBanner>}
      {g.readiness === 'Warning' && <AlertBanner tone="warning" title="Can work, with a reminder">{g.issue}.</AlertBanner>}
      <dl className="kv">
        <dt>Phone</dt><dd className="row" style={{ gap: 6 }}><Phone size={13} />{g.phone}</dd>
        <dt>Trained for</dt><dd>{g.skills.join(', ')}</dd>
        <dt>Usually works</dt><dd>{g.days.slice().sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(d => DAY_NAMES[d]).join(', ')} · {g.from}–{g.to}</dd>
        <dt>Most hours a week</dt><dd>{g.maxHours} (booked {weekHours(g.id, TODAY, s.visits)} this week)</dd>
        <dt>Knows these clients</dt><dd>{clientsKnown.length ? clientsKnown.join(', ') : '—'}</dd>
      </dl>
      <div className="divider" />
      <div><div className="t-h3" style={{ marginBottom: 10 }}>Upcoming visits</div>
        {upcoming.length === 0 ? <div className="t-small t-muted">No visits booked.</div> : upcoming.map(v => (
          <button key={v.id} className="list-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/schedule?visit=${v.id}`)}>
            <CalendarDays size={16} color="var(--text-muted)" /><div className="grow"><div className="t-small t-medium">{v.date === TODAY ? 'Today' : fmtDate(v.date)} · {v.start}–{v.end}</div><div className="t-caption t-muted">{s.client(v.clientId)?.name} · {v.service}</div></div>
          </button>))}
      </div>
    </Drawer>
  )
}
