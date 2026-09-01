// The analytical tool for AI accelerators, and the one number that explains
// most of their behaviour.
//
// A kernel's ARITHMETIC INTENSITY is how many operations it performs per byte
// it moves. A chip's RIDGE POINT is its peak throughput divided by its memory
// bandwidth — the intensity at which it stops being limited by memory and
// starts being limited by arithmetic.
//
// Almost every interesting AI workload sits far below the ridge point of the
// hardware running it, which means the accelerator is waiting for memory
// rather than computing. This is why a chip advertised at a thousand teraflops
// delivers a fraction of that on real work, and why the headline number and
// the experience diverge so badly.
//
// The most extreme case is worth stating plainly: single-batch language model
// decoding has an arithmetic intensity of about one, against ridge points in
// the hundreds. It uses roughly one part in three hundred of the arithmetic
// the chip contains.

/** Where a chip stops being memory-bound and starts being compute-bound. */
export function ridgePoint({ peakFlops, bandwidthBps }) {
  if (!(bandwidthBps > 0)) return Infinity
  return peakFlops / bandwidthBps
}

/**
 * Roofline: attainable performance for a kernel of a given intensity.
 *   attainable = min(peak, intensity × bandwidth)
 */
export function roofline({ peakFlops, bandwidthBps, intensity }) {
  const memBound = intensity * bandwidthBps
  const attainable = Math.min(peakFlops, memBound)
  const ridge = ridgePoint({ peakFlops, bandwidthBps })
  return {
    attainable, ridge,
    bound: intensity < ridge ? 'memory' : 'compute',
    utilisation: peakFlops > 0 ? attainable / peakFlops : 0,
    headroom: ridge > 0 ? intensity / ridge : 0,
  }
}

/**
 * Arithmetic intensity of a square matrix multiply at half precision.
 *
 * 2N³ operations against roughly 3N² elements moved, so intensity grows with
 * N — which is why large GEMMs are the one thing accelerators do well, and why
 * everything is reshaped into one when possible.
 */
export function gemmIntensity(n, bytesPerElement = 2) {
  if (!(n > 0)) return 0
  return (2 * n * n * n) / (3 * n * n * bytesPerElement)
}

/** Real kernels, with the intensity each actually achieves. */
export const KERNELS = [
  { id: 'gemm4k', name: 'Large GEMM (4096³)', intensity: 1365, icon: 'npu',
    note: 'Training a transformer is mostly this. The one shape accelerators were designed for.' },
  { id: 'gemm512', name: 'Small GEMM (512³)', intensity: 171, icon: 'npu',
    note: 'Already marginal on a modern chip. Small matrices waste most of the hardware.' },
  { id: 'batchdecode', name: 'LLM decode, batch 64', intensity: 64, icon: 'ipmem',
    note: 'Batching is the only lever that moves decode up the roofline — every request in the batch shares the same weight read.' },
  { id: 'conv', name: 'Convolution, batched', intensity: 60, icon: 'ipisp',
    note: 'Vision workloads. Reuse is real but far below a large GEMM.' },
  { id: 'attn', name: 'Attention, prefill', intensity: 40, icon: 'ipnoc',
    note: 'Processing a prompt. Enough reuse to be tolerable, not enough to saturate.' },
  { id: 'decode', name: 'LLM decode, batch 1', intensity: 1, icon: 'ipmem',
    note: 'Every weight in the model read from memory to produce a single token. The worst case in mainstream computing, and the most common one.' },
  { id: 'norm', name: 'Layer norm / softmax', intensity: 0.5, icon: 'ipdsp',
    note: 'Pure memory traffic. Fused into neighbouring kernels wherever possible, precisely because it does nothing else.' },
]

/**
 * Energy to move a number versus energy to compute with it.
 *
 * Figures from Horowitz, ISSCC 2014, at 45 nm [horowitz2014]. The ratios have
 * held far better than the absolute values, and reproductions of his table
 * differ in detail between papers that cite it. The striking one:
 * reading an operand from DRAM costs several hundred times the arithmetic
 * performed on it. Data movement, not computation, is where the energy goes —
 * which is the entire argument for on-chip memory, for locality, and for
 * caring about arithmetic intensity at all.
 */
export const ENERGY_SOURCE = 'horowitz2014'
export const ENERGY_PJ = [
  { id: 'int8', name: 'INT8 add', pj: 0.03, where: 'Arithmetic' },
  { id: 'fp16', name: 'FP16 multiply-add', pj: 0.4, where: 'Arithmetic' },
  { id: 'fp32', name: 'FP32 multiply-add', pj: 1.5, where: 'Arithmetic' },
  { id: 'sram8', name: 'Read 32 bits from 8 kB SRAM', pj: 5, where: 'On-chip memory' },
  { id: 'sram1m', name: 'Read 32 bits from 1 MB SRAM', pj: 50, where: 'On-chip memory' },
  { id: 'onchip', name: 'Move 32 bits across the die', pj: 60, where: 'Interconnect' },
  // Horowitz's 640 pJ is a DRAM ACCESS, not a 32-bit read — mislabelling it
  // as the latter overstated the per-bit cost by a factor of two, and the
  // error only surfaced when the citation was tracked down.
  { id: 'hbm', name: 'HBM access', pj: 300, where: 'Off-chip memory' },
  { id: 'ddr', name: 'DRAM access', pj: 640, where: 'Off-chip memory' },
]

/**
 * Transformer arithmetic, using the conventional rules of thumb.
 *   forward  ≈ 2 · params · tokens
 *   training ≈ 6 · params · tokens   (forward, backward, weight gradient)
 */
export const trainFlops = (paramsB, tokensB) => 6 * paramsB * 1e9 * tokensB * 1e9
export const inferFlops = (paramsB, tokens) => 2 * paramsB * 1e9 * tokens

/**
 * KV cache size — the constraint that decides context length and batch size,
 * and the reason inference is a memory-capacity problem rather than a compute
 * one.
 *
 * Two tensors (keys and values) per layer per token, sized by the number of
 * key-value heads rather than query heads — which is what grouped-query
 * attention exists to shrink.
 */
export function kvCacheBytes({ layers, kvHeads, headDim, bytesPerElement = 2, seqLen, batch = 1 }) {
  const perToken = 2 * layers * kvHeads * headDim * bytesPerElement
  return { perTokenBytes: perToken, totalBytes: perToken * seqLen * batch }
}

/** Weight footprint at a given precision. */
export const weightBytes = (paramsB, bytesPerParam = 2) => paramsB * 1e9 * bytesPerParam

/**
 * Tokens per second from a memory-bound decode, which is the honest model for
 * single-stream inference: every weight must be read to produce every token,
 * so throughput is bandwidth divided by model size and arithmetic is
 * irrelevant.
 */
export function decodeTokensPerSecond({ paramsB, bytesPerParam = 2, bandwidthBps, efficiency = 0.7 }) {
  const bytes = weightBytes(paramsB, bytesPerParam)
  return bytes > 0 ? (bandwidthBps * efficiency) / bytes : 0
}
