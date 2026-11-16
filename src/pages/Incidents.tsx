import { useMemo, useState } from 'react'
import { Plus, MessageSquarePlus, CheckCircle2, Lock, TriangleAlert, Clock, Info } from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { Incident, IncidentStatus, TODAY, addDays } from '../data/seed'
import { stampFor } from '../data/seed'
import { AlertBanner, Avatar, Button, Chip, ChipTone, Drawer, EmptyState, Field, Input, Modal, PageHead, Select, Tabs, Textarea } from '../components/ui'

const sevTone = (s: Incident['severity']): ChipTone => s === 'High' ? 'danger' : s === 'Medium' ? 'warning' : 'neutral'
const stTone = (s: IncidentStatus): ChipTone => s === 'Resolved' || s === 'Closed' ? 'success' : s === 'Action required' ? 'danger' : s === 'Under review' ? 'warning' : 'info'
const stamp = () => { const d = new Date(); return `Today ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

export default function Incidents() {
  const s = useStore()
  const [tab, setTab] = useState<'open' | 'Resolved' | 'Closed'>('open')
  const [openId, setOpenId] = useState<string | null>(null)
  const [report, setReport] = useState(false)
  const isOpen = (i: Incident) => !['Resolved', 'Closed'].includes(i.status)
  const visible = (i: Incident) => s.inBranch(i.branch) && (!i.sensitive || i.reportedBy === s.me.name)
  const rows = useMemo(() => s.incidents.filter(i => visible(i) && (tab === 'open' ? isOpen(i) : i.status === tab)), [s.incidents, tab])
  const n = (f: (i: Incident) => boolean) => s.incidents.filter(i => visible(i) && f(i)).length
  const open = s.incidents.find(i => i.id === openId)

  return (
    <>
      <PageHead title="Incidents" crumb="Incidents" sub="Report problems and add what you know. The Care Supervisor owns each incident, decides what happens and closes it." actions={<Button icon={Plus} onClick={() => setReport(true)}>Report an incident</Button>} />
      <div className="card">
        <div style={{ padding: '0 16px' }}><Tabs value={tab} onChange={setTab} tabs={[{ id: 'open', label: 'Open', count: n(isOpen) }, { id: 'Resolved', label: 'Resolved', count: n(i => i.status === 'Resolved') }, { id: 'Closed', label: 'Closed', count: n(i => i.status === 'Closed') }]} /></div>
        {rows.length === 0 ? <EmptyState icon={CheckCircle2} title={tab === 'open' ? 'No open incidents' : 'Nothing here'} text={tab === 'open' ? 'Nothing needs attention right now.' : 'Incidents appear here as they move along.'} />
          : <div className="table-wrap"><table className="tbl">
            <thead><tr><th>Incident</th><th>Type</th><th>Severity</th><th>Client</th><th>Owner</th><th>Target date</th><th>Status</th></tr></thead>
            <tbody>{rows.map(i => (
              <tr key={i.id} className="clickable" onClick={() => setOpenId(i.id)}>
                <td><div className="t-medium row" style={{ gap: 6 }}>{i.sensitive && <Lock size={13} />}{i.title}</div><div className="t-caption t-muted">{i.id} · reported {fmtDate(i.date)} by {i.reportedBy}</div></td>
                <td>{i.category}</td><td><Chip tone={sevTone(i.severity)}>{i.severity}</Chip></td><td>{i.client}</td><td>{i.owner}</td>
                <td style={{ color: isOpen(i) && i.due < TODAY ? 'var(--status-danger)' : undefined, fontWeight: isOpen(i) && i.due < TODAY ? 600 : 400 }}>{i.due === TODAY ? 'Today' : fmtDate(i.due)}</td>
                <td><Chip tone={stTone(i.status)}>{i.status}</Chip></td>
              </tr>))}</tbody>
          </table></div>}
      </div>
      {open && <IncidentDrawer i={open} onClose={() => setOpenId(null)} />}
      {report && <ReportModal onClose={() => setReport(false)} onDone={id => { setReport(false); setTab('open'); setOpenId(id) }} />}
    </>
  )
}

function IncidentDrawer({ i, onClose }: { i: Incident; onClose: () => void }) {
  const s = useStore()
  const [act, setAct] = useState<'note' | null>(null)
  const upd = (note: string) => s.setIncidents(x => x.map(y => y.id === i.id ? { ...y, notes: [...y.notes, { by: s.me.name, at: stamp(), text: note }] } : y))
  return (
    <Drawer title={i.title} sub={<span className="row" style={{ gap: 8 }}>{i.id}<Chip tone={stTone(i.status)}>{i.status}</Chip><Chip tone={sevTone(i.severity)}>{i.severity}</Chip></span>} onClose={onClose} footer={i.status === 'Closed' ? <Button variant="secondary" onClick={onClose}>Close</Button> : <Button icon={MessageSquarePlus} onClick={() => setAct('note')}>Add note</Button>}>
      {i.sensitive && <AlertBanner tone="info" title="Private incident">Only approved roles can see this.</AlertBanner>}
      <div className="row t-small" style={{ gap: 8, padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: 8 }}><Info size={15} color="var(--status-info)" />{i.owner} owns this incident. They set the actions and close it. You can add anything you learn.</div>
      <dl className="kv">
        <dt>Type</dt><dd>{i.category}</dd>
        <dt>Client</dt><dd>{i.client}</dd>
        {i.caregiver && <><dt>Caregiver</dt><dd>{i.caregiver}</dd></>}
        <dt>Happened</dt><dd>{fmtDate(i.date, { weekday: 'long', day: 'numeric', month: 'long' })}</dd>
        <dt>Reported by</dt><dd>{i.reportedBy}</dd>
        <dt>Owner</dt><dd>{i.owner}</dd>
        <dt>Target date</dt><dd>{fmtDate(i.due, { day: 'numeric', month: 'long' })}</dd>
      </dl>
      <div className="divider" />
      <div><div className="t-h3" style={{ marginBottom: 12 }}>Notes and actions</div>
        {i.notes.length === 0 ? <div className="t-small t-muted">No notes yet.</div> : <div className="timeline">{i.notes.map((n, k) => (
          <div key={k} className="timeline-item"><Avatar name={n.by} size="sm" /><div><div className="t-small">{n.text}</div><div className="t-caption t-muted row" style={{ gap: 4 }}><Clock size={11} />{n.by} · {n.at}</div></div></div>))}</div>}</div>
      {act === 'note' && <TextModal title="Add a note" label="Note" confirm="Add note" onClose={() => setAct(null)} onSave={t => { upd(t); s.toast(`Note added. ${i.owner} can see it.`); setAct(null) }} />}
    </Drawer>
  )
}

function TextModal({ title, sub, label, confirm, onClose, onSave }: { title: string; sub?: string; label: string; confirm: string; onClose: () => void; onSave: (t: string) => void }) {
  const [t, setT] = useState(''); const [tried, setTried] = useState(false); const bad = t.trim().length < 5
  return <Modal title={title} sub={sub} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => { setTried(true); if (!bad) onSave(t.trim()) }}>{confirm}</Button></>}>
    <Field label={label} required error={tried && bad ? 'Please write at least a few words.' : undefined}><Textarea autoFocus value={t} onChange={e => setT(e.target.value)} error={tried && bad} /></Field>
  </Modal>
}

function ReportModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const s = useStore()
  const cats = s.lists.incidents.filter(x => x.active)
  const clients = s.clients.filter(c => c.status !== 'Discharged' && s.inBranch(c.branch))
  const owner = s.users.find(u => u.role === 'Care Supervisor' && u.status === 'Active')?.name ?? 'Care Supervisor'
  const cgs = s.caregivers.filter(g => s.inBranch(g.branch))
  const [f, setF] = useState({ title: '', category: cats[0]?.name ?? '', severity: 'Medium' as Incident['severity'], client: clients[0]?.id ?? '', caregiver: '', date: TODAY, text: '' })
  const [tried, setTried] = useState(false)
  const errs = { title: !f.title.trim(), text: f.text.trim().length < 10 }
  const save = () => {
    setTried(true); if (errs.title || errs.text) return
    const c = s.clients.find(x => x.id === f.client)!
    const id = 'INC-' + (Math.max(...s.incidents.map(x => Number(x.id.slice(4)) || 0)) + 1)
    s.setIncidents(x => [{ id, title: f.title.trim(), category: f.category, severity: f.severity, client: c.name, caregiver: f.caregiver || undefined, reportedBy: s.me.name, date: f.date, owner, due: addDays(f.severity === 'High' ? 1 : 3), status: 'Reported', branch: c.branch, sensitive: f.category === 'Safeguarding concern', notes: [{ by: s.me.name, at: stamp(), text: f.text.trim() }] }, ...x])
    s.log({ type: 'Incident', action: 'Reported an incident', record: `${id} ${f.title.trim()}`, after: `${f.severity} · owner ${owner}` })
    s.toast(`Incident ${id} reported. ${owner} has been told.`); onDone(id)
  }
  return (
    <Modal wide title="Report an incident" sub="Write what happened in plain words. You can add more notes later." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Report incident</Button></>}>
      <Field label="Short title" required error={tried && errs.title ? 'Please add a short title.' : undefined}><Input autoFocus value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="For example: Client felt dizzy during visit" error={tried && errs.title} /></Field>
      <div className="grid g-3">
        <Field label="Type" required><Select value={f.category} onChange={e => setF({ ...f, category: e.target.value })} options={cats.map(c => c.name)} /></Field>
        <Field label="Severity" required><Select value={f.severity} onChange={e => setF({ ...f, severity: e.target.value as Incident['severity'] })} options={['Low', 'Medium', 'High']} /></Field>
        <Field label="When did it happen?" required><Input type="date" max={TODAY} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
      </div>
      <div className="grid g-2">
        <Field label="Client" required><Select value={f.client} onChange={e => setF({ ...f, client: e.target.value })} options={clients.map(c => ({ value: c.id, label: c.name }))} /></Field>
        <Field label="Caregiver involved" helper="Optional."><Select value={f.caregiver} onChange={e => setF({ ...f, caregiver: e.target.value })} options={[{ value: '', label: 'None' }, ...cgs.map(g => ({ value: g.name, label: g.name }))]} /></Field>
      </div>
      <Field label="What happened?" required error={tried && errs.text ? 'Please describe what happened (a sentence or two).' : undefined}><Textarea value={f.text} onChange={e => setF({ ...f, text: e.target.value })} error={tried && errs.text} /></Field>
      {f.severity === 'High' && <AlertBanner tone="warning" title="High severity"><span className="row" style={{ gap: 6 }}><TriangleAlert size={14} />If someone is in danger, call 911 first.</span></AlertBanner>}
      <div className="hint">It goes to {owner} (Care Supervisor), who reviews it and decides what happens next.</div>
      {f.category === 'Safeguarding concern' && <AlertBanner tone="info" title="This will be private">Only approved roles will be able to see it.</AlertBanner>}
    </Modal>
  )
}
