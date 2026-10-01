import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

interface Person {
  name: string
  role: string
}

/** "Sam Rivera, vocals" per line -> [{ name: 'Sam Rivera', role: 'vocals' }] */
function parseLineup(text: string): Person[] {
  return text
    .split('\n')
    .map((line) => {
      const [name, ...rest] = line.split(',')
      return { name: (name ?? '').trim(), role: rest.join(',').trim() }
    })
    .filter((p) => p.name)
}

export function CreateBand({ onCreated }: { onCreated: (bandId: string) => void }) {
  const [name, setName] = useState('')
  const [roster, setRoster] = useState('')
  const [me, setMe] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lineup = parseLineup(roster)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !lineup.length) return setError('Add a band name and at least one person.')
    if (me < 0 || me >= lineup.length) return setError('Pick which one is you.')
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('create_band', { band_name: name.trim(), lineup: lineup.map((p) => ({ ...p })), me })
    setBusy(false)
    if (error) setError(error.message)
    else onCreated(data)
  }

  return (
    <form className="card" onSubmit={submit}>
      <b>Start your band's board</b>
      <label style={{ marginTop: 8 }}>
        Band name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Late Shift" required />
      </label>
      <label>
        Lineup, one person per line: name, role
        <textarea
          rows={6}
          value={roster}
          onChange={(e) => setRoster(e.target.value)}
          placeholder={'Sam Rivera, vocals\nAlex Chen, guitar\nJordan Lee, bass\nCasey Park, drums'}
        />
      </label>
      {lineup.length > 0 && (
        <label>
          Which one is you?
          <select value={me} onChange={(e) => setMe(Number(e.target.value))}>
            <option value={-1}>Pick your name</option>
            {lineup.map((p, i) => (
              <option key={i} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <div className="notice" role="alert">{error}</div>}
      <button className="btn" type="submit" disabled={busy}>
        Create band board
      </button>
      <p className="total" style={{ marginTop: 10, marginBottom: 0 }}>
        Next you'll get an invite link to send the band. Each person picks their own name when they join.
      </p>
    </form>
  )
}
