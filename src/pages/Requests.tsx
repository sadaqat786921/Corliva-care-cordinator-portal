import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, HelpCircle, Send, CalendarClock, Phone, Clock, Info, ArrowLeft, Search, ChevronRight, MessageSquare, Lock, Mail } from 'lucide-react'
import { useStore, fmtDate, stampNow } from '../data/store'
import { FamilyRequest, TODAY } from '../data/seed'
import { AlertBanner, Avatar, Button, CardHead, Chip, ChipTone, EmptyState, Field, Modal, PageHead, Tabs, Textarea } from '../components/ui'
import { AssignModal, CancelModal, ChangeTimeModal, NewVisitsModal } from '../components/VisitActions'

const stTone = (s: FamilyRequest['status']): ChipTone => s === 'New' ? 'info' : s === 'Waiting for family' ? 'warning' : s === 'Declined' ? 'danger' : 'success'
type Tab = 'open' | 'waiting' | 'done'

/* ---------------- List ---------------- */

export default function Requests() {
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>('open')
  const mine = s.requests.filter(r => s.inBranch(s.client(r.clientId)?.branch ?? ''))
  const rows = useMemo(() => mine.filter(r => tab === 'open' ? r.status === 'New' : tab === 'waiting' ? r.status === 'Waiting for family' : ['Approved', 'Declined', 'Answered'].includes(r.status))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)), [mine, tab])
  const legacy = params.get('open')
  if (legacy) return <Navigate to={`/requests/${legacy}`} replace />

  return (
    <>
      <PageHead title="Family requests" crumb="Family requests" sub="Requests from family members on the family app. Nothing changes on the schedule until you approve it. Click one to open it." />
      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={setTab} tabs={[
          { id: 'open', label: 'New', count: mine.filter(r => r.status === 'New').length },
          { id: 'waiting', label: 'Waiting for family', count: mine.filter(r => r.status === 'Waiting for family').length },
          { id: 'done', label: 'Done', count: mine.filter(r => ['Approved', 'Declined', 'Answered'].includes(r.status)).length },
        ]} /></div>
        {rows.length === 0 ? <EmptyState icon={CheckCircle2} title={tab === 'open' ? 'No new requests' : 'Nothing here'} text={tab === 'open' ? 'New requests from families appear here.' : tab === 'waiting' ? 'No requests are waiting for a family reply.' : 'Finished requests appear here.'} /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>From</th><th>Client</th><th>Request</th><th>Received</th><th>Status</th><th style={{ width: 30 }} /></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="clickable" onClick={() => nav(`/requests/${r.id}`)}>
                <td><span className="row"><Avatar name={r.from} size="sm" /><span><span className="t-medium" style={{ display: 'block' }}>{r.from}</span><span className="t-caption t-muted">{r.relationship}</span></span></span></td>
                <td>{s.client(r.clientId)?.name}</td>
                <td><div className="t-medium">{r.type}</div><div className="t-caption t-muted" style={{ maxWidth: 380, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.text}</div></td>
                <td>{r.date === TODAY ? 'Today' : fmtDate(r.date)} {r.time}</td>
                <td><Chip tone={stTone(r.status)}>{r.status}</Chip></td>
                <td><ChevronRight size={16} color="var(--text-muted)" /></td>
              </tr>))}</tbody>
          </table></div>}
      </div>
    </>
  )
}

/* ---------------- Full request screen ---------------- */

export function RequestDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const [act, setAct] = useState<null | 'apply' | 'decline'>(null)
  const [msg, setMsg] = useState('')
  const r = s.requests.find(x => x.id === id)
  const c = r ? s.client(r.clientId) : undefined
  if (!r || !c || !s.inBranch(c.branch)) return <div className="card"><EmptyState icon={Search} tone="neutral" title="We can’t find this request" text="It may be for a client in another branch." action={<Button onClick={() => nav('/requests')}>All family requests</Button>} /></div>

  const v = s.visits.find(x => x.id === r.visitId)
  const g = s.caregiver(v?.caregiverId)
  const isOpen = r.status === 'New' || r.status === 'Waiting for family'
  const person = c.people.find(p => p.name === r.from)
  const say = (text: string, status: FamilyRequest['status'], from: 'agency' | 'family' = 'agency') =>
    s.setRequests(x => x.map(y => y.id === r.id ? { ...y, status, thread: [...y.thread, { from, by: from === 'agency' ? s.me.name : r.from, at: stampNow(), text }] } : y))
  const approved = (summary: string) => {
    say(`Approved. ${summary}.`, 'Approved')
    s.clientNote(c.id, `Family request from ${r.from} approved: ${summary}.`)
    s.log({ type: 'Family request', action: 'Approved a family request', record: `${c.name} — ${r.type}`, after: summary })
  }
  const pre = (() => { const m = r.preferred.match(/(\d{1,2}:\d\d)\s*(?:to|–|-)\s*(\d{1,2}:\d\d)/); return m ? { start: m[1].padStart(5, '0'), end: m[2].padStart(5, '0') } : undefined })()
  const applyLabel = r.type === 'Change a visit time' ? 'Approve & change time' : r.type === 'Cancel a visit' ? 'Approve & cancel visit' : r.type === 'Add an extra visit' ? 'Approve & plan visit' : r.type === 'Change caregiver' ? 'Approve & change caregiver' : ''
  const needsVisit = (r.type === 'Change a visit time' || r.type === 'Cancel a visit' || r.type === 'Change caregiver') && (!v || v.date < TODAY || !['Scheduled', 'Unassigned'].includes(v.status))
  const send = (kind: 'message' | 'answer' | 'ask' | 'their') => {
    const t = msg.trim(); if (t.length < 3) return
    if (kind === 'their') { say(t, 'New', 'family'); s.toast('Their reply was added. The request is back in New.') }
    else if (kind === 'ask') { say(t, 'Waiting for family'); s.toast('Question sent. The request waits for their reply.') }
    else if (kind === 'answer') { say(t, 'Answered'); s.toast('Answer sent. The request is closed.') }
    else { say(t, r.status); s.toast('Message sent') }
    setMsg('')
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/requests" className="row t-small t-medium" style={{ gap: 6, marginBottom: 8 }}><ArrowLeft size={15} />Family requests</Link>
          <div className="row wrap" style={{ gap: 10 }}><h1 className="t-h1">{r.type}</h1><Chip tone={stTone(r.status)}>{r.status}</Chip></div>
          <div className="t-small t-muted" style={{ marginTop: 4 }}>From {r.from} ({r.relationship.toLowerCase()}) about {c.name} · {r.date === TODAY ? 'today' : fmtDate(r.date)} at {r.time}</div>
          <div className="crumbs"><Link to="/">Home</Link><span>/</span><Link to="/requests">Family requests</Link><span>/</span><span>{r.from}</span></div>
        </div>
        {isOpen && <div className="actions">
          <Button variant="danger" icon={XCircle} onClick={() => setAct('decline')}>Decline</Button>
          {applyLabel && <Button icon={CheckCircle2} disabled={needsVisit} onClick={() => setAct('apply')}>{applyLabel}</Button>}
        </div>}
      </div>

      {needsVisit && isOpen && <AlertBanner tone="warning" title="The visit has already happened or changed">Ask the family which visit they mean, or decline with a reason.</AlertBanner>}
      {r.status === 'Waiting for family' && <AlertBanner tone="info" title="Waiting for the family to reply">If they phone you instead, add their reply below.</AlertBanner>}

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Their request" />
            <div className="card-body col" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 10 }}><Avatar name={r.from} /><div><div className="t-medium">{r.from}</div><div className="t-caption t-muted">{r.relationship} · sent from the family app</div></div></div>
              <div style={{ fontSize: 15 }}>“{r.text}”</div>
              {r.preferred && <div className="t-small" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px' }}><b>What they’d like:</b> {r.preferred}</div>}
            </div>
          </div>

          {v && <div className="card">
            <CardHead title="The visit they mean" action={<button className="link-btn" onClick={() => nav(`/visits/${v.id}?from=/requests/${r.id}`)}>Open visit</button>} />
            <div className="card-body">
              <button className="list-row clickable-row" style={{ marginTop: 0, width: '100%', textAlign: 'left' }} onClick={() => nav(`/visits/${v.id}?from=/requests/${r.id}`)}>
                <CalendarClock size={18} color="var(--action-primary)" /><div className="grow"><div className="t-medium">{fmtDate(v.date, { weekday: 'long', day: 'numeric', month: 'long' })} · {v.start}–{v.end}</div><div className="t-caption t-muted">{v.service} · {g ? g.name : 'no caregiver yet'} · {v.status}</div></div><ChevronRight size={16} color="var(--text-muted)" />
              </button>
              {isOpen && applyLabel && <div className="row t-caption t-muted mt-2" style={{ gap: 6 }}><Info size={13} />“{applyLabel}” opens the normal schedule step, so the caregiver is checked and everyone is told.</div>}
            </div>
          </div>}

          <div className="card">
            <CardHead title="Conversation" sub="The family reads your messages in their app. Internal notes are never shown to them." />
            <div className="card-body col" style={{ gap: 12 }}>
              {r.thread.length === 0 ? <div className="t-small t-muted">No messages yet.</div> : r.thread.map((m, i) => (
                <div key={i} style={{ alignSelf: m.from === 'agency' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: m.from === 'agency' ? 'var(--bg-selected)' : '#fff', border: '1px solid var(--border-default)', borderRadius: 10, padding: '8px 12px' }}>
                  <div className="t-small">{m.text}</div><div className="t-caption t-muted row" style={{ gap: 4, marginTop: 4 }}><Clock size={11} />{m.by} · {m.at}</div>
                </div>))}
              {isOpen ? <>
                <div className="divider" />
                <Textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder={r.type === 'Question' ? 'Write your answer' : 'Write a message to the family'} />
                <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-end' }}>
                  {r.status === 'Waiting for family' && <Button variant="secondary" icon={Phone} disabled={msg.trim().length < 3} onClick={() => send('their')}>Add as their reply</Button>}
                  <Button variant="secondary" icon={HelpCircle} disabled={msg.trim().length < 3} onClick={() => send('ask')}>Ask and wait for reply</Button>
                  {r.type === 'Question' ? <Button icon={Send} disabled={msg.trim().length < 3} onClick={() => send('answer')}>Send answer and close</Button>
                    : <Button icon={Send} disabled={msg.trim().length < 3} onClick={() => send('message')}>Send message</Button>}
                </div>
              </> : <div className="row t-caption t-muted" style={{ gap: 6 }}><Lock size={12} />This request is finished. It stays in the client’s history.</div>}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Client" action={<button className="link-btn" onClick={() => nav(`/clients/${c.id}`)}>Open client</button>} />
            <div className="card-body">
              <div className="row" style={{ gap: 10, marginBottom: 10 }}><Avatar name={c.name} /><div><div className="t-medium">{c.name}</div><div className="t-caption t-muted">{c.services}</div></div></div>
              <div className="t-small t-muted">Coordinator: {c.coordinator === s.me.name ? 'You' : c.coordinator}</div>
            </div>
          </div>
          <div className="card">
            <CardHead title="From" />
            <div className="card-body">
              <dl className="kv" style={{ gridTemplateColumns: '90px 1fr' }}>
                <dt>Name</dt><dd>{r.from}</dd>
                <dt>Relationship</dt><dd>{r.relationship}</dd>
                <dt>Phone</dt><dd>{person?.phone ?? '—'}</dd>
                <dt>Email</dt><dd className="row" style={{ gap: 6 }}>{person?.email ? <><Mail size={13} />{person.email}</> : '—'}</dd>
                <dt>Role</dt><dd>{person?.representative ? <Chip tone="info">Representative</Chip> : 'Family member'}</dd>
              </dl>
            </div>
          </div>
          <div className="card">
            <CardHead title="How requests work" />
            <div className="card-body col t-small" style={{ gap: 8 }}>
              {['Families send requests from their app.', 'You approve, ask a question, or decline with a reason.', 'Approving uses the normal schedule step, so caregivers are checked.', 'The family is told the outcome in their app.'].map((t, i) => (
                <div key={i} className="row" style={{ gap: 10, alignItems: 'flex-start' }}><span className="avatar sm" style={{ background: 'var(--bg-selected)' }}>{i + 1}</span><span>{t}</span></div>))}
            </div>
          </div>
        </div>
      </div>

      {act === 'apply' && r.type === 'Change a visit time' && v && <ChangeTimeModal v={v} preset={pre} onClose={() => setAct(null)} onDone={sum => approved(sum)} />}
      {act === 'apply' && r.type === 'Cancel a visit' && v && <CancelModal v={v} presetReason="Client asked to cancel" note={`Family request from ${r.from}`} onClose={() => setAct(null)} onDone={() => approved(`Visit on ${fmtDate(v.date)} ${v.start}–${v.end} cancelled`)} />}
      {act === 'apply' && r.type === 'Change caregiver' && v && <AssignModal v={v} onClose={() => setAct(null)} onDone={gg => approved(`${gg.name} will do the visit on ${fmtDate(v.date)} ${v.start}–${v.end}`)} />}
      {act === 'apply' && r.type === 'Add an extra visit' && <NewVisitsModal preset={{ clientId: c.id, start: pre?.start, end: pre?.end, note: `${r.from}: “${r.text}”` }} onClose={() => setAct(null)} onCreated={sum => approved(sum)} />}
      {act === 'decline' && <DeclineModal from={r.from} onClose={() => setAct(null)} onSave={t => {
        say(`Sorry, we can’t do this. ${t}`, 'Declined'); s.clientNote(c.id, `Family request from ${r.from} declined: ${t}`)
        s.log({ type: 'Family request', action: 'Declined a family request', record: `${c.name} — ${r.type}`, reason: t }); s.toast('Request declined. The family has been told.'); setAct(null)
      }} />}
    </>
  )
}

function DeclineModal({ from, onClose, onSave }: { from: string; onClose: () => void; onSave: (t: string) => void }) {
  const [t, setT] = useState(''); const [tried, setTried] = useState(false); const bad = t.trim().length < 3
  return <Modal title="Decline this request?" sub={`${from} will see your reason in the family app.`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger-solid" icon={XCircle} onClick={() => { setTried(true); if (!bad) onSave(t.trim()) }}>Decline</Button></>}>
    <Field label="Reason (the family sees this)" required error={tried && bad ? 'Please write a reason.' : undefined}><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} placeholder="For example: we have no caregiver free at that time, but can do 11:00" error={tried && bad} /></Field>
  </Modal>
}
