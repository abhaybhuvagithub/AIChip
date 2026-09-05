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

// counterapi.dev v1 was retired and its v2 requires an account and a bearer
// token, which cannot go in a public bundle — a site with checks asserting no
// API keys ship is not going to ship an API key for a hit counter. This
// service is keyless by design and is the stated successor to countapi.xyz.
//
// Keys are global here; there are no namespaces, so the key is deliberately
// distinctive to avoid colliding with someone else's counter.
const KEY = 'abhaybhuva_aichip_fabsim_loads'
const HOST = 'https://countapi.mileshilliard.com/api/v1'
const ENDPOINT = `${HOST}/hit/${KEY}`

/**
 * The same counter as an image.
 *
 * A `fetch` from a static page is subject to CORS: if the service does not
 * send an allow-origin header for this domain, the browser blocks the response
 * and the caller sees a generic failure it cannot distinguish from the service
 * being down. An `<img>` is not subject to CORS — the browser will load and
 * display it regardless — so this path works in cases where the fetch cannot.
 *
 * It costs styling control, because the service renders the badge. That is the
 * right trade for a fallback: a slightly foreign-looking number that appears
 * beats a perfectly-styled one that does not.
 */
export const shieldUrl = ({ label = 'page loads', bg = '4a4a52', fg = 'ffffff' } = {}) =>
  `${HOST}/hit/${KEY}/shield?text=${encodeURIComponent(label)}&bgcolor=${bg}&textcolor=${fg}&style=flat`

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
export async function fetchCount({ signal, endpoint = ENDPOINT, impl } = {}) {
  const f = impl || (typeof fetch === 'function' ? fetch : null)
  if (!f || doNotTrack()) return null
  try {
    const res = await f(endpoint, { signal, cache: 'no-store' })
    if (!res.ok) { warn(`counter: HTTP ${res.status}`); return null }
    const data = await res.json()
    return parseCount(data)
  } catch (e) {
    // Network down, service gone, CORS, aborted — all the same to the reader.
    warn('counter: request failed', e?.message)
    return null
  }
}

/**
 * Pull a count out of whatever the service returned.
 *
 * Separated so it can be tested without a network, which matters because the
 * build environment has no route to the counter host. The first version of
 * this was untestable and wrong in a way testing would have caught instantly:
 * this API returns `value` as a STRING ("3"), and `Number.isFinite('3')` is
 * false, so a correct response was being discarded as invalid. Accepting
 * several response SHAPES was not enough — the value's TYPE was the bug.
 */
export function parseCount(data) {
  const raw = data?.value ?? data?.count ?? data?.data?.count ?? data?.data?.up_count
  const n = typeof raw === 'string' ? Number(raw.trim()) : raw
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Failure is invisible to the reader by design, which makes it invisible to
 * whoever has to fix it. The console is the right place for that: diagnosable
 * without ever showing anyone a broken number.
 */
function warn(...args) {
  if (typeof console !== 'undefined' && console.warn) console.warn(...args)
}

/** Compact rendering: a counter that pushes the layout around is a nuisance. */
export function formatCount(n) {
  if (!Number.isFinite(n) || n < 0) return null
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
