import { useMemo, useState } from 'react'
import { Ban, TriangleAlert, CheckCircle2, CalendarPlus, Repeat, Info } from 'lucide-react'
import { useStore, fmtDate, hoursBetween } from '../data/store'
import { Caregiver, TODAY, Visit, iso, nowHM } from '../data/seed'
import { DAY_NAMES, canSchedule, checkCaregiver, dayOfWeek } from '../data/schedule'
import { plansFor } from '../data/clients'
import { AlertBanner, Avatar, Button, Chip, Field, Input, Modal, Select, Textarea } from './ui'

const vno = (v: Visit) => '#' + v.id.slice(1)
const long = (d: string) => fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })

/** Pick a caregiver for one visit. Blocking problems stop the choice; warnings only remind. Coordinators can’t override. */
export function AssignModal({ v, onClose, onDone }: { v: Visit; onClose: () => void; onDone?: (g: Caregiver) => void }) {
  const s = useStore()
  const [pick, setPick] = useState<string | null>(null)
  const c = s.client(v.clientId)
  const options = useMemo(() => s.caregivers.filter(g => g.branch === v.branch && g.id !== v.caregiverId).map(g => ({ g, ck: checkCaregiver(g, v, s.visits) }))
    .sort((a, b) => a.ck.blocking.length - b.ck.blocking.length || b.ck.good.length - a.ck.good.length || a.ck.warnings.length - b.ck.warnings.length), [s.caregivers, s.visits, v])
  const chosen = options.find(o => o.g.id === pick)
  const supervisors = s.rules.overrideRoles.join(' or ')
  const save = () => {
    if (!chosen || chosen.ck.blocking.length) return
    const before = s.caregiver(v.caregiverId)?.name ?? 'No caregiver'
    s.setVisits(x => x.map(y => y.id === v.id ? { ...y, caregiverId: chosen.g.id, status: y.status === 'Unassigned' ? 'Scheduled' : y.status, review: undefined, coverNote: undefined } : y))
    s.log({ type: 'Schedule', action: v.caregiverId ? 'Changed caregiver' : 'Assigned a caregiver', record: `Visit ${vno(v)}`, before, after: chosen.g.name })
    s.toast(`${chosen.g.name} is on the visit. They and the family have been told.`)
    onDone?.(chosen.g); onClose()
  }
  return (
    <Modal wide title={v.caregiverId ? 'Change caregiver' : 'Choose a caregiver'} sub={`${c?.name} · ${long(v.date)} · ${v.start}–${v.end} · ${v.service}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!chosen || chosen.ck.blocking.length > 0} onClick={save}>Assign {chosen ? chosen.g.name.split(' ')[0] : ''}</Button></>}>
      <div className="col" style={{ gap: 8 }}>
        {options.map(({ g, ck }) => {
          const blocked = ck.blocking.length > 0
          return (
            <button key={g.id} type="button" className="list-row" aria-pressed={pick === g.id} onClick={() => setPick(g.id)} style={{ marginTop: 0, textAlign: 'left', alignItems: 'flex-start', opacity: blocked ? .75 : 1, borderColor: pick === g.id ? 'var(--border-focus)' : undefined, background: pick === g.id ? 'var(--bg-selected)' : '#fff' }}>
              <Avatar name={g.name} />
              <span className="grow col" style={{ gap: 3 }}>
                <span className="row wrap" style={{ gap: 8 }}><span className="t-medium">{g.name}</span><span className="t-caption t-muted">{g.type}</span></span>
                {ck.blocking.map(b => <span key={b} className="row t-caption" style={{ gap: 4, color: 'var(--status-danger)' }}><Ban size={12} />{b}</span>)}
                {!blocked && ck.warnings.map(w => <span key={w} className="row t-caption" style={{ gap: 4, color: 'var(--status-warning)' }}><TriangleAlert size={12} />{w}</span>)}
                {!blocked && ck.good.map(w => <span key={w} className="row t-caption" style={{ gap: 4, color: 'var(--status-success)' }}><CheckCircle2 size={12} />{w}</span>)}
              </span>
              <Chip tone={blocked ? 'danger' : ck.warnings.filter(w => !w.startsWith('Has not')).length ? 'warning' : 'success'}>{blocked ? 'Can’t assign' : ck.warnings.filter(w => !w.startsWith('Has not')).length ? 'Check first' : 'Good match'}</Chip>
            </button>)
        })}
        {options.length === 0 && <div className="t-small t-muted">No other caregivers in this branch.</div>}
      </div>
      {chosen && chosen.ck.blocking.length > 0 && <AlertBanner tone="danger" title={`${chosen.g.name} can’t be assigned`}>{chosen.ck.blocking.join('. ')}. Only a {supervisors} can make an exception — ask them if there’s truly no one else.</AlertBanner>}
      {chosen && !chosen.ck.blocking.length && chosen.ck.warnings.filter(w => !w.startsWith('Has not')).length > 0 && <AlertBanner tone="warning" title="You can assign, but please check:">{chosen.ck.warnings.filter(w => !w.startsWith('Has not')).join('. ')}.</AlertBanner>}
    </Modal>
  )
}

/** Cancel one visit, or this and all later repeats (finished visits are never changed). */
export function CancelModal({ v, onClose, onDone, presetReason, note: presetNote }: { v: Visit; onClose: () => void; onDone?: () => void; presetReason?: string; note?: string }) {
  const s = useStore()
  const reasons = s.lists.reasons.filter(r => r.active).map(r => r.name)
  const [reason, setReason] = useState(presetReason && reasons.includes(presetReason) ? presetReason : reasons[0] ?? '')
  const [scope, setScope] = useState<'one' | 'future'>('one')
  const [note, setNote] = useState(presetNote ?? '')
  const later = s.visits.filter(x => v.series && x.series === v.series && x.date >= v.date && ['Scheduled', 'Unassigned'].includes(x.status))
  const save = () => {
    const ids = scope === 'one' ? [v.id] : later.map(f => f.id)
    const why = reason + (note.trim() ? ` — ${note.trim()}` : '')
    s.setVisits(x => x.map(y => ids.includes(y.id) ? { ...y, status: 'Cancelled', cancelReason: why, review: undefined } : y))
    s.log({ type: 'Schedule', action: ids.length > 1 ? `Cancelled ${ids.length} visits` : 'Cancelled a visit', record: `Visit ${vno(v)}${ids.length > 1 ? ' and later repeats' : ''}`, reason: why })
    s.toast(ids.length > 1 ? `${ids.length} visits cancelled. Caregiver and family are told.` : 'Visit cancelled. Caregiver and family are told.')
    onDone?.(); onClose()
  }
  return (
    <Modal title="Cancel this visit?" sub={`${s.client(v.clientId)?.name} · ${long(v.date)} · ${v.start}–${v.end}. Finished visits are never changed.`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Keep visit</Button><Button variant="danger-solid" disabled={!reason} onClick={save}>Cancel visit</Button></>}>
      <Field label="Reason" required><Select value={reason} onChange={e => setReason(e.target.value)} options={reasons} /></Field>
      {later.length > 1 && <div className="field"><span className="label">Which visits?</span>
        <label className="check"><input type="radio" name="scope" checked={scope === 'one'} onChange={() => setScope('one')} />Just this one</label>
        <label className="check"><input type="radio" name="scope" checked={scope === 'future'} onChange={() => setScope('future')} />This and all later repeats ({later.length} visits)</label></div>}
      <Field label="Note" helper="Optional."><Textarea value={note} onChange={e => setNote(e.target.value)} /></Field>
    </Modal>
  )
}

/** Change the time of one visit, or this and all later repeats. The caregiver is re-checked for the new time. */
export function ChangeTimeModal({ v, onClose, onDone, preset }: { v: Visit; onClose: () => void; onDone?: (summary: string) => void; preset?: { start: string; end: string } }) {
  const s = useStore()
  const [date, setDate] = useState(v.date)
  const [start, setStart] = useState(preset?.start ?? v.start)
  const [end, setEnd] = useState(preset?.end ?? v.end)
  const [scope, setScope] = useState<'one' | 'future'>('one')
  const later = s.visits.filter(x => v.series && x.series === v.series && x.date >= v.date && ['Scheduled', 'Unassigned'].includes(x.status))
  const g = s.caregiver(v.caregiverId)
  const moved = { ...v, date, start, end }
  const ck = g ? checkCaregiver(g, moved, s.visits) : null
  const bad = end <= start
  const save = () => {
    if (bad) return
    const keep = !ck || ck.blocking.length === 0
    const ids = scope === 'one' ? [v.id] : later.map(x => x.id)
    s.setVisits(x => x.map(y => {
      if (!ids.includes(y.id)) return y
      const nv = { ...y, start, end, date: y.id === v.id ? date : y.date }
      return keep ? nv : { ...nv, caregiverId: null, status: 'Unassigned' as const }
    }))
    const summary = `${ids.length > 1 ? `${ids.length} visits` : 'Visit'} moved to ${scope === 'one' ? long(date) + ' ' : ''}${start}–${end}`
    s.log({ type: 'Schedule', action: 'Changed visit time', record: `Visit ${vno(v)}${ids.length > 1 ? ' and later repeats' : ''}`, before: `${v.start}–${v.end}`, after: `${start}–${end}` })
    s.toast(keep ? `${summary}. ${g ? g.name + ' and the' : 'The'} family have been told.` : `${summary}. ${g?.name} can’t do the new time, so it needs a caregiver.`, keep ? 'success' : 'warning')
    onDone?.(summary); onClose()
  }
  return (
    <Modal title="Change visit time" sub={`${s.client(v.clientId)?.name} · now ${long(v.date)} ${v.start}–${v.end}`} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={bad} onClick={save}>Save new time</Button></>}>
      <div className="grid g-3">
        <Field label="Date"><Input type="date" min={TODAY} value={date} disabled={scope === 'future'} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Start"><Input type="time" value={start} onChange={e => setStart(e.target.value)} /></Field>
        <Field label="End" error={bad ? 'End must be after start.' : undefined}><Input type="time" value={end} onChange={e => setEnd(e.target.value)} error={bad} /></Field>
      </div>
      {later.length > 1 && <div className="field"><span className="label">Which visits?</span>
        <label className="check"><input type="radio" name="tscope" checked={scope === 'one'} onChange={() => setScope('one')} />Just this one</label>
        <label className="check"><input type="radio" name="tscope" checked={scope === 'future'} onChange={() => { setScope('future'); setDate(v.date) }} />This and all later repeats ({later.length} visits) — same days, new time</label></div>}
      {g && ck && (ck.blocking.length ? <AlertBanner tone="warning" title={`${g.name} can’t do the new time`}>{ck.blocking.join('. ')}. The visit will need a new caregiver — it will show in Cover needed.</AlertBanner>
        : <AlertBanner tone="success" title={`${g.name} can still do it`}>{ck.warnings.filter(w => !w.startsWith('Has not')).join('. ') || 'No clashes.'}</AlertBanner>)}
    </Modal>
  )
}

/** Plan one-off or repeating visits (BRD SCH-01, SCH-02). Only clients with an approved care plan. */
export function NewVisitsModal({ onClose, preset, onCreated }: { onClose: () => void; preset?: { clientId?: string; date?: string; start?: string; end?: string; service?: string; note?: string }; onCreated?: (summary: string) => void }) {
  const s = useStore()
  const eligible = s.clients.filter(c => s.inBranch(c.branch) && c.status === 'Active')
  const [clientId, setClientId] = useState(preset?.clientId ?? eligible.find(c => canSchedule(c, s.carePlans).ok)?.id ?? '')
  const client = s.client(clientId)
  const plan = plansFor(clientId, s.carePlans).current
  const sch = canSchedule(client, s.carePlans)
  const [service, setService] = useState(preset?.service ?? plan?.services[0] ?? '')
  const [date, setDate] = useState(preset?.date ?? TODAY)
  const [start, setStart] = useState(preset?.start ?? '09:00')
  const [end, setEnd] = useState(preset?.end ?? '11:00')
  const [repeat, setRepeat] = useState(false)
  const [days, setDays] = useState<number[]>([dayOfWeek(preset?.date ?? TODAY)])
  const [until, setUntil] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 27); return iso(d) })
  const [gid, setGid] = useState('')
  const [tried, setTried] = useState(false)
  const services = plan?.services ?? []

  const dates = useMemo(() => {
    if (!repeat) return [date]
    const out: string[] = []; const [y, m, d] = date.split('-').map(Number); const cur = new Date(y, m - 1, d)
    while (iso(cur) <= until && out.length < 120) { if (days.includes(cur.getDay())) out.push(iso(cur)); cur.setDate(cur.getDate() + 1) }
    return out
  }, [repeat, date, until, days])
  const draft = dates.map((dt, i) => ({ id: 'new' + i, clientId, date: dt, start, end, service }))
  const g = s.caregiver(gid)
  const checks = g ? draft.map(v => checkCaregiver(g, v, s.visits)) : []
  const blockedCount = checks.filter(c => c.blocking.length).length
  const cgOptions = s.caregivers.filter(x => x.branch === client?.branch).map(x => {
    const cs = draft.map(v => checkCaregiver(x, v, s.visits)); const blk = cs.filter(c => c.blocking.length).length
    return { value: x.id, label: `${x.name} — ${blk === 0 ? 'free for all' : blk === draft.length ? 'can’t do these' : `can’t do ${blk} of ${draft.length}`}` }
  })
  const errs = { client: !sch.ok, service: !service, time: end <= start, dates: dates.length === 0, past: date < TODAY, gone: dates[0] === TODAY && start < nowHM() }
  const hasErr = Object.values(errs).some(Boolean)
  const save = () => {
    setTried(true); if (hasErr) return
    const series = repeat ? 's-' + Date.now() : undefined
    let n = Math.max(...s.visits.map(v => Number(v.id.slice(1)) || 0))
    const created: Visit[] = draft.map((v, i) => {
      const ok = g && !checks[i].blocking.length
      return { id: 'v' + (++n), clientId, caregiverId: ok ? g!.id : null, date: v.date, start, end, branch: client!.branch, service, status: ok ? 'Scheduled' : 'Unassigned', series }
    })
    s.setVisits(x => [...x, ...created])
    s.clientNote(clientId, `${created.length} visit${created.length > 1 ? 's' : ''} planned (${service}, ${start}–${end}${repeat ? `, every ${days.sort().map(d => DAY_NAMES[d]).join(', ')} until ${long(until)}` : `, ${long(date)}`}).`)
    s.log({ type: 'Schedule', action: `Planned ${created.length} visit${created.length > 1 ? 's' : ''}`, record: client!.name, after: g ? `${created.filter(c => c.caregiverId).length} with ${g.name}` : 'No caregiver yet' })
    const open = created.filter(c => !c.caregiverId).length
    onCreated?.(`${created.length} visit${created.length > 1 ? 's' : ''} planned: ${created.map(c => `${long(c.date)} ${start}–${end}`).slice(0, 3).join(', ')}${created.length > 3 ? '…' : ''}${g ? ` with ${g.name}` : ''}`)
    s.toast(open ? `${created.length} visit${created.length > 1 ? 's' : ''} planned. ${open} still need${open > 1 ? '' : 's'} a caregiver — see Cover needed.` : `${created.length} visit${created.length > 1 ? 's' : ''} planned with ${g!.name}.`, open ? 'warning' : 'success')
    onClose()
  }
  const hrs = end > start ? hoursBetween(start, end) : 0
  return (
    <Modal wide title="Plan visits" sub="One visit, or a repeating pattern. Visits follow the client’s approved care plan." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={CalendarPlus} onClick={save}>Plan {dates.length || ''} visit{dates.length === 1 ? '' : 's'}</Button></>}>
      {preset?.note && <AlertBanner tone="info" title="From a family request">{preset.note}</AlertBanner>}
      <div className="grid g-2">
        <Field label="Client" required><Select value={clientId} onChange={e => { setClientId(e.target.value); const p = plansFor(e.target.value, s.carePlans).current; setService(p?.services[0] ?? ''); setGid('') }} options={eligible.map(c => ({ value: c.id, label: canSchedule(c, s.carePlans).ok ? c.name : `${c.name} — no approved care plan` }))} /></Field>
        <Field label="Service" required helper={plan ? `From care plan version ${plan.version}` : undefined}><Select value={service} onChange={e => setService(e.target.value)} options={services.length ? services : [{ value: '', label: 'No services' }]} disabled={!sch.ok} /></Field>
      </div>
      {!sch.ok && <AlertBanner tone="danger" title="Visits can’t be planned for this client">{sch.why}</AlertBanner>}
      <div className="grid g-3">
        <Field label={repeat ? 'Starting from' : 'Date'} required error={tried && errs.past ? 'Pick today or later.' : undefined}><Input type="date" min={TODAY} value={date} onChange={e => { setDate(e.target.value); if (!repeat) setDays([dayOfWeek(e.target.value)]) }} /></Field>
        <Field label="Start" required error={tried && errs.gone ? 'That time has already passed today.' : undefined}><Input type="time" value={start} onChange={e => setStart(e.target.value)} error={tried && errs.gone} /></Field>
        <Field label="End" required error={errs.time ? 'End must be after start.' : undefined}><Input type="time" value={end} onChange={e => setEnd(e.target.value)} error={errs.time} /></Field>
      </div>
      <label className="check"><input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} /><Repeat size={15} />Repeat every week</label>
      {repeat && <div className="card card-pad col" style={{ gap: 12, background: 'var(--bg-subtle)' }}>
        <div className="field"><span className="label">On these days</span>
          <div className="row wrap" style={{ gap: 6 }}>{[1, 2, 3, 4, 5, 6, 0].map(d => { const on = days.includes(d); return <button key={d} type="button" aria-pressed={on} className="btn btn-sm" onClick={() => setDays(on ? days.filter(x => x !== d) : [...days, d])} style={{ minWidth: 52, border: `1px solid ${on ? 'var(--border-focus)' : 'var(--border-strong)'}`, background: on ? 'var(--bg-selected)' : '#fff', color: on ? 'var(--text-link)' : 'var(--text-primary)' }}>{DAY_NAMES[d]}</button> })}</div>
          {tried && errs.dates && <span className="helper error">Pick at least one day in the date range.</span>}</div>
        <div style={{ maxWidth: 220 }}><Field label="Until" required><Input type="date" min={date} value={until} onChange={e => setUntil(e.target.value)} /></Field></div>
      </div>}
      <div className="row t-small t-secondary" style={{ gap: 8 }}><Info size={15} color="var(--status-info)" />{dates.length} visit{dates.length === 1 ? '' : 's'} · {hrs} hour{hrs === 1 ? '' : 's'} each{plan?.hoursPerWeek ? ` · care plan allows ${plan.hoursPerWeek} hours a week` : ''}</div>
      <Field label="Caregiver" helper="Optional. Visits the caregiver can’t do stay open and appear in Cover needed."><Select value={gid} onChange={e => setGid(e.target.value)} options={[{ value: '', label: 'Leave without a caregiver for now' }, ...cgOptions]} disabled={!sch.ok} /></Field>
      {g && blockedCount > 0 && <AlertBanner tone="warning" title={`${g.name} can’t do ${blockedCount} of ${draft.length} visit${draft.length > 1 ? 's' : ''}`}>{Array.from(new Set(checks.flatMap(c => c.blocking))).slice(0, 3).join('. ')}. Those will be planned without a caregiver.</AlertBanner>}
      {g && blockedCount === 0 && checks.some(c => c.warnings.some(w => !w.startsWith('Has not'))) && <AlertBanner tone="warning" title="You can assign, but please check:">{Array.from(new Set(checks.flatMap(c => c.warnings.filter(w => !w.startsWith('Has not'))))).slice(0, 3).join('. ')}.</AlertBanner>}
    </Modal>
  )
}
