import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UserPlus, XCircle, CheckCircle2, StickyNote, Phone, Ban, Clock, CalendarClock } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { TODAY, Visit, addDays } from '../data/seed'
import { CoverItem, coverQueue } from '../data/schedule'
import { Button, CardHead, Chip, ChipTone, EmptyState, Field, Modal, PageHead, Tabs, Textarea } from '../components/ui'
import { AssignModal, CancelModal } from '../components/VisitActions'
import { KeepModal } from './Schedule'

const kindTone = (k: CoverItem['kind']): ChipTone => k === 'Needs review' ? 'warning' : 'danger'

export default function Cover() {
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [kind, setKind] = useState<'all' | CoverItem['kind']>('all')
  const [act, setAct] = useState<null | { a: 'assign' | 'cancel' | 'keep' | 'note'; v: Visit }>(null)
  const all = coverQueue(s.visits, s.caregivers, s.inBranch)
  const items = all.filter(i => kind === 'all' || i.kind === kind)
  useEffect(() => { const vid = params.get('visit'); const it = all.find(i => i.visit.id === vid); if (it) { setAct({ a: it.kind === 'Needs review' ? 'keep' : 'assign', v: it.visit }); setParams({}, { replace: true }) } }, [params])

  const groups = useMemo(() => {
    const g: { title: string; list: CoverItem[] }[] = [{ title: 'Today', list: [] }, { title: 'Tomorrow', list: [] }, { title: 'Next 7 days', list: [] }, { title: 'Later', list: [] }]
    for (const i of items) { const d = i.visit.date; (d === TODAY ? g[0] : d === addDays(1) ? g[1] : d <= addDays(7) ? g[2] : g[3]).list.push(i) }
    return g.filter(x => x.list.length)
  }, [items])
  const count = (k: CoverItem['kind']) => all.filter(i => i.kind === k).length

  return (
    <>
      <PageHead title="Cover needed" crumb="Cover needed" sub="Every upcoming visit that needs you: no caregiver, a caregiver who can’t work, a change to check, or a late check-in." />
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
                <div key={v.id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <div className={`stat-icon tone-${kindTone(k)}`} style={{ width: 36, height: 36 }}>{k === 'Late check-in' ? <Clock size={17} /> : k === 'Needs review' ? <CalendarClock size={17} /> : k === 'Caregiver not ready' ? <Ban size={17} /> : <UserPlus size={17} />}</div>
                  <div className="grow col" style={{ gap: 4 }}>
                    <div className="row wrap" style={{ gap: 8 }}><button className="link-btn t-medium" style={{ color: 'var(--text-primary)', fontSize: 14 }} onClick={() => nav(`/schedule?visit=${v.id}`)}>{c?.name}</button><Chip tone={kindTone(k)}>{k}</Chip></div>
                    <div className="t-small">{v.date === TODAY ? 'Today' : fmtDate(v.date)} · {v.start}–{v.end} · {v.service}</div>
                    <div className="t-caption t-muted">{detail}</div>
                    {v.coverNote && <div className="t-caption" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '6px 8px' }}><b>Note:</b> {v.coverNote}</div>}
                    {k === 'Late check-in' && g && <div className="row t-caption" style={{ gap: 6 }}><Phone size={12} />Call {g.name}: <b>{g.phone}</b></div>}
                  </div>
                  <div className="row wrap" style={{ gap: 6, justifyContent: 'flex-end', maxWidth: 360 }}>
                    {k !== 'Late check-in' && <Button size="sm" variant="secondary" icon={StickyNote} onClick={() => setAct({ a: 'note', v })}>Add note</Button>}
                    {k === 'Needs review' && <Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => setAct({ a: 'keep', v })}>Keep</Button>}
                    <Button size="sm" variant="danger" icon={XCircle} onClick={() => setAct({ a: 'cancel', v })}>Cancel</Button>
                    <Button size="sm" icon={UserPlus} onClick={() => setAct({ a: 'assign', v })}>{g ? 'Change caregiver' : 'Find caregiver'}</Button>
                  </div>
                </div>)
            })}
          </div>
        </div>))}
      {act?.a === 'assign' && <AssignModal v={act.v} onClose={() => setAct(null)} />}
      {act?.a === 'cancel' && <CancelModal v={act.v} presetReason={act.v.review?.includes('on hold') ? 'Client in hospital' : undefined} onClose={() => setAct(null)} />}
      {act?.a === 'keep' && <KeepModal v={act.v} onClose={() => setAct(null)} />}
      {act?.a === 'note' && <NoteModal v={act.v} onClose={() => setAct(null)} />}
    </>
  )
}

/** Record why a visit is still not covered (BRD User Flow 4, step 4). It stays in the queue. */
function NoteModal({ v, onClose }: { v: Visit; onClose: () => void }) {
  const s = useStore()
  const [t, setT] = useState(v.coverNote ?? ''); const [tried, setTried] = useState(false); const bad = t.trim().length < 5
  return <Modal title="Why isn’t this covered yet?" sub="The visit stays on this list. Your note helps whoever picks it up next." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => {
    setTried(true); if (bad) return
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, coverNote: t.trim() } : y))
    s.log({ type: 'Schedule', action: 'Added a cover note', record: `Visit #${v.id.slice(1)}`, reason: t.trim() }); s.toast('Note saved'); onClose()
  }}>Save note</Button></>}>
    <Field label="Note" required error={tried && bad ? 'Please write a short note.' : undefined}><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} placeholder="For example: asked Rosa and Ben, waiting to hear back" error={tried && bad} /></Field>
  </Modal>
}
