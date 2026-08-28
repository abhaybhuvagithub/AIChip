// Motion, applied once so every navigation on the site behaves the same way.
//
// Three things have to be true and they pull against each other:
//
//   1. Switching tabs should not feel like a page reload. Content swapping
//      instantly, with the scroll left halfway down the previous tab, reads as
//      a bug even when nothing is wrong.
//   2. Someone who has asked their system for reduced motion must get none of
//      it — not a shorter animation, none. That is a stated accessibility
//      preference, not a taste.
//   3. It must degrade to plain, working navigation in a browser without the
//      View Transitions API, rather than to a broken half-state.
//
// The View Transitions API does the cross-fade natively where it exists, which
// is smoother than anything achievable with two overlapping React trees, and
// costs nothing where it does not.

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

const supportsViewTransitions = () =>
  typeof document !== 'undefined' && typeof document.startViewTransition === 'function'

/**
 * Run a state change as a visual transition.
 *
 * @param update  the state change — called synchronously either way, so
 *                navigation never depends on the animation succeeding
 */
export function transition(update) {
  if (prefersReducedMotion() || !supportsViewTransitions()) {
    update()
    return
  }
  try {
    document.startViewTransition(update)
  } catch {
    // A failed transition must never cost the navigation itself.
    update()
  }
}

/**
 * Return to the top when the view changes.
 *
 * Instant rather than smooth during a view transition: the cross-fade is
 * already carrying the change, and a simultaneous smooth scroll fights it and
 * lands late. Smooth is right only when there is no transition to fight.
 */
export function scrollToTop({ smooth = false } = {}) {
  if (typeof window === 'undefined') return
  const behavior = smooth && !prefersReducedMotion() ? 'smooth' : 'auto'
  try {
    window.scrollTo({ top: 0, behavior })
  } catch {
    window.scrollTo(0, 0)
  }
}

/** Navigate: change the view, cross-fade it, and start at the top. */
export function navigate(update) {
  transition(() => {
    update()
    scrollToTop()
  })
}
