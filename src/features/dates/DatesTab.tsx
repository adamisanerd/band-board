import { useState, type FormEvent } from 'react'
import { supabase, type Row } from '../../lib/supabase'
import { useBandRows } from '../../hooks/useBandRows'
import { dayParts, fmtTime, initials, todayStr } from '../../lib/format'
import { appUrl, groupSms } from '../../lib/sms'

type Member = Row<'members'>
type DateRow = Row<'dates'>
type Vote = Row<'votes'>['vote']
type Kind = DateRow['kind']

const KINDS: Kind[] = ['Rehearsal', 'Gig', 'Either']
const VOTE_LABEL: Record<Vote, string> = { yes: 'In', maybe: 'Maybe', no: 'Out' }

interface Props {
  bandId: string
  members: Member[]
  me: Member | undefined
}

export function DatesTab({ bandId, members, me }: Props) {
  const dates = useBandRows('dates', bandId)
  const votes = useBandRows('votes', bandId)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = todayStr()
  const upcoming = dates.rows
    .filter((d) => d.day >= today && !d.booked)
    .sort((a, b) => (a.day + (a.start_time ?? '')).localeCompare(b.day + (b.start_time ?? '')))

  // votesFor[dateId][memberId] = 'yes' | 'maybe' | 'no'
  const votesFor: Record<string, Record<string, Vote>> = {}
  for (const v of votes.rows) (votesFor[v.date_id] ??= {})[v.member_id] = v.vote

  const yesCount = (d: DateRow) => members.filter((m) => votesFor[d.id]?.[m.id] === 'yes').length
  const best = upcoming.reduce<DateRow | null>((top, d) => (yesCount(d) > 0 && (!top || yesCount(d) > yesCount(top)) ? d : top), null)

  async function vote(dateId: string, v: Vote) {
    if (!me) return
    const { error } = await supabase
      .from('votes')
      .upsert({ date_id: dateId, member_id: me.id, band_id: bandId, vote: v }, { onConflict: 'date_id,member_id' })
    setError(error ? "Your vote didn't save. Try again." : null)
    void votes.reload()
  }

  async function remove(dateId: string) {
    if (confirmId !== dateId) return setConfirmId(dateId)
    setConfirmId(null)
    const { error } = await supabase.from('dates').delete().eq('id', dateId)
    setError(error ? "That didn't delete. Try again." : null)
    void dates.reload()
  }

  const otherPhones = members.filter((m) => m.id !== me?.id).map((m) => m.phone)

  return (
    <>
      <ProposeForm bandId={bandId} me={me} onAdded={() => { void dates.reload(); void votes.reload() }} />
      {error && <div className="notice" role="alert">{error}</div>}
      {dates.loading ? (
        <p className="empty">Loading dates…</p>
      ) : !upcoming.length ? (
        <p className="empty">No dates on the table. Propose one and the band can vote.</p>
      ) : (
        upcoming.map((d) => {
          const p = dayParts(d.day)
          const c = yesCount(d)
          const everyone = members.length > 0 && c === members.length
          const mine = me ? votesFor[d.id]?.[me.id] : undefined
          const ask = `${d.kind === 'Either' ? 'Rehearsal or gig' : d.kind} ${p.short}${d.start_time ? ' at ' + fmtTime(d.start_time) : ''}${d.note ? ` (${d.note})` : ''}. Can you make it? Tap In or Out here: ${appUrl()}`
          return (
            <article className="date" key={d.id}>
              <div className="day">
                <div className="dow">{p.dow}</div>
                <div className="num">{p.num}</div>
                <div className="mon">{p.mon}</div>
              </div>
              <div>
                <div className="meta">
                  <b>{d.kind}</b>
                  {d.start_time && ` at ${fmtTime(d.start_time)}`}
                  {everyone ? <span className="tag all">Everyone's in</span> : best?.id === d.id && <span className="tag best">Best so far</span>}
                </div>
                {d.note && <div className="meta muted">{d.note}</div>}
                <div className="who-row">
                  {members.map((m) => {
                    const v = votesFor[d.id]?.[m.id]
                    return (
                      <span key={m.id} className={`who ${v ?? ''}`} title={`${m.name}: ${v ? VOTE_LABEL[v] : 'no answer'}`}>
                        {initials(m.name)}
                      </span>
                    )
                  })}
                </div>
                <div className="meta muted small">
                  {c} of {members.length} in
                </div>
                {me && (
                  <div className="vote" role="group" aria-label="Can you make it?">
                    {(['yes', 'maybe', 'no'] as const).map((v) => (
                      <button key={v} data-v={v} aria-pressed={mine === v} onClick={() => vote(d.id, v)}>
                        {VOTE_LABEL[v]}
                      </button>
                    ))}
                  </div>
                )}
                <div className="actions">
                  <a className="link" href={groupSms(ask, otherPhones)} target="_blank" rel="noopener">
                    Text the band
                  </a>
                  <button className="link warn" onClick={() => remove(d.id)}>
                    {confirmId === d.id ? 'Tap again to remove' : 'Remove'}
                  </button>
                </div>
              </div>
            </article>
          )
        })
      )}
    </>
  )
}

function ProposeForm({ bandId, me, onAdded }: { bandId: string; me: Member | undefined; onAdded: () => void }) {
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [kind, setKind] = useState<Kind>('Rehearsal')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!day) return setError('Pick a date first.')
    setBusy(true)
    const { data, error } = await supabase
      .from('dates')
      .insert({ band_id: bandId, day, start_time: time || null, kind, note: note.trim(), created_by: me?.id ?? null })
      .select('id')
      .single()
    // Whoever proposes a date is in for it.
    if (data && me) await supabase.from('votes').insert({ date_id: data.id, member_id: me.id, band_id: bandId, vote: 'yes' })
    setBusy(false)
    if (error) return setError("That didn't save. Check your connection and try again.")
    setError(null)
    setDay('')
    setTime('')
    setNote('')
    onAdded()
  }

  return (
    <form className="card" onSubmit={submit}>
      <div className="row">
        <label>
          Date
          <input type="date" value={day} min={todayStr()} onChange={(e) => setDay(e.target.value)} required />
        </label>
        <label>
          Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label>
          For
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Note
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Alex's garage, or the venue asking about us" />
      </label>
      {error && <div className="notice" role="alert">{error}</div>}
      <button className="btn" type="submit" disabled={busy}>
        Propose date
      </button>
    </form>
  )
}
