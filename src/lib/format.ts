// Small formatting helpers shared across screens.

/** Today's date as YYYY-MM-DD in the user's own time zone (what Postgres `date` columns hold). */
export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export interface DayParts {
  dow: string // "Sat"
  num: number // 4
  mon: string // "Oct"
  short: string // "Sat Oct 4"
}

/** Splits a YYYY-MM-DD string into the pieces the date cards show. */
export function dayParts(iso: string): DayParts {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = dt.toLocaleDateString('en-US', { weekday: 'short' })
  const mon = dt.toLocaleDateString('en-US', { month: 'short' })
  return { dow, num: d, mon, short: `${dow} ${mon} ${d}` }
}

/** "19:30" or "19:30:00" -> "7:30 PM". Empty in, empty out. */
export function fmtTime(t: string | null | undefined): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** 90 -> "$90", 83.33 -> "$83.33" */
export function money(n: number): string {
  return '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '')
}

/** "Sam Rivera" -> "SR" */
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export const firstName = (name: string) => name.split(' ')[0]
