/** Strips a phone number down to digits and a leading +. */
export const telNum = (phone: string) => phone.replace(/[^\d+]/g, '')

/** The app's own address, added to texts so the band can tap back in. */
export const appUrl = () => window.location.origin

/**
 * An sms: link that opens a group text to `phones` with `body` filled in.
 * iOS and Android disagree on the format, so this picks the right one.
 */
export function groupSms(body: string, phones: string[]): string {
  const nums = phones.map(telNum).filter(Boolean)
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const text = encodeURIComponent(body)
  if (!nums.length) return `sms:${ios ? '&' : '?'}body=${text}`
  return ios ? `sms:/open?addresses=${nums.join(',')}&body=${text}` : `sms:${nums.join(',')}?body=${text}`
}
