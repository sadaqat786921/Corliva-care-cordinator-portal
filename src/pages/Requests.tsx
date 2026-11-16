import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MessageSquare, CheckCircle2, XCircle, HelpCircle, Send, CalendarClock, Phone, Clock, Info } from 'lucide-react'
import { useStore, fmtDate, stampNow } from '../data/store'
import { FamilyRequest, TODAY } from '../data/seed'
import { AlertBanner, Avatar, Button, Chip, ChipTone, Drawer, EmptyState, Field, Modal, PageHead, Tabs, Textarea } from '../components/ui'
import { AssignModal, CancelModal, ChangeTimeModal, NewVisitsModal } from '../components/VisitActions'

const stTone = (s: FamilyRequest['status']): ChipTone => s === 'New' ? 'info' : s === 'Waiting for family' ? 'warning' : s === 'Declined' ? 'danger' : 'success'
type Tab = 'open' | 'waiting' | 'done'

export default function Requests() {
  const s = useStore()
  const [params, setParams] = useSearchParams()
  const [tab, setTab] = useState<Tab>('open')
  const [openId, setOpenId] = useState<string | null>(params.get('open'))
  useEffect(() => { const o = params.get('open'); if (o) setOpenId(o) }, [params])
  const mine = s.requests.filter(r => s.inBranch(s.client(r.clientId)?.branch ?? ''))
  const rows = useMemo(() => mine.filter(r => tab === 'open' ? r.status === 'New' : tab === 'waiting' ? r.status === 'Waiting for family' : ['Approved', 'Declined', 'Answered'].includes(r.status))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)), [mine, tab])
  const open = s.requests.find(r => r.id === openId)

  return (
    <>
      <PageHead title="Family requests" crumb="Family requests" sub="Requests from family members on the family app. Nothing changes on the schedule until you approve it." />
      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={setTab} tabs={[
          { id: 'open', label: 'New', count: mine.filter(r => r.status === 'New').length },
          { id: 'waiting', label: 'Waiting for family', count: mine.filter(r => r.status === 'Waiting for family').length },
          { id: 'done', label: 'Done', count: mine.filter(r => ['Approved', 'Declined', 'Answered'].includes(r.status)).length },
        ]} /></div>
        {rows.length === 0 ? <EmptyState icon={CheckCircle2} title={tab === 'open' ? 'No new requests' : 'Nothing here'} text={tab === 'open' ? 'New requests from families appear here.' : tab === 'waiting' ? 'No requests are waiting for a family reply.' : 'Finished requests appear here.'} /> :
          <div className="table-wrap"><table className="tbl">
            <thead><tr><th>From</th><th>Client</th><th>Request</th><th>Received</th><th>Status</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="clickable" onClick={() => setOpenId(r.id)}>
                <td><span className="row"><Avatar name={r.from} size="sm" /><span><span className="t-medium" style={{ display: 'block' }}>{r.from}</span><span className="t-caption t-muted">{r.relationship}</span></span></span></td>
                <td>{s.client(r.clientId)?.name}</td>
                <td><div className="t-medium">{r.type}</div><div className="t-caption t-muted" style={{ maxWidth: 380, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.text}</div></td>
                <td>{r.date === TODAY ? 'Today' : fmtDate(r.date)} {r.time}</td>
                <td><Chip tone={stTone(r.status)}>{r.status}</Chip></td>
              </tr>))}</tbody>
          </table></div>}
      </div>
      {open && <RequestDrawer r={open} onClose={() => { setOpenId(null); if (params.get('open')) setParams({}, { replace: true }) }} />}
    </>
  )
}

function RequestDrawer({ r, onClose }: { r: FamilyRequest; onClose: () => void }) {
  const s = useStore()
  const nav = useNavigate()
  const [act, setAct] = useState<null | 'apply' | 'decline' | 'ask' | 'reply' | 'record'>(null)
  const c = s.client(r.clientId)!
  const v = s.visits.find(x => x.id === r.visitId)
  const g = s.caregiver(v?.caregiverId)
  const isOpen = r.status === 'New' || r.status === 'Waiting for family'
  const say = (text: string, status: FamilyRequest['status'], from: 'agency' | 'family' = 'agency') =>
    s.setRequests(x => x.map(y => y.id === r.id ? { ...y, status, thread: [...y.thread, { from, by: from === 'agency' ? s.me.name : r.from, at: stampNow(), text }] } : y))
  const approved = (summary: string) => {
    say(`Approved. ${summary}.`, 'Approved')
    s.clientNote(c.id, `Family request from ${r.from} approved: ${summary}.`)
    s.log({ type: 'Family request', action: 'Approved a family request', record: `${c.name} — ${r.type}`, after: summary })
  }
  const pre = (() => { const m = r.preferred.match(/(\d{1,2}:\d\d)\s*(?:to|–|-)\s*(\d{1,2}:\d\d)/); return m ? { start: m[1].padStart(5, '0'), end: m[2].padStart(5, '0') } : undefined })()
  const applyLabel = r.type === 'Change a visit time' ? 'Approve & change time' : r.type === 'Cancel a visit' ? 'Approve & cancel visit' : r.type === 'Add an extra visit' ? 'Approve & plan visit' : r.type === 'Change caregiver' ? 'Approve & change caregiver' : 'Answer'
  const needsVisit = (r.type === 'Change a visit time' || r.type === 'Cancel a visit' || r.type === 'Change caregiver') && (!v || v.date < TODAY || !['Scheduled', 'Unassigned'].includes(v.status))

  return (
    <Drawer title={`${r.type}`} sub={<span className="row" style={{ gap: 8 }}><Chip tone={stTone(r.status)}>{r.status}</Chip>From {r.from} ({r.relationship.toLowerCase()}) about {c.name}</span>} onClose={onClose} footer={isOpen ? <>
      <Button variant="danger" icon={XCircle} onClick={() => setAct('decline')}>Decline</Button>
      <Button variant="secondary" icon={HelpCircle} onClick={() => setAct('ask')}>Ask a question</Button>
      <Button icon={r.type === 'Question' ? Send : CheckCircle2} disabled={needsVisit} onClick={() => setAct(r.type === 'Question' ? 'reply' : 'apply')}>{applyLabel}</Button>
    </> : <Button variant="secondary" onClick={onClose}>Close</Button>}>
      <div className="card card-pad" style={{ background: 'var(--bg-subtle)' }}>
        <div className="row" style={{ gap: 10, marginBottom: 8 }}><Avatar name={r.from} /><div><div className="t-medium">{r.from}</div><div className="t-caption t-muted">{r.relationship} · {r.date === TODAY ? 'today' : fmtDate(r.date)} at {r.time}</div></div></div>
        <div>“{r.text}”</div>
        {r.preferred && <div className="t-small mt-2"><b>What they’d like:</b> {r.preferred}</div>}
      </div>
      {v && <div className="list-row" style={{ marginTop: 0 }}><CalendarClock size={18} color="var(--action-primary)" /><div className="grow"><div className="t-medium t-small">Visit #{v.id.slice(1)} · {fmtDate(v.date, { weekday: 'long', day: 'numeric', month: 'short' })} · {v.start}–{v.end}</div><div className="t-caption t-muted">{v.service} · {g ? g.name : 'no caregiver yet'} · {v.status}</div></div><button className="link-btn" onClick={() => nav(`/schedule?visit=${v.id}`)}>Open</button></div>}
      {needsVisit && isOpen && <AlertBanner tone="warning" title="The visit has already happened or changed">Ask the family which visit they mean, or decline with a reason.</AlertBanner>}
      {isOpen && r.type !== 'Question' && <div className="row t-caption t-muted" style={{ gap: 6 }}><Info size={13} />Approving opens the normal schedule step, so caregivers are checked and everyone is told.</div>}
      <div className="divider" />
      <div>
        <div className="row between" style={{ marginBottom: 10 }}><span className="t-h3">Conversation</span>{isOpen && <div className="row" style={{ gap: 6 }}>
          {r.status === 'Waiting for family' && <Button size="sm" variant="secondary" icon={Phone} onClick={() => setAct('record')}>Add their reply</Button>}
          <Button size="sm" variant="secondary" icon={Send} onClick={() => setAct('reply')}>Send a message</Button></div>}</div>
        {r.thread.length === 0 ? <div className="t-small t-muted">No replies yet. The family sees your replies in their app.</div> : <div className="col" style={{ gap: 10 }}>
          {r.thread.map((m, i) => (
            <div key={i} style={{ alignSelf: m.from === 'agency' ? 'flex-end' : 'flex-start', maxWidth: '85%', background: m.from === 'agency' ? 'var(--bg-selected)' : '#fff', border: '1px solid var(--border-default)', borderRadius: 10, padding: '8px 12px' }}>
              <div className="t-small">{m.text}</div><div className="t-caption t-muted row" style={{ gap: 4, marginTop: 4 }}><Clock size={11} />{m.by} · {m.at}</div>
            </div>))}</div>}
      </div>

      {act === 'apply' && r.type === 'Change a visit time' && v && <ChangeTimeModal v={v} preset={pre} onClose={() => setAct(null)} onDone={sum => approved(sum)} />}
      {act === 'apply' && r.type === 'Cancel a visit' && v && <CancelModal v={v} presetReason="Client asked to cancel" note={`Family request from ${r.from}`} onClose={() => setAct(null)} onDone={() => approved(`Visit on ${fmtDate(v.date)} ${v.start}–${v.end} cancelled`)} />}
      {act === 'apply' && r.type === 'Change caregiver' && v && <AssignModal v={v} onClose={() => setAct(null)} onDone={gg => approved(`${gg.name} will do the visit on ${fmtDate(v.date)} ${v.start}–${v.end}`)} />}
      {act === 'apply' && r.type === 'Add an extra visit' && <NewVisitsModal preset={{ clientId: c.id, start: pre?.start, end: pre?.end, note: `${r.from}: “${r.text}”` }} onClose={() => setAct(null)} onCreated={sum => approved(sum)} />}
      {act === 'reply' && <MessageModal title={r.type === 'Question' ? `Answer ${r.from}` : `Message ${r.from}`} label="Your message" confirm="Send" closeOption={r.type === 'Question'} onClose={() => setAct(null)} onSave={(t, close) => { say(t, close ? 'Answered' : r.status); s.toast(close ? 'Answer sent. Request closed.' : 'Message sent'); setAct(null) }} />}
      {act === 'ask' && <MessageModal title="Ask the family a question" label="Your question" confirm="Send question" onClose={() => setAct(null)} onSave={t => { say(t, 'Waiting for family'); s.toast('Question sent. The request waits for their reply.'); setAct(null) }} />}
      {act === 'record' && <MessageModal title={`Add ${r.from}’s reply`} label="What did they say? (e.g. by phone)" confirm="Add reply" onClose={() => setAct(null)} onSave={t => { say(t, 'New', 'family'); s.toast('Reply added. The request is back in New.'); setAct(null) }} />}
      {act === 'decline' && <MessageModal title="Decline this request?" label="Reason (the family sees this)" confirm="Decline" danger onClose={() => setAct(null)} onSave={t => {
        say(`Sorry, we can’t do this. ${t}`, 'Declined'); s.clientNote(c.id, `Family request from ${r.from} declined: ${t}`)
        s.log({ type: 'Family request', action: 'Declined a family request', record: `${c.name} — ${r.type}`, reason: t }); s.toast('Request declined. The family has been told.'); setAct(null)
      }} />}
    </Drawer>
  )
}

function MessageModal({ title, label, confirm, danger, closeOption, onClose, onSave }: { title: string; label: string; confirm: string; danger?: boolean; closeOption?: boolean; onClose: () => void; onSave: (t: string, close: boolean) => void }) {
  const [t, setT] = useState(''); const [close, setClose] = useState(true); const [tried, setTried] = useState(false); const bad = t.trim().length < 3
  return <Modal title={title} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger-solid' : 'primary'} icon={danger ? XCircle : Send} onClick={() => { setTried(true); if (!bad) onSave(t.trim(), !!closeOption && close) }}>{confirm}</Button></>}>
    <Field label={label} required error={tried && bad ? 'Please write a message.' : undefined}><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} error={tried && bad} /></Field>
    {closeOption && <label className="check"><input type="checkbox" checked={close} onChange={e => setClose(e.target.checked)} />This answers the question — close the request</label>}
    <div className="hint">Messages never include internal notes. The family reads them in their app.</div>
  </Modal>
}
