// A page-load counter for a site with no server.
//
// THREE HONEST CAVEATS, because this is the one feature here that cannot be
// made fully trustworthy from inside a static site:
//
//   1. IT COUNTS PAGE LOADS, NOT VIEWERS. Every load increments it, including
//      reloads and repeat visits by the same person. Labelling that "viewers"
//      would be a small lie of exactly the kind the rest of this site refuses
//      to tell, so the label says "page loads".
//
//   2. IT IS A THIRD-PARTY REQUEST. The site otherwise makes no external calls
//      at all. This one sends a request per load to a counter service, which
//      is a real privacy cost for a cosmetic number. Do Not Track is honoured,
//      and the request carries nothing but the counter key.
//
//   3. FREE COUNTER SERVICES DIE. The one everybody used, countapi.xyz, became
//      unreliable and its successors are personal projects. So failure here is
//      SILENT: no number, no error, no zero. A counter showing a broken value
//      is worse than no counter, and "0 page loads" on a live site is worse
//      than either.
//
// Everything below follows from those three.

const ENDPOINT = 'https://api.counterapi.dev/v1/abhaybhuva-aichip/pageloads/up'

/** Respect the browser's stated preference before counting anything. */
export function doNotTrack() {
  if (typeof navigator === 'undefined') return false
  // `window` needs its own guard: checking only `navigator` still threw in a
  // non-browser environment, which is where the build runs.
  const w = typeof window === 'undefined' ? {} : window
  const v = navigator.doNotTrack || w.doNotTrack || navigator.msDoNotTrack
  return v === '1' || v === 1 || v === 'yes'
}

/**
 * Pull the count. Returns null for every failure mode, so the caller can
 * simply not render rather than rendering a wrong number.
 *
 * The response shape is not something I can verify from the build environment,
 * which has no route to this host — so several plausible shapes are accepted
 * rather than one assumed. Shipping untested network code means tolerating
 * uncertainty about what comes back, not pretending to know.
 */
export async function fetchCount({ signal, endpoint = ENDPOINT } = {}) {
  if (typeof fetch !== 'function' || doNotTrack()) return null
  try {
    const res = await fetch(endpoint, { signal, cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const n = data?.count ?? data?.value ?? data?.data?.count ?? data?.data?.up_count
    return Number.isFinite(n) && n >= 0 ? n : null
  } catch {
    return null   // network down, service gone, CORS, aborted — all the same here
  }
}

/** Compact rendering: a counter that pushes the layout around is a nuisance. */
export function formatCount(n) {
  if (!Number.isFinite(n) || n < 0) return null
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
