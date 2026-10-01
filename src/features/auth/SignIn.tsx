import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

/** Email sign-in: we email a 6-digit code (and a link), no passwords. */
export function SignIn() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    // emailRedirectTo keeps you on the same page (e.g. an invite link) if you tap the link instead.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  async function checkCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    // On success, useSession() sees the new session and the app moves on by itself.
    if (error) setError("That code didn't work. Check it, or send a new one.")
  }

  if (!sent) {
    return (
      <form className="card" onSubmit={sendCode}>
        <b>Sign in</b>
        <p className="total" style={{ marginTop: 2 }}>We'll email you a code. No password to remember.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        {error && <div className="notice" role="alert">{error}</div>}
        <button className="btn" type="submit" disabled={busy}>
          Email me a code
        </button>
      </form>
    )
  }

  return (
    <form className="card" onSubmit={checkCode}>
      <b>Check your email</b>
      <p className="total" style={{ marginTop: 2 }}>We sent a 6-digit code to {email}.</p>
      <label>
        Code
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          required
        />
      </label>
      {error && <div className="notice" role="alert">{error}</div>}
      <div className="actions">
        <button className="btn" type="submit" disabled={busy}>
          Sign in
        </button>
        <button className="link" type="button" onClick={() => { setSent(false); setCode('') }}>
          Use a different email
        </button>
      </div>
    </form>
  )
}
