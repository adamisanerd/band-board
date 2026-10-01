import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase, type Row } from './lib/supabase'
import { useSession } from './hooks/useSession'
import { useBandRows } from './hooks/useBandRows'
import { SignIn } from './features/auth/SignIn'
import { CreateBand } from './features/onboarding/CreateBand'
import { JoinBand } from './features/onboarding/JoinBand'
import { DatesTab } from './features/dates/DatesTab'
import { BandTab } from './features/band/BandTab'
import { firstName } from './lib/format'

type Band = Row<'bands'>
type Tab = 'dates' | 'gigs' | 'setlist' | 'venues' | 'band'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dates', label: 'Dates' },
  { id: 'gigs', label: 'Gigs' },
  { id: 'setlist', label: 'Setlist' },
  { id: 'venues', label: 'Venues' },
  { id: 'band', label: 'Band' },
]

/** An invite link looks like /join/<code>. */
const joinCode = () => window.location.pathname.match(/^\/join\/([a-f0-9]+)$/)?.[1] ?? null

function lsGet(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function lsSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode: just don't remember */
  }
}

export default function App() {
  const session = useSession()
  if (session === undefined) return <Page><p className="empty">Loading…</p></Page>
  if (!session) return <Page><SignIn /></Page>
  return <Boards userId={session.user.id} />
}

/** Signed in: find the user's bands, then show the right one (or onboarding). */
function Boards({ userId }: { userId: string }) {
  const [bands, setBands] = useState<Band[] | null>(null)
  const [bandId, setBandId] = useState<string | null>(lsGet('bb-band'))
  const [code, setCode] = useState(joinCode)

  // RLS only returns bands this user is a member of.
  const fetchBands = () => supabase.from('bands').select('*').order('created_at')

  const loadBands = useCallback(async () => {
    const { data } = await fetchBands()
    setBands(data ?? [])
  }, [])

  useEffect(() => {
    // State is set in the .then callback, after the network call, not during the effect itself.
    void fetchBands().then(({ data }) => setBands(data ?? []))
  }, [])

  const pick = (id: string) => {
    setBandId(id)
    lsSet('bb-band', id)
  }
  const enter = async (id: string) => {
    window.history.replaceState(null, '', '/')
    setCode(null)
    pick(id)
    await loadBands()
  }

  if (bands === null) return <Page><p className="empty">Loading your band…</p></Page>
  if (code) return <Page><JoinBand code={code} onJoined={enter} /></Page>
  const band = bands.find((b) => b.id === bandId) ?? bands[0]
  if (!band) return <Page><CreateBand onCreated={enter} /></Page>

  return <Board band={band} bands={bands} userId={userId} onPick={pick} onBandChanged={loadBands} />
}

interface BoardProps {
  band: Band
  bands: Band[]
  userId: string
  onPick: (id: string) => void
  onBandChanged: () => void
}

function Board({ band, bands, userId, onPick, onBandChanged }: BoardProps) {
  const [tab, setTab] = useState<Tab>('dates')
  const members = useBandRows('members', band.id)
  const me = members.rows.find((m) => m.user_id === userId)
  const lineup = [...members.rows].sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <Page
      band={band}
      right={
        <div className="me">
          {bands.length > 1 && (
            <select value={band.id} onChange={(e) => onPick(e.target.value)} aria-label="Switch band">
              {bands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          {me && <div>{firstName(me.name)}</div>}
          <button className="link" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      }
    >
      <nav>
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'dates' && <DatesTab bandId={band.id} members={lineup} me={me} />}
      {tab === 'band' && (
        <BandTab
          band={band}
          members={lineup}
          me={me}
          onChanged={() => {
            void members.reload()
            onBandChanged()
          }}
        />
      )}
      {(tab === 'gigs' || tab === 'setlist' || tab === 'venues') && (
        <p className="empty">This tab is next on the list to move over from the original board.</p>
      )}
    </Page>
  )
}

/** The shield badge: the first number in the band name, or its first letter. */
function Shield({ name }: { name: string }) {
  const t = name.match(/\d+/)?.[0].slice(0, 3) ?? name[0]?.toUpperCase() ?? 'B'
  return (
    <svg className="shield" viewBox="0 0 46 50" aria-hidden="true">
      <path d="M5 5 Q23 11 41 5 L43 15 Q46 35 23 48 Q0 35 3 15 Z" />
      <text x="23" y="30" textAnchor="middle">
        {t}
      </text>
    </svg>
  )
}

function Page({ band, right, children }: { band?: Band; right?: ReactNode; children: ReactNode }) {
  const name = band?.name ?? 'Band Board'
  return (
    <div className="wrap">
      <header>
        <Shield name={name} />
        <div>
          <h1>{name}</h1>
          <div className="sub">Dates, gigs, gear and pay</div>
        </div>
        {right}
      </header>
      {children}
    </div>
  )
}
