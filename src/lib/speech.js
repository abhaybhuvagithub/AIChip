// Web Speech, with the capability detection it actually needs.
//
// speechSynthesis is broadly supported. SpeechRecognition is not — it is
// Chromium-only and prefixed, and on some platforms it silently never fires a
// result. So everything here reports support honestly and the UI hides
// controls that would not work, rather than offering a button that does
// nothing.

export const canSpeak = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window

export const canListen = () =>
  typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition)

/** Speak, cancelling anything already in progress. */
export function speak(text, { rate = 1.0, onEnd } = {}) {
  if (!canSpeak() || !text) return false
  try {
    window.speechSynthesis.cancel()
    const u = new window.SpeechSynthesisUtterance(String(text))
    u.rate = rate
    u.pitch = 1
    // Prefer a natural English voice if the platform has one, but never fail
    // because it does not.
    const voices = window.speechSynthesis.getVoices?.() || []
    const preferred = voices.find((v) => /en-GB|en_GB/.test(v.lang))
      || voices.find((v) => /^en/.test(v.lang))
    if (preferred) u.voice = preferred
    if (onEnd) u.onend = onEnd
    window.speechSynthesis.speak(u)
    return true
  } catch { return false }
}

export function stopSpeaking() {
  if (!canSpeak()) return
  try { window.speechSynthesis.cancel() } catch { /* nothing to cancel */ }
}

export const isSpeaking = () => canSpeak() && window.speechSynthesis.speaking

/**
 * Listen once and hand back a transcript.
 * Returns a stop function, or null when the browser cannot do this.
 */
export function listenOnce({ onResult, onError, onEnd } = {}) {
  if (!canListen()) { onError?.('not-supported'); return null }
  try {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new Rec()
    r.lang = 'en-GB'
    r.interimResults = false
    r.maxAlternatives = 1
    r.continuous = false
    r.onresult = (e) => onResult?.(e.results[0][0].transcript)
    // Chrome fires 'no-speech' constantly on a quiet mic; that is not an error
    // worth showing anyone.
    r.onerror = (e) => { if (e.error !== 'no-speech' && e.error !== 'aborted') onError?.(e.error) }
    r.onend = () => onEnd?.()
    r.start()
    return () => { try { r.stop() } catch { /* already stopped */ } }
  } catch (e) { onError?.(String(e.message || e)); return null }
}
