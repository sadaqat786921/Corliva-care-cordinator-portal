import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, CheckCircle2, StickyNote, Phone, Ban, Clock, CalendarClock, ChevronRight } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { TODAY, addDays } from '../data/seed'
import { CoverItem, coverQueue } from '../data/schedule'
import { Button, CardHead, Chip, ChipTone, EmptyState, PageHead, Tabs } from '../components/ui'

const kindTone = (k: CoverItem['kind']): ChipTone => k === 'Needs review' ? 'warning' : 'danger'

export default function Cover() {
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [kind, setKind] = useState<'all' | CoverItem['kind']>('all')
  const all = coverQueue(s.visits, s.caregivers, s.inBranch)
  const items = all.filter(i => kind === 'all' || i.kind === kind)
  const groups = useMemo(() => {
    const g: { title: string; list: CoverItem[] }[] = [{ title: 'Today', list: [] }, { title: 'Tomorrow', list: [] }, { title: 'Next 7 days', list: [] }, { title: 'Later', list: [] }]
    for (const i of items) { const d = i.visit.date; (d === TODAY ? g[0] : d === addDays(1) ? g[1] : d <= addDays(7) ? g[2] : g[3]).list.push(i) }
    return g.filter(x => x.list.length)
  }, [items])

  // Old links like /cover?visit=v123 open that visit's screen
  const legacy = params.get('visit')
  if (legacy) return <Navigate to={`/visits/${legacy}?from=/cover&assign=1`} replace />

  const count = (k: CoverItem['kind']) => all.filter(i => i.kind === k).length
  const open = (id: string, assign = false) => nav(`/visits/${id}?from=/cover${assign ? '&assign=1' : ''}`)

  return (
    <>
      <PageHead title="Cover needed" crumb="Cover needed" sub="Every upcoming visit that needs you. Open one to see the details, choose a caregiver, change it or cancel it." />
      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={kind} onChange={setKind} tabs={[
          { id: 'all', label: 'Everything', count: all.length }, { id: 'No caregiver', label: 'No caregiver', count: count('No caregiver') },
          { id: 'Caregiver not ready', label: 'Caregiver not ready', count: count('Caregiver not ready') }, { id: 'Needs review', label: 'Needs review', count: count('Needs review') },
          { id: 'Late check-in', label: 'Late check-in', count: count('Late check-in') },
        ]} /></div>
      </div>
      {items.length === 0 ? <div className="card"><EmptyState icon={CheckCircle2} title="Every visit is covered" text="Nothing needs cover right now. New gaps appear here straight away." /></div> : groups.map(gr => (
        <div key={gr.title} className="card">
          <CardHead title={gr.title} action={<span className="t-caption t-muted">{gr.list.length} visit{gr.list.length > 1 ? 's' : ''}</span>} />
          <div className="card-body">
            {gr.list.map(({ visit: v, kind: k, detail }) => {
              const c = s.client(v.clientId); const g = s.caregiver(v.caregiverId)
              return (
                <div key={v.id} className="list-row clickable-row" role="button" tabIndex={0} onClick={() => open(v.id)} onKeyDown={e => { if (e.key === 'Enter') open(v.id) }} style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
                  <div className={`stat-icon tone-${kindTone(k)}`} style={{ width: 36, height: 36 }}>{k === 'Late check-in' ? <Clock size={17} /> : k === 'Needs review' ? <CalendarClock size={17} /> : k === 'Caregiver not ready' ? <Ban size={17} /> : <UserPlus size={17} />}</div>
                  <div className="grow col" style={{ gap: 4 }}>
                    <div className="row wrap" style={{ gap: 8 }}><span className="t-medium">{c?.name}</span><Chip tone={kindTone(k)}>{k}</Chip></div>
                    <div className="t-small">{v.date === TODAY ? 'Today' : fmtDate(v.date)} · {v.start}–{v.end} · {v.service}</div>
                    <div className="t-caption t-muted">{detail}</div>
                    {v.coverNote && <div className="row t-caption" style={{ gap: 6 }}><StickyNote size={12} color="var(--text-muted)" />{v.coverNote}</div>}
                    {k === 'Late check-in' && g && <div className="row t-caption" style={{ gap: 6 }}><Phone size={12} />Call {g.name}: <b>{g.phone}</b></div>}
                  </div>
                  <div className="row" style={{ gap: 6 }} onClick={e => e.stopPropagation()}>
                    {(k === 'No caregiver' || k === 'Caregiver not ready') && <Button size="sm" icon={UserPlus} onClick={() => open(v.id, true)}>Find caregiver</Button>}
                    {k === 'Needs review' && <Button size="sm" onClick={() => open(v.id)}>Review</Button>}
                    {k === 'Late check-in' && <Button size="sm" icon={UserPlus} onClick={() => open(v.id, true)}>Send someone else</Button>}
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" style={{ alignSelf: 'center' }} />
                </div>)
            })}
          </div>
        </div>))}
    </>
  )
}
