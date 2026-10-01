import { useState, type FormEvent } from 'react'
import { supabase, type Row } from '../../lib/supabase'
import { PAY_NAMES, payMethods, prefMethod, type PayMethod } from '../../lib/pay'

type Member = Row<'members'>
type Band = Row<'bands'>

interface Props {
  band: Band
  members: Member[]
  me: Member | undefined
  onChanged: () => void
}

export function BandTab({ band, members, me, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inviteUrl = `${window.location.origin}/join/${band.invite_code}`

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Couldn't copy. Press and hold the link to copy it instead.")
    }
  }

  async function remove(m: Member) {
    if (confirmId !== m.id) return setConfirmId(m.id)
    setConfirmId(null)
    const { error } = await supabase.from('members').delete().eq('id', m.id)
    setError(error ? "That didn't save. Try again." : null)
    onChanged()
  }

  const handles = (m: Member) => {
    const h = [m.venmo && `Venmo @${m.venmo}`, m.cashtag && `Cash App $${m.cashtag}`, m.phone && 'Apple Cash'].filter(Boolean).join(', ')
    const pm = prefMethod(m)
    return h ? h + (pm ? `. Prefers ${PAY_NAMES[pm]}` : '') : 'No pay info'
  }

  return (
    <>
      <div className="card">
        <b>Invite the band</b>
        <p className="total" style={{ marginTop: 2 }}>
          Send this link to your bandmates. They sign in with their email and tap their name.
        </p>
        <div className="invite">
          <input readOnly value={inviteUrl} onFocus={(e) => e.target.select()} aria-label="Invite link" />
          <button className="btn small" onClick={copyInvite}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="card">
        <b>Lineup</b>
        <ul className="members">
          {members.map((m) => (
            <li key={m.id}>
              <span>
                {m.name}
                {m.role && <small>{m.role}</small>}
                {m.id === me?.id && <small>(you)</small>}
                {!m.user_id && <small>(hasn't joined yet)</small>}
                <small className="block">{handles(m)}</small>
              </span>
              <span>
                <button className="link" onClick={() => setEditingId(editingId === m.id ? null : m.id)}>
                  Pay info
                </button>
                {m.id !== me?.id && (
                  <button className="link warn" onClick={() => remove(m)}>
                    {confirmId === m.id ? 'Tap again to remove' : 'Remove'}
                  </button>
                )}
              </span>
              {editingId === m.id && (
                <PayInfoForm
                  member={m}
                  onDone={() => {
                    setEditingId(null)
                    onChanged()
                  }}
                />
              )}
            </li>
          ))}
        </ul>
        <AddMemberForm bandId={band.id} onAdded={onChanged} />
        {error && <div className="notice" role="alert">{error}</div>}
      </div>
    </>
  )
}

function AddMemberForm({ bandId, onAdded }: { bandId: string; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return
    const { error } = await supabase.from('members').insert({ band_id: bandId, name: name.trim(), role: role.trim() })
    if (!error) {
      setName('')
      setRole('')
      onAdded()
    }
  }

  return (
    <form className="row" style={{ marginTop: 12, alignItems: 'flex-end' }} onSubmit={submit}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
      </label>
      <label>
        Role
        <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={60} placeholder="Keys, fiddle, sub drummer" />
      </label>
      <div style={{ flex: '0 0 auto', marginBottom: 8 }}>
        <button className="btn small" type="submit">
          Add
        </button>
      </div>
    </form>
  )
}

const clean = {
  venmo: (v: string) => v.trim().replace(/^@/, '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 30),
  cashtag: (v: string) => v.trim().replace(/^\$/, '').replace(/[^A-Za-z0-9_]/g, '').slice(0, 20),
  phone: (v: string) => v.trim().replace(/[^\d+()\-\s.]/g, '').slice(0, 24),
}

function PayInfoForm({ member, onDone }: { member: Member; onDone: () => void }) {
  const [venmo, setVenmo] = useState(member.venmo)
  const [cashtag, setCashtag] = useState(member.cashtag)
  const [phone, setPhone] = useState(member.phone)
  const [pref, setPref] = useState<PayMethod | ''>(prefMethod(member))
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const info = { venmo: clean.venmo(venmo), cashtag: clean.cashtag(cashtag), phone: clean.phone(phone) }
    const have = payMethods(info)
    if (pref && !have.includes(pref)) return setError(`Add ${PAY_NAMES[pref]} info to make it the preferred way, or pick another.`)
    const { error } = await supabase
      .from('members')
      .update({ ...info, pref_pay: pref || have[0] || '' })
      .eq('id', member.id)
    if (error) setError("That didn't save. Try again.")
    else onDone()
  }

  return (
    <form onSubmit={submit} className="pay-form">
      <div className="row">
        <label>
          Venmo username
          <input value={venmo} onChange={(e) => setVenmo(e.target.value)} placeholder="sam-rivera" autoCapitalize="off" />
        </label>
        <label>
          Cash App $cashtag
          <input value={cashtag} onChange={(e) => setCashtag(e.target.value)} placeholder="$samrivera" autoCapitalize="off" />
        </label>
      </div>
      <label>
        Phone for Apple Cash and group texts
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <fieldset>
        <legend className="total">Preferred way to get paid</legend>
        <div className="pay-methods">
          {(Object.keys(PAY_NAMES) as PayMethod[]).map((k) => (
            <label className="radio" key={k}>
              <input type="radio" name={`pref-${member.id}`} checked={pref === k} onChange={() => setPref(k)} /> {PAY_NAMES[k]}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="total">Everyone in the band can see this info.</p>
      {error && <div className="notice" role="alert">{error}</div>}
      <div className="actions">
        <button className="btn small" type="submit">
          Save pay info
        </button>
        <button className="link" type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  )
}
