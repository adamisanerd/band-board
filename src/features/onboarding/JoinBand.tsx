import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../lib/database.types'

type PreviewRow = Database['public']['Functions']['band_preview']['Returns'][number]

/** The page behind an invite link (/join/<code>): pick your name off the lineup, or add yourself. */
export function JoinBand({ code, onJoined }: { code: string; onJoined: (bandId: string) => void }) {
  const [rows, setRows] = useState<PreviewRow[] | null>(null)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.rpc('band_preview', { code }).then(({ data, error }) => {
      if (error) setError(error.message)
      setRows(data ?? [])
    })
  }, [code])

  async function join(args: { member?: string; new_name?: string }) {
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('join_band', { code, ...args })
    setBusy(false)
    if (error) setError(error.message)
    else onJoined(data)
  }

  if (rows === null) return <p className="empty">Opening the invite…</p>
  if (!rows.length) return <div className="notice">That invite link isn't valid. Ask your bandmate to send it again.</div>

  const open = rows.filter((r) => r.member_id && !r.claimed)
  return (
    <div className="card">
      <b>Join {rows[0].band_name}</b>
      <p className="total" style={{ marginTop: 2 }}>Which one are you?</p>
      <div className="picker">
        {open.map((r) => (
          <button key={r.member_id} className="btn ghost small" disabled={busy} onClick={() => join({ member: r.member_id! })}>
            {r.member_name}
          </button>
        ))}
      </div>
      <form
        className="row"
        style={{ marginTop: 14, alignItems: 'flex-end' }}
        onSubmit={(e) => {
          e.preventDefault()
          if (newName.trim()) void join({ new_name: newName.trim() })
        }}
      >
        <label>
          Not listed? Add yourself
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Your name" />
        </label>
        <div style={{ flex: '0 0 auto', marginBottom: 8 }}>
          <button className="btn small" type="submit" disabled={busy}>
            Join
          </button>
        </div>
      </form>
      {error && <div className="notice" role="alert">{error}</div>}
    </div>
  )
}
