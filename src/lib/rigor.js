// The arithmetic behind why discipline is not a virtue here — it is a
// requirement, and a quantifiable one.
//
// The single most useful number on this subject: a leading-edge flow is
// roughly 700 process steps, and yield multiplies. To finish the line with 99
// wafers out of 100, every one of those 700 steps must succeed 99.9986% of the
// time. Not on average — every step, every time.
//
// That is why "be careful" is not a strategy and why fabs run on documented
// procedure, statistical control and stop-the-line authority instead. The
// disciplines exist because human attention cannot deliver fourteen parts per
// million, and no amount of wanting it to changes that.

/** Per-step success needed to reach a target line yield over N steps. */
export function perStepYield(steps, targetLineYield) {
  if (!(steps > 0) || !(targetLineYield > 0) || targetLineYield > 1) return NaN
  return Math.pow(targetLineYield, 1 / steps)
}

/** The same thing expressed as the defect budget: parts per million per step. */
export const ppmPerStep = (steps, targetLineYield) =>
  (1 - perStepYield(steps, targetLineYield)) * 1e6

/** Line yield that follows from a given per-step yield. */
export const lineYieldFrom = (steps, stepYield) => Math.pow(stepYield, steps)

/**
 * Sigma level from defects per million opportunities, using the industry
 * convention that includes the 1.5σ long-term shift — which is why "six
 * sigma" is quoted as 3.4 DPMO rather than the 0.002 that the pure normal
 * tail gives. Approximated with a rational fit to the inverse normal CDF.
 */
export function sigmaFromDpmo(dpmo) {
  const p = Math.min(0.999999, Math.max(1e-9, dpmo / 1e6))
  // Acklam's inverse normal approximation, adequate well past six sigma.
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const pl = 0.02425
  let z
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p))
    z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  } else if (p <= 1 - pl) {
    const q = p - 0.5, r = q * q
    z = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p))
    z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  return -z + 1.5
}

/**
 * Defects that get past test and reach a customer.
 * Test coverage is never 1, which is the whole reason burn-in exists.
 */
export function escapes({ defectiveFraction, testCoverage, unitsShipped }) {
  const escapeRate = defectiveFraction * (1 - testCoverage)
  return { escapeRate, dppm: escapeRate * 1e6, badPartsShipped: escapeRate * unitsShipped }
}

/**
 * The rule of ten: what a defect costs to fix, by where it is found.
 *
 * Each stage downstream multiplies the cost by roughly an order of magnitude,
 * because more value has been added to the thing that must now be scrapped and
 * more parties have to be involved in scrapping it. The figures are
 * illustrative order-of-magnitude conventions, not accounting.
 */
export const ESCAPE_STAGES = [
  { id: 'design', name: 'Design review', cost: 1, what: 'Someone reads the spec and asks a question. The cheapest defect in the industry is the one caught in a meeting.' },
  { id: 'verify', name: 'Verification', cost: 10, what: 'Simulation or formal analysis finds it. Still only engineering time, and no silicon exists yet.' },
  { id: 'silicon', name: 'First silicon', cost: 1e3, what: 'The lab finds it. Now it costs a respin: a mask set and three months, or a metal-only fix if you are fortunate.' },
  { id: 'wafertest', name: 'Wafer sort', cost: 1e2, what: 'Caught at probe. The wafer is scrapped or the die is inked out — expensive, but contained to your own factory.' },
  { id: 'finaltest', name: 'Final test', cost: 1e3, what: 'Caught after packaging. You have now paid for a substrate, a bonder and a test slot on a part you throw away.' },
  { id: 'customer', name: "Customer's board", cost: 1e4, what: 'Found during their assembly. You are scrapping their board, not your die, and you are having a conversation about it.' },
  { id: 'field', name: 'In the field', cost: 1e5, what: 'Found by a user. Warranty, logistics, engineering investigation, and a reputation cost that does not appear on any invoice.' },
  { id: 'recall', name: 'Safety recall', cost: 1e7, what: 'Found because something failed dangerously. Regulators, litigation, and in automotive or medical, potentially harm that no amount of money addresses.' },
]

/** Practical DPPM targets by market. Automotive is the demanding one. */
// Automotive target per [aecq100]; stress methods per [jedec].
export const DPPM_TARGETS = [
  { market: 'Consumer electronics', dppm: 500, note: 'A failure is an annoyance and a return.' },
  { market: 'Industrial', dppm: 50, note: 'A failure stops a machine that someone is paid to keep running.' },
  { market: 'Automotive', dppm: 1, note: 'The stated ambition is zero defects. One part per million across a hundred million parts is still a hundred cars.' },
  { market: 'Aerospace / medical', dppm: 0.1, note: 'Qualification, traceability and screening costs exceed the silicon cost, and they are meant to.' },
]
