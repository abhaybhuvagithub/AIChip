// What makes an AI chip an AI chip.
//
// The Silicon tab lists real accelerators and the Compute tab counts their
// operations. Neither says what is architecturally different about them, and
// the answer is not "more multipliers". It is that a handful of very different
// bets have been placed on how to feed those multipliers, because feeding them
// — not building them — is the hard part.

export const ARCHITECTURES = [
  {
    id: 'simt', name: 'SIMT', icon: 'gpu', example: 'NVIDIA, AMD GPUs',
    one: 'Thousands of threads in lockstep, with tensor cores bolted into a general-purpose machine.',
    how: 'Threads are grouped into warps that execute one instruction together. Memory is a deep cache hierarchy, and the hardware hides latency by having far more threads resident than it can run.',
    good: 'Extraordinarily flexible. It runs the model you wrote last night, and the software ecosystem is a decade ahead of everyone else\'s.',
    bad: 'Generality costs area and energy. Instruction fetch, scheduling and register file traffic are overhead a fixed-function array simply does not have.',
    verdict: 'Won on software, not silicon. That is not a criticism — it is the lesson.',
  },
  {
    id: 'systolic', name: 'Systolic array', icon: 'npu', example: 'Google TPU',
    one: 'A grid of multipliers with the weights held still and the data flowing through.',
    how: 'Each cell multiplies, accumulates, and passes the result to its neighbour. Operands are read once at the edge and reused across the whole array, so the register file and cache traffic that dominate a GPU largely disappear.',
    good: 'The highest arithmetic efficiency of any approach for large matrix multiplies, and by a wide margin. Almost all the energy goes into arithmetic rather than moving operands.',
    bad: 'It wants one shape. A matrix smaller than the array wastes it, and anything that is not a matrix multiply falls back to whatever else is on the die.',
    verdict: 'The purest expression of the insight that reuse is everything.',
  },
  {
    id: 'dataflow', name: 'Spatial dataflow', icon: 'waferscale', example: 'Cerebras, Groq, SambaNova',
    one: 'Map the computation graph onto the chip and leave it there.',
    how: 'Rather than fetching instructions to describe the network, the network is laid out across the fabric and data streams through it. With enough on-chip memory, weights never leave the die at all.',
    good: 'Eliminates the memory wall by refusing to have one. Latency is deterministic, which matters more for serving than most benchmarks admit.',
    bad: 'The model has to fit. When it does not, the elegance collapses into a partitioning problem, and the compiler carries the entire burden of the architecture.',
    verdict: 'The most intellectually satisfying answer, and the one most dependent on its compiler.',
  },
  {
    id: 'vliw', name: 'VLIW and vector', icon: 'ipdsp', example: 'Many mobile NPUs, some DSPs',
    one: 'Let the compiler schedule everything, and remove the hardware that would have done it.',
    how: 'Wide instruction words issue several operations at once, with no out-of-order logic and no dynamic scheduling. The compiler is responsible for keeping the pipeline full.',
    good: 'Very small and very efficient when the workload is predictable, which inference on a fixed model usually is. Almost every phone contains one.',
    bad: 'Brittle. A workload the compiler cannot schedule well runs badly, and there is no hardware to rescue it at runtime.',
    verdict: 'Invisible and everywhere. Most AI inference on Earth runs on something like this.',
  },
  {
    id: 'inmem', name: 'In-memory / analogue', icon: 'ipmem', example: 'Research, and a few startups',
    one: 'Do the multiply-accumulate inside the memory array, in the analogue domain.',
    how: 'A crossbar of resistive cells performs a matrix-vector product in one step by Ohm\'s and Kirchhoff\'s laws. The data never moves because the computation happens where it is stored.',
    good: 'Orders of magnitude better energy per operation in principle, because moving an operand costs hundreds of times the arithmetic on it.',
    bad: 'Limited precision, severe device variation, cells that drift and wear, and a programming model that assumes digital determinism it cannot supply.',
    verdict: 'The most-cited answer to the memory wall for nearly thirty years, and still not a product.',
  },
]

export const WORKLOADS = [
  {
    id: 'train', name: 'Training', icon: 'chart',
    shape: 'Enormous batches, long-running, throughput is everything and latency is irrelevant.',
    binds: 'Compute, then interconnect. Large GEMMs sit above the ridge point, so the arithmetic is genuinely used — until the job spans thousands of chips and the collective communication becomes the limit instead.',
    memory: 'Capacity for weights, gradients and optimiser states — commonly several times the model size — plus activations that scale with batch.',
    wants: 'Peak FLOPS, high-bandwidth interconnect, and enough memory to avoid recomputing activations.',
  },
  {
    id: 'prefill', name: 'Inference — prefill', icon: 'ipnoc',
    shape: 'Processing a whole prompt at once. Every token is available, so the work batches naturally into matrix multiplies.',
    binds: 'Compute, mostly. This is the part of inference that looks like training and uses the chip properly.',
    memory: 'Weights, plus a KV cache that grows with prompt length.',
    wants: 'FLOPS, and enough memory capacity for long contexts.',
  },
  {
    id: 'decode', name: 'Inference — decode', icon: 'ipmem',
    shape: 'One token at a time, each depending on the last. Nothing to batch within a request — only across requests.',
    binds: 'Memory bandwidth, absolutely and unavoidably. Every weight in the model is read from memory to produce a single token, so arithmetic intensity is about one and the arithmetic units are almost entirely idle.',
    memory: 'Weights, plus a KV cache that grows with every token generated and every concurrent request.',
    wants: 'Bandwidth and capacity. FLOPS barely matter, which is a strange thing to say about an AI accelerator and is nevertheless true.',
  },
]

export const LEVERS = [
  { k: 'Batch harder', what: 'Serving many requests together means one weight read feeds many tokens, which is the only lever that moves decode up the roofline. It costs latency and memory for concurrent KV caches.' },
  { k: 'Quantise', what: 'Fewer bytes per weight is directly fewer bytes to read. Going from FP16 to INT4 quadruples decode throughput on a memory-bound workload, which is why quantisation is an inference technique before it is a compute one.' },
  { k: 'Shrink the KV cache', what: 'Grouped-query and multi-query attention share key-value heads across query heads, cutting the cache several-fold. This is why modern models use them, and it is a memory decision rather than a quality one.' },
  { k: 'Fuse kernels', what: 'A normalisation that reads and writes memory to do almost no arithmetic is pure waste. Fusing it into its neighbour removes a round trip entirely.' },
  { k: 'Keep weights on chip', what: 'If the model fits in SRAM, the memory wall does not apply. This is the entire argument for wafer-scale and for very large on-chip memories, and the entire difficulty is the word "if".' },
  { k: 'Speculate', what: 'A small draft model proposes several tokens and the large model verifies them in one batched pass — turning a sequence of memory-bound steps into one that is closer to compute-bound.' },
]
