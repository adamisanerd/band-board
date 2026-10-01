// Payment helpers ported from the original board. The send/request links come over with the Gigs tab.

export type PayMethod = 'venmo' | 'cashapp' | 'applecash'

export const PAY_NAMES: Record<PayMethod, string> = { venmo: 'Venmo', cashapp: 'Cash App', applecash: 'Apple Cash' }

/** The pick-able fields of a member. Using a small interface (not the whole row) keeps these easy to test. */
export interface PayInfo {
  venmo: string
  cashtag: string
  phone: string
  pref_pay?: string
}

/** Which payment methods this person has filled in. */
export function payMethods(m: PayInfo): PayMethod[] {
  const out: PayMethod[] = []
  if (m.venmo) out.push('venmo')
  if (m.cashtag) out.push('cashapp')
  if (m.phone) out.push('applecash')
  return out
}

/** Their chosen method if it's filled in, otherwise the first one they have. */
export function prefMethod(m: PayInfo): PayMethod | '' {
  const ok = payMethods(m)
  return ok.includes(m.pref_pay as PayMethod) ? (m.pref_pay as PayMethod) : (ok[0] ?? '')
}
