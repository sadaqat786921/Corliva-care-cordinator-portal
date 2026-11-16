import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, LayoutGrid, List, UserRound, TriangleAlert, CheckCircle2, PhoneCall, UserPlus, PauseCircle, Phone } from 'lucide-react'
import { useStore, fmtDate, stampNow } from '../data/store'
import { Referral, Stage, TODAY } from '../data/seed'
import { nowTime } from '../data/referrals'
import { STAGES, blockers, daysInStage, isOpen, ready, stageTone, urgTone } from '../data/referrals'
import { AlertBanner, Button, Chip, EmptyState, Field, Input, Modal, PageHead, Select, Textarea } from '../components/ui'

const lastContact = (r: Referral) => [...r.contacts].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0]
const dueFollowUp = (r: Referral) => isOpen(r) && r.contacts.some(c => c.followUp && c.followUp <= TODAY)

export default function Referrals() {
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<'board' | 'list'>('board')
  const [q, setQ] = useState('')
  const [owner, setOwner] = useState(params.get('owner') === 'me' ? s.me.name : 'All owners')
  const [creating, setCreating] = useState(false)
  const [stage, setStage] = useState(params.get('stage') ?? 'All stages')
  useEffect(() => { const st = params.get('stage'); if (st) setStage(st); if (params.get('owner') === 'me') setOwner(s.me.name) }, [params])

  const rows = useMemo(() => s.referrals.filter(r => s.inBranch(r.branch) &&
    (owner === 'All owners' || r.owner === owner) &&
    (stage === 'All stages' || r.stage === stage) &&
    (!q.trim() || (r.name + r.id + r.source).toLowerCase().includes(q.trim().toLowerCase()))), [s.referrals, owner, stage, q])
  const owners = ['All owners', ...Array.from(new Set(s.referrals.filter(r => s.inBranch(r.branch)).map(r => r.owner)))]
  const stuck = rows.filter(r => isOpen(r) && daysInStage(r) > 3).length
  const follow = rows.filter(dueFollowUp).length
  const open = (r: Referral) => nav(`/referrals/${r.id}`)

  // Old links like /referrals?open=R-1042 go straight to the referral's screen
  const legacy = params.get('open')
  if (legacy) return <Navigate to={`/referrals/${legacy}`} replace />

  const Card = ({ r }: { r: Referral }) => {
    const b = blockers(r); const lc = lastContact(r)
    return (
      <button className="lane-card" onClick={() => open(r)}>
        <span className="row between"><span className="t-medium">{r.name}</span><Chip tone={urgTone(r.urgency)}>{r.urgency}</Chip></span>
        <span className="t-caption t-muted">{r.id} · {r.services.join(', ')}</span>
        {r.hold && <span className="row t-caption" style={{ gap: 6, color: 'var(--status-warning)' }}><PauseCircle size={12} />On hold until {fmtDate(r.hold.until, { day: 'numeric', month: 'short' })}</span>}
        <span className="row between t-caption"><span className="row" style={{ gap: 6, color: r.owner === 'Unassigned' ? 'var(--status-danger)' : undefined }}><UserRound size={12} />{r.owner === 'Unassigned' ? 'No owner' : r.owner}</span>
          {isOpen(r) && <span className={daysInStage(r) > 3 ? 't-strong' : 't-muted'} style={{ color: daysInStage(r) > 3 ? 'var(--status-warning)' : undefined }}>{daysInStage(r) === 0 ? 'Today' : `${daysInStage(r)}d in stage`}</span>}</span>
        {lc && <span className="row t-caption t-muted" style={{ gap: 6 }}><PhoneCall size={12} />Last contact {fmtDate(lc.date, { day: 'numeric', month: 'short' })}: {lc.outcome.toLowerCase()}</span>}
        {isOpen(r) && !r.hold && (ready(r)
          ? <span className="row t-caption" style={{ gap: 6, color: 'var(--status-success)' }}><CheckCircle2 size={12} />Ready to move on</span>
          : <span className="row t-caption" style={{ gap: 6, color: 'var(--status-danger)' }}><TriangleAlert size={12} />Needs: {b.map(x => x.label.toLowerCase()).join(', ')}</span>)}
      </button>)
  }

  return (
    <>
      <PageHead title="Referrals" crumb="Referrals" sub={`New client enquiries for ${s.branchName(s.me.branch)}. Open one to record calls, checks and the assessment.`} actions={<Button icon={UserPlus} onClick={() => setCreating(true)}>New referral</Button>} />
      {(stuck > 0 || follow > 0) && <div className="grid g-2">
        {stuck > 0 && <AlertBanner tone="warning" title={`${stuck} referral${stuck > 1 ? 's have' : ' has'} not moved for over 3 days`} action={<Button size="sm" variant="secondary" onClick={() => setView('list')}>Show them</Button>} />}
        {follow > 0 && <AlertBanner tone="info" title={`${follow} follow-up call${follow > 1 ? 's are' : ' is'} due today or overdue`}>Open the referral to see who needs a call back.</AlertBanner>}
      </div>}
      <div className="card">
        <div className="toolbar">
          <div className="search"><Search /><input aria-label="Search referrals" placeholder="Search by name or number" value={q} onChange={e => setQ(e.target.value)} /></div>
          <select className="select-sm" aria-label="Filter by owner" value={owner} onChange={e => setOwner(e.target.value)}>{owners.map(o => <option key={o} value={o}>{o === s.me.name ? `Mine (${o})` : o}</option>)}</select>
          <select className="select-sm" aria-label="Filter by stage" value={stage} onChange={e => { setStage(e.target.value); setParams({}) }}>{['All stages', ...STAGES, 'Closed'].map(o => <option key={o}>{o}</option>)}</select>
          <span className="grow" />
          <div className="seg" role="group" aria-label="View">
            <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')} aria-pressed={view === 'board'}><LayoutGrid size={14} style={{ verticalAlign: -2 }} /> Board</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'}><List size={14} style={{ verticalAlign: -2 }} /> List</button>
          </div>
        </div>
        {rows.length === 0 ? <EmptyState icon={Search} tone="neutral" title="No referrals match" text="Try clearing the filters." action={<Button variant="secondary" onClick={() => { setQ(''); setOwner('All owners'); setStage('All stages') }}>Clear filters</Button>} />
          : view === 'board' ? (
            <div className="card-body pipeline">
              {(stage === 'Closed' ? [] : STAGES).filter(l => stage === 'All stages' || stage === l).map(l => {
                const list = rows.filter(r => r.stage === l)
                return (
                  <div key={l} className="lane">
                    <div className="row between"><Chip tone={stageTone(l)}>{l}</Chip><span className="t-caption t-muted">{list.length}</span></div>
                    {list.map(r => <Card key={r.id} r={r} />)}
                    {list.length === 0 && <div className="t-caption t-muted" style={{ textAlign: 'center', padding: 16 }}>Nothing here</div>}
                  </div>)
              })}
              {(stage === 'All stages' || stage === 'Closed') && rows.some(r => r.stage === 'Closed') && (
                <div className="lane" style={{ gridColumn: stage === 'Closed' ? 'span 1' : '1 / -1', minHeight: 0 }}>
                  <div className="row between"><Chip tone="neutral">Closed</Chip><span className="t-caption t-muted">{rows.filter(r => r.stage === 'Closed').length} · records kept</span></div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                    {rows.filter(r => r.stage === 'Closed').map(r => (
                      <button key={r.id} className="lane-card" onClick={() => open(r)}>
                        <span className="t-medium">{r.name}</span><span className="t-caption t-muted">{r.id} · closed at {r.closedAt}</span><span className="t-caption">{r.outcome}</span>
                      </button>))}
                  </div>
                </div>)}
            </div>
          ) : (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Person</th><th>Stage</th><th>Urgency</th><th>Owner</th><th>In stage</th><th>Last contact</th><th>Still needed</th></tr></thead>
              <tbody>{rows.slice().sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || daysInStage(b) - daysInStage(a)).map(r => {
                const lc = lastContact(r); const b = blockers(r)
                return (
                  <tr key={r.id} className="clickable" onClick={() => open(r)}>
                    <td><div className="t-medium">{r.name}</div><div className="t-caption t-muted">{r.id} · {r.source}</div></td>
                    <td><Chip tone={stageTone(r.stage as Stage)}>{r.stage}</Chip>{r.hold && <div className="t-caption" style={{ color: 'var(--status-warning)' }}>On hold</div>}</td><td><Chip tone={urgTone(r.urgency)}>{r.urgency}</Chip></td>
                    <td style={{ color: r.owner === 'Unassigned' ? 'var(--status-danger)' : undefined }}>{r.owner === 'Unassigned' ? 'No owner' : r.owner}</td>
                    <td style={{ color: isOpen(r) && daysInStage(r) > 3 ? 'var(--status-warning)' : undefined, fontWeight: isOpen(r) && daysInStage(r) > 3 ? 600 : 400 }}>{isOpen(r) ? (daysInStage(r) === 0 ? 'Today' : `${daysInStage(r)} days`) : '—'}</td>
                    <td>{lc ? <><div>{fmtDate(lc.date, { day: 'numeric', month: 'short' })} · {lc.type}</div><div className="t-caption t-muted">{lc.outcome}</div></> : <span className="t-muted">None yet</span>}</td>
                    <td>{!isOpen(r) ? <span className="t-muted">{r.stage === 'Closed' ? r.outcome?.split(':')[0] : 'Now a client'}</span> : b.length ? <span style={{ color: 'var(--status-danger)' }}>{b.map(x => x.label).join(', ')}</span> : <span style={{ color: 'var(--status-success)' }}>Ready to move on</span>}</td>
                  </tr>)
              })}</tbody>
            </table></div>
          )}
      </div>
      {creating && <NewReferralModal onClose={() => setCreating(false)} />}
    </>
  )
}

/** Create a referral. Checks for possible duplicates first (BRD User Flow 1, step 2). */
export function NewReferralModal({ onClose }: { onClose: () => void }) {
  const s = useStore()
  const nav = useNavigate()
  const services = s.lists.services.filter(x => x.active).map(x => x.name)
  const sources = s.lists.sources.filter(x => x.active).map(x => x.name)
  const [f, setF] = useState({ name: '', dob: '', phone: '', contact: '', relationship: '', contactPhone: '', source: sources[0] ?? '', services: [] as string[], urgency: 'Routine' as Referral['urgency'], reason: '' })
  const [tried, setTried] = useState(false)
  const [okDupe, setOkDupe] = useState(false)
  const norm = (x: string) => x.replace(/\D/g, '')
  const dupes = f.name.trim().length < 3 && norm(f.phone).length < 7 ? [] : [
    ...s.clients.filter(c => (f.name.trim().length >= 3 && c.name.toLowerCase() === f.name.trim().toLowerCase()) || (norm(f.phone).length >= 7 && norm(c.phone) === norm(f.phone))).map(c => ({ label: `Client: ${c.name}`, sub: `${s.branchName(c.branch)} · ${c.status} · ${c.phone}` })),
    ...s.referrals.filter(r => (f.name.trim().length >= 3 && r.name.toLowerCase() === f.name.trim().toLowerCase()) || (norm(f.phone).length >= 7 && norm(r.phone) === norm(f.phone))).map(r => ({ label: `Referral ${r.id}: ${r.name}`, sub: `${r.stage} · owner ${r.owner}` })),
  ]
  const errs = { name: !f.name.trim(), phone: !f.phone.trim() && !f.contactPhone.trim(), services: f.services.length === 0 }
  const save = () => {
    setTried(true)
    if (errs.name || errs.phone || errs.services || (dupes.length && !okDupe)) return
    const n = Math.max(...s.referrals.map(r => Number(r.id.slice(2)) || 0)) + 1
    const id = 'R-' + n
    const r: Referral = {
      id, name: f.name.trim(), dob: f.dob, address: '', phone: f.phone.trim(), email: '', contact: f.contact.trim() || f.name.trim(), relationship: f.relationship.trim() || (f.contact.trim() ? '' : 'Self'), contactPhone: f.contactPhone.trim() || f.phone.trim(),
      source: f.source, services: f.services, urgency: f.urgency, preferredTimes: '', reasonForCare: f.reason.trim(), owner: s.me.name, stage: 'Enquiry', branch: s.me.branch,
      stageLog: [{ stage: 'Enquiry', date: TODAY, time: nowTime(), by: s.me.name }],
      qualification: { area: false, service: false, times: false, funding: '', notes: '' },
      assessment: { status: 'Not booked', date: '', time: '', assessor: '', where: 'Client’s home', needs: '', risks: '', mobility: '', hours: null, recommended: '', notes: '' },
      decision: { agreementSigned: false, startDate: '' }, contacts: [], history: [{ by: s.me.name, at: stampNow(), text: dupes.length ? 'Referral created. Possible duplicate checked — different person.' : 'Referral created.' }],
    }
    s.setReferrals(x => [r, ...x])
    s.log({ type: 'Referral', action: 'Created a referral', record: `${id} ${r.name}` })
    s.toast(`Referral ${id} created. Next: log your first contact.`); onClose(); nav(`/referrals/${id}`)
  }
  return (
    <Modal wide title="New referral" sub="Start with the basics. You can add the rest on the referral’s screen." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={UserPlus} onClick={save}>Create referral</Button></>}>
      <div className="grid g-3">
        <Field label="Person’s full name" required error={tried && errs.name ? 'Please enter their name.' : undefined}><Input autoFocus value={f.name} onChange={e => { setF({ ...f, name: e.target.value }); setOkDupe(false) }} error={tried && errs.name} /></Field>
        <Field label="Date of birth"><Input type="date" max={TODAY} value={f.dob} onChange={e => setF({ ...f, dob: e.target.value })} /></Field>
        <Field label="Their phone" required={!f.contactPhone} error={tried && errs.phone ? 'Add their phone or a contact’s phone.' : undefined}><Input icon={Phone} value={f.phone} onChange={e => { setF({ ...f, phone: e.target.value }); setOkDupe(false) }} error={tried && errs.phone} /></Field>
        <Field label="Contact person" helper="If someone else got in touch."><Input value={f.contact} onChange={e => setF({ ...f, contact: e.target.value })} placeholder="e.g. Carol Bell" /></Field>
        <Field label="Relationship"><Input value={f.relationship} onChange={e => setF({ ...f, relationship: e.target.value })} placeholder="e.g. Daughter" /></Field>
        <Field label="Contact’s phone"><Input value={f.contactPhone} onChange={e => setF({ ...f, contactPhone: e.target.value })} /></Field>
        <Field label="Referred by"><Select value={f.source} onChange={e => setF({ ...f, source: e.target.value })} options={sources} /></Field>
        <Field label="Urgency"><Select value={f.urgency} onChange={e => setF({ ...f, urgency: e.target.value as Referral['urgency'] })} options={['Routine', 'Soon', 'Urgent']} /></Field>
        <Field label="Branch"><Input value={s.branchName(s.me.branch)} disabled /></Field>
      </div>
      <div className="field"><span className="label">Services needed <span className="req">*</span></span>
        <div className="row wrap" style={{ gap: 8 }}>{services.map(sv => { const on = f.services.includes(sv); return (
          <button key={sv} type="button" aria-pressed={on} className="chip nodot" onClick={() => setF({ ...f, services: on ? f.services.filter(x => x !== sv) : [...f.services, sv] })}
            style={{ height: 32, padding: '0 12px', cursor: 'pointer', border: `1px solid ${on ? 'var(--border-focus)' : tried && errs.services ? 'var(--status-danger)' : 'var(--border-strong)'}`, background: on ? 'var(--bg-selected)' : '#fff', color: on ? 'var(--text-link)' : 'var(--text-secondary)', fontSize: 13 }}>{on && <CheckCircle2 size={13} />}{sv}</button>) })}</div>
        {tried && errs.services && <span className="helper error">Pick at least one service.</span>}</div>
      <Field label="Why is care needed?"><Textarea value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></Field>
      {dupes.length > 0 && <>
        <AlertBanner tone="warning" title="This might already be in CORLIVA">{dupes.map(d => <div key={d.label}><b>{d.label}</b> — {d.sub}</div>)}</AlertBanner>
        <label className="check"><input type="checkbox" checked={okDupe} onChange={e => setOkDupe(e.target.checked)} />I’ve checked — this is a different person</label>
        {tried && !okDupe && <span className="helper error">Please check the possible duplicate first.</span>}
      </>}
      <div className="hint">You’ll be the owner. The referral starts at Enquiry.</div>
    </Modal>
  )
}
