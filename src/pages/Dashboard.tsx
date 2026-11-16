import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, LifeBuoy, MessageSquare, UserPlus, TriangleAlert, Clock, FileText, PhoneCall, CheckCircle2, Home, Plus, ClipboardList,
} from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { TODAY, addDays } from '../data/seed'
import { coverQueue, liveState } from '../data/schedule'
import { STAGES, isOpen, ready, stageTone } from '../data/referrals'
import { onboarding, plansFor, reviewDue, reviewOverdue } from '../data/clients'
import { Button, CardHead, Chip, ChipTone, PageHead, StatTile } from '../components/ui'
import { NewReferralModal } from './Referrals'

const liveTone = (s: string): ChipTone => s === 'Done' ? 'success' : s === 'In progress' ? 'info' : s === 'Late' || s === 'No caregiver' ? 'danger' : s === 'Due soon' ? 'warning' : 'neutral'

export default function Dashboard() {
  const s = useStore()
  const nav = useNavigate()
  const [newRef, setNewRef] = useState(false)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const first = s.me.name.split(' ')[0]

  const today = s.visits.filter(v => s.inBranch(v.branch) && v.date === TODAY && v.status !== 'Cancelled').sort((a, b) => a.start.localeCompare(b.start))
  const late = today.filter(v => liveState(v) === 'Late')
  const cover = coverQueue(s.visits, s.caregivers, s.inBranch)
  const soon = cover.filter(c => c.visit.date <= addDays(2))
  const newReq = s.requests.filter(r => r.status === 'New' && s.inBranch(s.client(r.clientId)?.branch ?? ''))
  const myRefs = s.referrals.filter(r => s.inBranch(r.branch) && r.owner === s.me.name && isOpen(r))
  const followUps = myRefs.filter(r => r.contacts.some(c => c.followUp && c.followUp <= TODAY))
  const readyRefs = myRefs.filter(ready)
  const myClients = s.clients.filter(c => c.coordinator === s.me.name && c.status === 'Active')
  const plansBack = myClients.map(c => ({ c, p: plansFor(c.id, s.carePlans) })).filter(x => x.p.working?.status === 'Changes requested')
  const plansDraft = myClients.map(c => ({ c, p: plansFor(c.id, s.carePlans) })).filter(x => x.p.working?.status === 'Draft')
  const plansWaiting = myClients.map(c => ({ c, p: plansFor(c.id, s.carePlans) })).filter(x => x.p.working?.status === 'Awaiting review')
  const plansReview = myClients.map(c => ({ c, p: plansFor(c.id, s.carePlans) })).filter(x => !x.p.working && reviewDue(x.p.current))
  const setup = myClients.map(c => ({ c, steps: onboarding(c, s.carePlans, s.documents, s.visits) })).filter(x => x.steps.some(st => !st.done))

  type Q = { icon: typeof TriangleAlert; tone: ChipTone; title: string; sub: string; chip: string; action: string; to: string }
  const queue: Q[] = [
    ...late.map(v => ({ icon: Clock, tone: 'danger' as const, title: `${s.caregiver(v.caregiverId)?.name} hasn’t checked in at ${s.client(v.clientId)?.name}’s`, sub: `Visit started ${v.start}. Call the caregiver or find cover.`, chip: 'Late', action: 'Open', to: '/today' })),
    ...soon.filter(c => c.kind !== 'Late check-in').map(c => ({ icon: LifeBuoy, tone: 'danger' as const, title: `${c.kind}: ${s.client(c.visit.clientId)?.name}`, sub: `${c.visit.date === TODAY ? 'Today' : fmtDate(c.visit.date)} ${c.visit.start}–${c.visit.end} · ${c.detail}`, chip: c.visit.date === TODAY ? 'Today' : c.visit.date === addDays(1) ? 'Tomorrow' : 'In 2 days', action: 'Find cover', to: `/cover?visit=${c.visit.id}` })),
    ...newReq.map(r => ({ icon: MessageSquare, tone: 'info' as const, title: `${r.from} asked: ${r.type.toLowerCase()}`, sub: `About ${s.client(r.clientId)?.name} · ${r.date === TODAY ? 'today' : fmtDate(r.date)} ${r.time}`, chip: 'New', action: 'Reply', to: `/requests?open=${r.id}` })),
    ...plansBack.map(({ c }) => ({ icon: FileText, tone: 'warning' as const, title: `Care plan sent back: ${c.name}`, sub: 'The Care Supervisor asked for changes.', chip: 'Changes requested', action: 'Fix plan', to: `/clients/${c.id}?tab=plan` })),
    ...followUps.map(r => ({ icon: PhoneCall, tone: 'warning' as const, title: `Follow up with ${r.name}`, sub: `Referral ${r.id} · ${r.stage}`, chip: 'Call back due', action: 'Open', to: `/referrals/${r.id}` })),
    ...setup.map(({ c, steps }) => ({ icon: Home, tone: 'warning' as const, title: `Finish setting up ${c.name}`, sub: `Still to do: ${steps.filter(x => !x.done).map(x => x.label.toLowerCase()).join(', ')}`, chip: `${steps.filter(x => x.done).length} of ${steps.length} done`, action: 'Continue', to: `/clients/${c.id}` })),
  ]

  return (
    <>
      <PageHead title="My work" crumb="My work" actions={<>
        <Button variant="secondary" icon={Plus} onClick={() => nav('/schedule?new=1')}>Plan a visit</Button>
        <Button icon={UserPlus} onClick={() => setNewRef(true)}>New referral</Button>
      </>} />

      <section className="hero">
        <div className="t-display" style={{ fontSize: 24 }}>{greet}, {first}</div>
        <div style={{ opacity: .92, marginTop: 4 }}>Here is what needs you today in {s.branchName(s.me.branch)}.</div>
        {late.length > 0 ? <button className="hero-note" onClick={() => nav('/today')}><TriangleAlert size={15} />{late.length} caregiver{late.length > 1 ? 's have' : ' has'} not checked in yet.</button>
          : soon.length > 0 ? <button className="hero-note" onClick={() => nav('/cover')}><TriangleAlert size={15} />{soon.length} visit{soon.length > 1 ? 's' : ''} in the next 2 days need{soon.length > 1 ? '' : 's'} cover.</button>
            : <span className="hero-note"><CheckCircle2 size={15} />Every visit for the next 2 days is covered.</span>}
        <img src="./images/corliva-symbol-light.svg" alt="" aria-hidden />
      </section>

      <div className="grid g-4">
        <StatTile icon={CalendarDays} tone="info" label="Visits today" value={today.length} foot={`${today.filter(v => liveState(v) === 'Done').length} done · ${today.filter(v => liveState(v) === 'In progress').length} in progress`} chip={late.length ? { tone: 'danger', text: `${late.length} late` } : { tone: 'success', text: 'On track' }} onClick={() => nav('/today')} />
        <StatTile icon={LifeBuoy} tone="danger" label="Cover needed" value={cover.length} foot="Upcoming visits to sort out" chip={cover.length ? { tone: 'danger', text: 'Action needed' } : { tone: 'success', text: 'All covered' }} onClick={() => nav('/cover')} />
        <StatTile icon={MessageSquare} tone="warning" label="New family requests" value={newReq.length} foot={`${s.requests.filter(r => r.status === 'Waiting for family').length} waiting for the family`} chip={newReq.length ? { tone: 'warning', text: 'Reply' } : { tone: 'success', text: 'All answered' }} onClick={() => nav('/requests')} />
        <StatTile icon={UserPlus} tone="success" label="My open referrals" value={myRefs.length} foot={`${followUps.length} call back due · ${readyRefs.length} ready to move on`} onClick={() => nav('/referrals?owner=me')} />
      </div>

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Needs you now" sub="Most urgent first. Each item stays here until it’s sorted." />
            <div className="card-body">
              {queue.length === 0 ? <div className="row t-small" style={{ gap: 8 }}><CheckCircle2 size={16} color="var(--status-success)" />You’re all caught up.</div> : queue.slice(0, 8).map((q, i) => (
                <div key={i} className="list-row">
                  <div className={`stat-icon tone-${q.tone}`} style={{ width: 34, height: 34 }}><q.icon size={16} /></div>
                  <div className="grow"><div className="t-medium">{q.title}</div><div className="t-caption t-muted">{q.sub}</div></div>
                  <Chip tone={q.tone}>{q.chip}</Chip>
                  <Button size="sm" onClick={() => nav(q.to)}>{q.action}</Button>
                </div>))}
              {queue.length > 8 && <div className="hint mt-2">{queue.length - 8} more — see Cover needed, Family requests and Referrals.</div>}
            </div>
          </div>

          <div className="card">
            <CardHead title="Today’s visits" action={<button className="link-btn" onClick={() => nav('/today')}>Open Today’s visits</button>} />
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Time</th><th>Client</th><th>Caregiver</th><th>Service</th><th>Right now</th></tr></thead>
              <tbody>{today.map(v => { const st = liveState(v); return (
                <tr key={v.id} className="clickable" onClick={() => nav(`/schedule?visit=${v.id}`)}>
                  <td>{v.start}–{v.end}</td><td className="t-medium">{s.client(v.clientId)?.name}</td>
                  <td>{s.caregiver(v.caregiverId)?.name ?? <span style={{ color: 'var(--status-danger)' }}>None yet</span>}</td><td>{v.service}</td>
                  <td><Chip tone={liveTone(st)}>{st}</Chip>{v.checkIn && <span className="t-caption t-muted"> in {v.checkIn}{v.checkOut ? ` · out ${v.checkOut}` : ''}</span>}</td>
                </tr>) })}
                {today.length === 0 && <tr><td colSpan={5} className="t-muted">No visits today.</td></tr>}</tbody>
            </table></div>
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="My referrals" action={<button className="link-btn" onClick={() => nav('/referrals?owner=me')}>Open referrals</button>} />
            <div className="card-body col" style={{ gap: 8 }}>
              {STAGES.slice(0, 4).map(st => { const n = myRefs.filter(r => r.stage === st).length; return (
                <button key={st} className="row between link-btn" style={{ color: 'var(--text-primary)', fontWeight: 400, padding: '6px 0' }} onClick={() => nav(`/referrals?stage=${st}&owner=me`)}>
                  <Chip tone={stageTone(st)}>{st}</Chip><b>{n}</b>
                </button>) })}
            </div>
          </div>
          <div className="card">
            <CardHead title="Care plans" sub="Drafted by you, approved by the Care Supervisor." />
            <div className="card-body col" style={{ gap: 10 }}>
              {[...plansBack.map(x => ({ ...x, chip: 'Changes requested', tone: 'warning' as ChipTone })), ...plansDraft.map(x => ({ ...x, chip: 'Draft — not sent', tone: 'neutral' as ChipTone })), ...plansWaiting.map(x => ({ ...x, chip: 'Waiting for Supervisor', tone: 'info' as ChipTone })), ...plansReview.map(x => ({ ...x, chip: reviewOverdue(x.p.current) ? 'Review overdue' : 'Review due soon', tone: (reviewOverdue(x.p.current) ? 'danger' : 'warning') as ChipTone }))].map(x => (
                <button key={x.c.id + x.chip} className="list-row" style={{ marginTop: 0, textAlign: 'left', width: '100%' }} onClick={() => nav(`/clients/${x.c.id}?tab=plan`)}>
                  <ClipboardList size={16} color="var(--text-muted)" /><span className="grow t-small t-medium">{x.c.name}</span><Chip tone={x.tone}>{x.chip}</Chip>
                </button>))}
              {plansBack.length + plansDraft.length + plansWaiting.length + plansReview.length === 0 && <div className="t-small t-muted">Nothing to do on care plans.</div>}
            </div>
          </div>
          <div className="card">
            <CardHead title="Coming up" />
            <div className="card-body col" style={{ gap: 8 }}>
              {s.events.filter(e => e.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4).map(e => (
                <div key={e.id} className="event" style={{ borderLeftColor: `var(--status-${e.tone})` }}><div className="t-medium">{e.title}</div><div className="t-caption t-muted">{fmtDate(e.date)} · {e.time} · {e.note}</div></div>))}
              {s.referrals.filter(r => s.inBranch(r.branch) && r.assessment.status === 'Booked' && r.assessment.date >= TODAY && !s.events.some(e => e.id === 'as-' + r.id)).map(r => (
                <button key={r.id} className="event" style={{ borderLeftColor: 'var(--status-info)', textAlign: 'left', border: 0, borderLeft: '3px solid var(--status-info)' }} onClick={() => nav(`/referrals/${r.id}`)}><div className="t-medium">Home assessment: {r.name}</div><div className="t-caption t-muted">{fmtDate(r.assessment.date)} · {r.assessment.time} · {r.assessment.assessor}</div></button>))}
              {s.events.filter(e => e.date >= TODAY).length === 0 && !s.referrals.some(r => s.inBranch(r.branch) && r.assessment.status === 'Booked' && r.assessment.date >= TODAY) && <div className="t-small t-muted">No assessments booked.</div>}
            </div>
          </div>
        </div>
      </div>
      {newRef && <NewReferralModal onClose={() => setNewRef(false)} />}
    </>
  )
}
