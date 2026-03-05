// File: src/apps/ra/calculators/genaiInferencingCalculator.js

export const GPU_PRESETS = [
  {
    id: "H100_80",
    label: "NVIDIA H100 SXM (80GB)",
    vramGB: 80,
    tdpW: 700,
    // Rough, illustrative baseline for 70B @ int8 decode-heavy workloads
    baseDecodeTokPerSec_70B_int8: 140,
    nicRecommendedGbpsPerGpu: 25,
  },
  {
    id: "H200_141",
    label: "NVIDIA H200 SXM (141GB)",
    vramGB: 141,
    tdpW: 700,
    baseDecodeTokPerSec_70B_int8: 155,
    nicRecommendedGbpsPerGpu: 25,
  },
  {
    id: "A100_80",
    label: "NVIDIA A100 SXM (80GB)",
    vramGB: 80,
    tdpW: 400,
    baseDecodeTokPerSec_70B_int8: 70,
    nicRecommendedGbpsPerGpu: 12.5,
  },
  {
    id: "L40S_48",
    label: "NVIDIA L40S (48GB)",
    vramGB: 48,
    tdpW: 350,
    baseDecodeTokPerSec_70B_int8: 55,
    nicRecommendedGbpsPerGpu: 12.5,
  },
  {
    id: "MI300X_192",
    label: "AMD MI300X (192GB)",
    vramGB: 192,
    tdpW: 750,
    baseDecodeTokPerSec_70B_int8: 135,
    nicRecommendedGbpsPerGpu: 25,
  },
];

export const PRECISION_PRESETS = [
  { id: "fp32", label: "FP32", bytesPerParam: 4, speedMult: 0.55 },
  { id: "bf16", label: "BF16", bytesPerParam: 2, speedMult: 0.85 },
  { id: "fp16", label: "FP16", bytesPerParam: 2, speedMult: 0.9 },
  { id: "int8", label: "INT8", bytesPerParam: 1, speedMult: 1.0 },
  { id: "int4", label: "INT4", bytesPerParam: 0.5, speedMult: 1.15 },
];

function clamp(x, lo, hi) {
  const n = Number(x);
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function ceilDiv(a, b) {
  if (b <= 0) return 0;
  return Math.ceil(a / b);
}

function round1(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

function round2(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

function findById(arr, id, fallback) {
  return arr.find((x) => x.id === id) || fallback;
}

// Very simple conversion for weights:
// paramsB * 1e9 params * bytesPerParam -> bytes -> GiB
function weightsGiB(modelParamsB, bytesPerParam) {
  const bytes = modelParamsB * 1e9 * bytesPerParam;
  const gib = bytes / (1024 ** 3);
  return gib;
}

// KV cache heuristic (GiB per GPU):
// kvGB ≈ modelParamsB * contextTokens * concPerGpu * K
// Tuned so that 70B @ 4k ctx @ concPerGpu ~ 25 yields single-digit/low-teens GiB.
function kvGiBPerGpu(modelParamsB, contextTokens, concPerGpu) {
  const K = 1e-6; // heuristic constant
  return modelParamsB * contextTokens * concPerGpu * K;
}

export function sizeGenAIInferencingEngine(state) {
  const s = state || {};

  // Inputs (sanitised)
  const targetTokensPerSec = clamp(s.targetTokensPerSec ?? 1000, 1, 1e9);
  const peakToAvg = clamp(s.peakToAvg ?? 1.5, 1, 10);
  const concurrency = clamp(s.concurrency ?? 200, 1, 1e7);

  const avgOutputTokens = clamp(s.avgOutputTokens ?? 256, 1, 1e6);
  const latencyTargetMs = clamp(s.latencyTargetMs ?? 800, 50, 60000);

  const modelParamsB = clamp(s.modelParamsB ?? 70, 1, 10000);
  const contextTokens = clamp(s.contextTokens ?? 4096, 256, 2_000_000);

  const maxBatch = clamp(s.maxBatch ?? 8, 1, 4096);
  const tensorParallel = clamp(s.tensorParallel ?? 1, 1, 1024);
  const pipelineParallel = clamp(s.pipelineParallel ?? 1, 1, 64);

  const gpusPerServer = clamp(s.gpusPerServer ?? 8, 1, 32);
  const cpuCoresPerServer = clamp(s.cpuCoresPerServer ?? 64, 1, 4096);
  const ramGBPerServer = clamp(s.ramGBPerServer ?? 512, 1, 1e7);
  const nicGbpsPerServer = clamp(s.nicGbpsPerServer ?? 200, 1, 1e6);
  const storageTBPerServer = clamp(s.storageTBPerServer ?? 7.68, 0, 1e6);

  const runtimeVramOverheadGB = clamp(s.runtimeVramOverheadGB ?? 6, 0, 128);
  const vramUtilisationTarget = clamp(s.vramUtilisationTarget ?? 0.9, 0.5, 0.98);
  const pue = clamp(s.pue ?? 1.3, 1.0, 3.0);

  const gpu = findById(GPU_PRESETS, s.gpuId, GPU_PRESETS[0]);
  const prec = findById(PRECISION_PRESETS, s.precisionId, PRECISION_PRESETS[3]);

  // Throughput model (heuristic)
  // Base is for 70B/int8; scale by:
  // - params: larger models slower ~ 1/sqrt(params)
  // - precision multiplier
  // - batching gives diminishing returns
  // - TP/PP overhead
  const paramsScale = Math.sqrt(70 / modelParamsB); // >1 for smaller models, <1 for larger
  const batchScale = Math.pow(maxBatch, 0.15); // diminishing returns
  const parallelPenalty = Math.pow(tensorParallel * pipelineParallel, 0.12); // mild penalty

  const effDecodeTokPerSecPerGpu = Math.max(
    1,
    Math.round(
      gpu.baseDecodeTokPerSec_70B_int8 *
        paramsScale *
        prec.speedMult *
        batchScale /
        parallelPenalty
    )
  );

  const peakTokensPerSec = targetTokensPerSec * peakToAvg;
  const gpusRequired = Math.max(1, Math.ceil(peakTokensPerSec / effDecodeTokPerSecPerGpu));
  const serversRequired = Math.max(1, ceilDiv(gpusRequired, gpusPerServer));

  // Requests/sec rough estimate from output tokens per request.
  const reqPerSec = round2(targetTokensPerSec / Math.max(1, avgOutputTokens));
  const concPerGpu = round2(concurrency / gpusRequired);

  // VRAM fit
  const weightsGBTotal = weightsGiB(modelParamsB, prec.bytesPerParam);
  const weightsGBPerGpu = weightsGBTotal / tensorParallel;

  const kvGBPerGpu = kvGiBPerGpu(modelParamsB, contextTokens, concPerGpu);

  // We treat utilisation target as "usable fraction" of VRAM.
  const vramAvailablePerGpu = round1(gpu.vramGB * vramUtilisationTarget);

  const vramNeededRaw =
    weightsGBPerGpu + kvGBPerGpu + runtimeVramOverheadGB;

  const vramNeededPerGpu = round1(vramNeededRaw);
  const vramFit = vramNeededPerGpu <= vramAvailablePerGpu;

  // Simple platform totals (use chosen server profile times server count)
  const cpuCoresNeeded = Math.round(serversRequired * cpuCoresPerServer);
  const ramGBNeeded = Math.round(serversRequired * ramGBPerServer);
  const storageTBNeeded = round1(serversRequired * storageTBPerServer);

  // Network: crude egress estimate:
  // Assume 1 token ~= 2 bytes of output text on wire after overhead -> 16 bits.
  const estEgressGbps = round2((targetTokensPerSec * 2 * 8) / 1e9);

  // Power
  const serverBaseW = 250; // CPUs + RAM + NIC + NVMe overhead heuristic
  const itPowerKW = round2((gpusRequired * gpu.tdpW + serversRequired * serverBaseW) / 1000);
  const facilityPowerKW = round2(itPowerKW * pue);

  const notes = [];
  if (!vramFit) {
    notes.push(
      "VRAM does not fit per GPU. Consider higher-VRAM GPUs, increasing tensor parallel, reducing context, lowering concurrency, or using more aggressive quantization."
    );
  }
  if (tensorParallel > gpusPerServer) {
    notes.push(
      "Tensor parallel is greater than GPUs/server. Ensure your model parallel group can span servers and your fabric supports it."
    );
  }
  if (latencyTargetMs <= 250 && concPerGpu > 30) {
    notes.push(
      "Tight latency target with high concurrency/GPU may require more GPUs (lower conc/GPU), smaller batch, or faster interconnect."
    );
  }
  if (nicGbpsPerServer < gpusPerServer * gpu.nicRecommendedGbpsPerGpu) {
    notes.push(
      "NIC capacity/server looks low for the selected GPU count. Check fabric bandwidth (esp. for multi-node TP/PP)."
    );
  }

  return {
    billOfMaterials: { gpu },
    performance: {
      effDecodeTokPerSecPerGpu,
      peakTokensPerSec,
      reqPerSec,
      concPerGpu,
      estEgressGbps,
    },
    capacity: {
      gpusRequired,
      serversRequired,
      cpuCoresNeeded,
      ramGBNeeded,
      storageTBNeeded,
    },
    fit: {
      vramFit,
      vramNeededPerGpu,
      vramAvailablePerGpu,
      weightsGBPerGpu: round1(weightsGBPerGpu),
      kvGBPerGpu: round1(kvGBPerGpu),
      runtimeVramOverheadGB: round1(runtimeVramOverheadGB),
    },
    power: {
      itPowerKW,
      facilityPowerKW,
      pue: round2(pue),
    },
    notes,
  };
}