// File: src/apps/methodology/GenAIInferencingMethodology.jsx
import React, { useEffect, useMemo, useState } from "react";

/**
 * GenAIInferencingMethodology.jsx
 * Transparent, reviewer-friendly methodology page for the "GenAI Inferencing Engine" sizing app.
 *
 * This page is designed hdocker to be auditable even if the actual GenAIInferencingEngine
 * uses a more detailed model. It breaks sizing into four explicit “drivers”:
 *
 * 1) Throughput (tokens/sec) -> GPUs
 * 2) KV-cache memory -> GPUs (or VRAM requirement)
 * 3) Model weights VRAM + overhead -> GPUs
 * 4) CPU/RAM/Storage/Network “translations” for the serving tier
 *
 * The final GPU recommendation is:
 *   GPUs = max(GPUs_throughput, GPUs_memory) × resilience_factor
 *
 * Replace the default assumptions or mapping rules here if your production model differs.
 */

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmtNum(n, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(digits) + "T";
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(digits) + "k";
  return n.toFixed(digits);
}

function ceilDiv(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return NaN;
  return Math.ceil(a / b);
}

function Eq({ children }) {
  return (
    <pre style={styles.eq}>
      <code style={styles.code}>{children}</code>
    </pre>
  );
}

function Card({ title, subtitle, children, right }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>{title}</div>
          {subtitle ? <div style={styles.cardSubtitle}>{subtitle}</div> : null}
        </div>
        {right ? <div style={styles.cardRight}>{right}</div> : null}
      </div>
      <div style={styles.cardBody}>{children}</div>
    </div>
  );
}

function Pill({ children }) {
  return <span style={styles.pill}>{children}</span>;
}

function Divider() {
  return <div style={styles.divider} />;
}

function Hint({ children }) {
  return <div style={styles.hint}>{children}</div>;
}

function Small({ children }) {
  return <div style={styles.small}>{children}</div>;
}

function Toggle({ value, onChange, label }) {
  return (
    <label style={styles.toggleWrap}>
      <span style={styles.toggleLabel}>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          ...styles.toggleBtn,
          ...(value ? styles.toggleOn : styles.toggleOff),
        }}
        aria-pressed={value}
      >
        <span
          style={{
            ...styles.toggleKnob,
            transform: value ? "translateX(18px)" : "translateX(0px)",
          }}
        />
      </button>
    </label>
  );
}

function Field({ label, value, onChange, step, min, max }) {
  return (
    <div style={styles.formField}>
      <div style={styles.label}>{label}</div>
      <input
        style={styles.input}
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={styles.formField}>
      <div style={styles.label}>{label}</div>
      <select style={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div style={styles.kpi}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={styles.kpiValue}>{value}</div>
      {sub ? <div style={styles.kpiSub}>{sub}</div> : null}
    </div>
  );
}

function VariablesCard({ title = "Variables & Units", rows }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>{title}</div>
          <div style={styles.cardSubtitle}>Exact meaning + units for audit</div>
        </div>
        <div style={styles.cardRight}>
          <span style={styles.pill}>Reference</span>
        </div>
      </div>
      <div style={styles.cardBody}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Variable</th>
                <th style={styles.th}>Unit</th>
                <th style={styles.th}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={styles.tdMono}>{r.name}</td>
                  <td style={styles.td}>{r.unit}</td>
                  <td style={styles.td}>{r.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TraceTable({ title = "Calculation Trace", steps }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>{title}</div>
          <div style={styles.cardSubtitle}>Step-by-step breakdown that can be reproduced externally</div>
        </div>
        <div style={styles.cardRight}>
          <span style={styles.pill}>Audit</span>
        </div>
      </div>
      <div style={styles.cardBody}>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Step</th>
                <th style={styles.th}>Expression</th>
                <th style={styles.th}>Value</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={i}>
                  <td style={styles.td}>{s.label}</td>
                  <td style={styles.tdMono} title={s.expr}>
                    {s.expr}
                  </td>
                  <td style={styles.tdMono}>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Helpers for model weights & KV cache ---
// Rough VRAM estimate for weights: params (B) × bytes/param × overhead factor
function bytesPerParam(precision) {
  // weights storage, simplified
  if (precision === "fp32") return 4;
  if (precision === "bf16") return 2;
  if (precision === "fp16") return 2;
  if (precision === "int8") return 1;
  if (precision === "int4") return 0.5;
  return 2;
}

// Approx KV cache bytes per token per param? We use a transparent, configurable coefficient.
// Many teams represent KV per token as: 2 × layers × heads × head_dim × bytes
// Here we expose "kvBytesPerToken" explicitly so reviewers can validate the assumption.
function defaultKvBytesPerToken(precision) {
  // conservative-ish defaults for large decoder models (varies widely)
  // make it explicit and adjustable
  if (precision === "fp32") return 24 * 1024; // 24 KB / token
  if (precision === "bf16") return 12 * 1024; // 12 KB / token
  if (precision === "fp16") return 12 * 1024; // 12 KB / token
  if (precision === "int8") return 8 * 1024; // 8 KB / token
  if (precision === "int4") return 6 * 1024; // 6 KB / token
  return 12 * 1024;
}

export default function GenAIInferencingMethodology() {
  const [showPlayground, setShowPlayground] = useState(true);

  // --- Demand model (similar to GPUaaS, but includes context+output) ---
  const [totalUsers, setTotalUsers] = useState(10000);
  const [peakConcurrencyPct, setPeakConcurrencyPct] = useState(0.15);
  const [requestsPerUserPerHour, setRequestsPerUserPerHour] = useState(4);

  const [contextLen, setContextLen] = useState(8192);
  const [outputLen, setOutputLen] = useState(512);
  const [tokensPerRequestOverhead, setTokensPerRequestOverhead] = useState(0); // system/tool overhead

  // --- Throughput / benchmark ---
  const [tpsPerGpu, setTpsPerGpu] = useState(180); // effective tokens/sec per GPU for this workload
  const [targetUtilization, setTargetUtilization] = useState(0.7);

  // --- Model + memory ---
  const [modelParamsB, setModelParamsB] = useState(70); // 70B
  const [precision, setPrecision] = useState("bf16");
  const [weightsOverheadFactor, setWeightsOverheadFactor] = useState(1.25); // extra for optimizer? not in inference; use for runtime overhead
  const [gpuVramGB, setGpuVramGB] = useState(80); // e.g., H100 80GB
  const [usableVramPct, setUsableVramPct] = useState(0.88); // leave room for fragmentation/runtime
  const [tensorParallel, setTensorParallel] = useState(1); // sharding across GPUs

  // KV cache planning
  const [kvBytesPerToken, setKvBytesPerToken] = useState(defaultKvBytesPerToken("bf16"));
  const [kvConcurrencyMultiplier, setKvConcurrencyMultiplier] = useState(1.0); // extra multiplier for multi-turn or batching

  // --- Resilience and host translation ---
  const [resilienceFactor, setResilienceFactor] = useState(1.2);
  const [cpuCoresPerGpu, setCpuCoresPerGpu] = useState(10);
  const [ramGBPerGpu, setRamGBPerGpu] = useState(96);

  // Storage / network (serving)
  const [modelRepositoryGB, setModelRepositoryGB] = useState(500); // models + variants + adapters
  const [logsGBPerDay, setLogsGBPerDay] = useState(60);
  const [logRetentionDays, setLogRetentionDays] = useState(30);
  const [avgEgressKBPerRequest, setAvgEgressKBPerRequest] = useState(30); // response payload, metadata, etc.

  // keep kvBytesPerToken synced if precision changes and user hasn't customized aggressively
  useEffect(() => {
    // If current value equals the previous default for any precision, update to new default.
    // We can’t perfectly detect customization, but this keeps it reasonable.
    const defaults = {
      fp32: defaultKvBytesPerToken("fp32"),
      bf16: defaultKvBytesPerToken("bf16"),
      fp16: defaultKvBytesPerToken("fp16"),
      int8: defaultKvBytesPerToken("int8"),
      int4: defaultKvBytesPerToken("int4"),
    };
    const allDefaults = Object.values(defaults);
    if (allDefaults.includes(kvBytesPerToken)) {
      setKvBytesPerToken(defaultKvBytesPerToken(precision));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precision]);

  const derived = useMemo(() => {
    const peakConcurrentUsers = totalUsers * peakConcurrencyPct;

    const tokensPerRequest =
      contextLen + outputLen + tokensPerRequestOverhead;

    const requestsPerHourAtPeak = peakConcurrentUsers * requestsPerUserPerHour;

    const tokensPerHourAtPeak = requestsPerHourAtPeak * tokensPerRequest;
    const tokensPerSecRequired = tokensPerHourAtPeak / 3600.0;

    const gpusByThroughput =
      tpsPerGpu > 0 && targetUtilization > 0
        ? tokensPerSecRequired / (tpsPerGpu * targetUtilization)
        : NaN;

    // Weights VRAM estimate:
    // weightsBytes = paramsB × 1e9 × bytes/param × overhead
    const bpp = bytesPerParam(precision);
    const weightsBytes = modelParamsB * 1e9 * bpp * weightsOverheadFactor;

    // weights are tensor-parallel sharded
    const weightsBytesPerGpu = tensorParallel > 0 ? weightsBytes / tensorParallel : NaN;

    // KV cache estimate:
    // KV bytes = peakConcurrentUsers × (context+output) × kvBytesPerToken × multiplier
    const kvTokens = (contextLen + outputLen) * kvConcurrencyMultiplier;
    const kvBytes = peakConcurrentUsers * kvTokens * kvBytesPerToken;

    // Total VRAM requirement (per “instance”): weights shard + kv shard.
    // Assume KV is distributed across the same tensor parallel group.
    const kvBytesPerGpu = tensorParallel > 0 ? kvBytes / tensorParallel : NaN;

    const totalBytesPerGpu = weightsBytesPerGpu + kvBytesPerGpu;

    const usableBytesPerGpu = gpuVramGB * 1024 ** 3 * usableVramPct;

    const gpusByMemory =
      usableBytesPerGpu > 0 ? totalBytesPerGpu / usableBytesPerGpu : NaN;

    const gpusBase = Math.max(gpusByThroughput || 0, gpusByMemory || 0);
    const gpusFinal = gpusBase * resilienceFactor;

    const cpuCores = gpusFinal * cpuCoresPerGpu;
    const ramGB = gpusFinal * ramGBPerGpu;

    // Storage
    const logStorageGB = logsGBPerDay * logRetentionDays;
    const totalStorageGB = modelRepositoryGB + logStorageGB;

    // Network (peak-ish)
    // peak req/sec = requests/hour / 3600
    const reqPerSecAtPeak = requestsPerHourAtPeak / 3600.0;
    const peakEgressKBps = reqPerSecAtPeak * avgEgressKBPerRequest;
    const peakEgressMbps = (peakEgressKBps * 8) / 1024.0; // KB/s -> Mb/s (approx)
    const peakEgressGbps = peakEgressMbps / 1000.0;

    return {
      peakConcurrentUsers,
      tokensPerRequest,
      requestsPerHourAtPeak,
      tokensPerHourAtPeak,
      tokensPerSecRequired,
      gpusByThroughput,
      bpp,
      weightsBytes,
      weightsBytesPerGpu,
      kvTokens,
      kvBytes,
      kvBytesPerGpu,
      totalBytesPerGpu,
      usableBytesPerGpu,
      gpusByMemory,
      gpusBase,
      gpusFinal,
      cpuCores,
      ramGB,
      logStorageGB,
      totalStorageGB,
      reqPerSecAtPeak,
      peakEgressGbps,
      peakEgressMbps,
    };
  }, [
    totalUsers,
    peakConcurrencyPct,
    requestsPerUserPerHour,
    contextLen,
    outputLen,
    tokensPerRequestOverhead,
    tpsPerGpu,
    targetUtilization,
    modelParamsB,
    precision,
    weightsOverheadFactor,
    gpuVramGB,
    usableVramPct,
    tensorParallel,
    kvBytesPerToken,
    kvConcurrencyMultiplier,
    resilienceFactor,
    cpuCoresPerGpu,
    ramGBPerGpu,
    modelRepositoryGB,
    logsGBPerDay,
    logRetentionDays,
    avgEgressKBPerRequest,
  ]);

  const traceSteps = useMemo(() => {
    const val = (x) => (Number.isFinite(x) ? x.toFixed(6) : "—");
    const gb = (bytes) => (Number.isFinite(bytes) ? (bytes / 1024 ** 3).toFixed(4) : "—");
    return [
      { label: "PeakConcurrentUsers", expr: "total_users × peak_concurrency_pct", value: val(derived.peakConcurrentUsers) },
      { label: "TokensPerRequest", expr: "context_len + output_len + overhead_tokens", value: val(derived.tokensPerRequest) },
      {
        label: "RequestsPerHourAtPeak",
        expr: "PeakConcurrentUsers × requests_per_user_per_hour",
        value: val(derived.requestsPerHourAtPeak),
      },
      { label: "TokensPerSecRequired", expr: "(RequestsPerHourAtPeak × TokensPerRequest) ÷ 3600", value: val(derived.tokensPerSecRequired) },

      {
        label: "GPUs_by_Throughput",
        expr: "TokensPerSecRequired ÷ (tps_per_gpu × target_utilization)",
        value: val(derived.gpusByThroughput),
      },

      { label: "BytesPerParam", expr: "precision → bytes/param", value: val(derived.bpp) },
      {
        label: "WeightsBytes",
        expr: "params_B × 1e9 × bytes_per_param × weights_overhead_factor",
        value: gb(derived.weightsBytes) + " GB",
      },
      {
        label: "WeightsBytesPerGPU",
        expr: "WeightsBytes ÷ tensor_parallel",
        value: gb(derived.weightsBytesPerGpu) + " GB",
      },

      { label: "KVTOKENS", expr: "(context_len + output_len) × kv_concurrency_multiplier", value: val(derived.kvTokens) },
      {
        label: "KVBytes",
        expr: "PeakConcurrentUsers × KVTOKENS × kv_bytes_per_token",
        value: gb(derived.kvBytes) + " GB",
      },
      { label: "KVBytesPerGPU", expr: "KVBytes ÷ tensor_parallel", value: gb(derived.kvBytesPerGpu) + " GB" },

      {
        label: "TotalVRAMBytesPerGPU",
        expr: "WeightsBytesPerGPU + KVBytesPerGPU",
        value: gb(derived.totalBytesPerGpu) + " GB",
      },
      {
        label: "UsableVRAMBytesPerGPU",
        expr: "gpu_vram_gb × GiB × usable_vram_pct",
        value: gb(derived.usableBytesPerGpu) + " GB",
      },
      {
        label: "GPUs_by_Memory",
        expr: "TotalVRAMBytesPerGPU ÷ UsableVRAMBytesPerGPU",
        value: val(derived.gpusByMemory),
      },

      { label: "GPUs_Base", expr: "max(GPUs_by_Throughput, GPUs_by_Memory)", value: val(derived.gpusBase) },
      { label: "GPUs_Final", expr: "GPUs_Base × resilience_factor", value: val(derived.gpusFinal) },

      { label: "CPU_Cores", expr: "GPUs_Final × cpu_cores_per_gpu", value: val(derived.cpuCores) },
      { label: "RAM_GB", expr: "GPUs_Final × ram_gb_per_gpu", value: val(derived.ramGB) },

      { label: "Peak_Egress_Gbps", expr: "((requests/hour ÷ 3600) × avg_egress_kb/req × 8) ÷ 1024 ÷ 1000", value: val(derived.peakEgressGbps) },
      { label: "Total_Storage_GB", expr: "model_repository_gb + (logs_gb/day × retention_days)", value: val(derived.totalStorageGB) },
    ];
  }, [derived]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>GenAI Inferencing Engine – Methodology</div>
          <div style={styles.hSubtitle}>
            Transparent sizing for a GenAI inference service using two constraints:
            <Pill>throughput</Pill> and <Pill>VRAM (weights + KV cache)</Pill>. Final GPUs apply <Pill>resilience</Pill>.
          </div>
        </div>
        <Toggle value={showPlayground} onChange={setShowPlayground} label="Show playground" />
      </div>

      <div style={styles.grid}>
        <Card title="A) Key sizing drivers" subtitle="Why GenAI inference is different from simple TPS sizing" right={<Pill>Scope</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>Throughput</b>: tokens/sec needed at peak vs benchmark throughput per GPU.
            </li>
            <li>
              <b>Memory</b>: VRAM needed for <Pill>model weights</Pill> and <Pill>KV cache</Pill> at peak concurrency.
            </li>
            <li>
              <b>Policy</b>: utilization target and resilience headroom.
            </li>
          </ul>
          <Small>
            In production, memory can dominate for large contexts and high concurrency; throughput can dominate for high output rates.
          </Small>
        </Card>

        <VariablesCard
          rows={[
            { name: "total_users", unit: "users", meaning: "Total users in population" },
            { name: "peak_concurrency_pct", unit: "0–1", meaning: "Fraction of users active concurrently at peak" },
            { name: "requests_per_user_per_hour", unit: "req/user/hour", meaning: "Requests per active user per hour at peak" },
            { name: "context_len", unit: "tokens", meaning: "Input/context tokens per request (planning value)" },
            { name: "output_len", unit: "tokens", meaning: "Output tokens per request (planning value)" },
            { name: "overhead_tokens", unit: "tokens", meaning: "System/tool overhead tokens per request" },
            { name: "tps_per_gpu", unit: "tokens/sec/GPU", meaning: "Effective benchmark throughput for chosen stack/settings" },
            { name: "target_utilization", unit: "0–1", meaning: "Planned usable utilization (headroom included)" },
            { name: "model_params_b", unit: "B params", meaning: "Model parameter count in billions (e.g., 70 for 70B)" },
            { name: "precision", unit: "enum", meaning: "Weight precision (fp32/bf16/fp16/int8/int4)" },
            { name: "weights_overhead_factor", unit: "multiplier", meaning: "Runtime overhead multiplier for weights (fragmentation, extra buffers)" },
            { name: "tensor_parallel", unit: "GPUs", meaning: "Number of GPUs used to shard model weights & KV cache" },
            { name: "gpu_vram_gb", unit: "GB", meaning: "VRAM per GPU" },
            { name: "usable_vram_pct", unit: "0–1", meaning: "Usable VRAM after reserving runtime headroom" },
            { name: "kv_bytes_per_token", unit: "bytes/token", meaning: "Explicit KV cache bytes per token assumption" },
            { name: "kv_concurrency_multiplier", unit: "multiplier", meaning: "Extra factor for multi-turn sessions/batching behavior" },
            { name: "resilience_factor", unit: "≥1", meaning: "Extra headroom for failures/maintenance/bursts" },
            { name: "cpu_cores_per_gpu", unit: "cores/GPU", meaning: "Serving host CPU cores per GPU" },
            { name: "ram_gb_per_gpu", unit: "GB/GPU", meaning: "Serving host RAM per GPU" },
            { name: "model_repository_gb", unit: "GB", meaning: "Model/artifact storage footprint (base + adapters + variants)" },
            { name: "logs_gb_per_day", unit: "GB/day", meaning: "Logs/telemetry per day" },
            { name: "log_retention_days", unit: "days", meaning: "Log retention period" },
            { name: "avg_egress_kb_per_request", unit: "KB/req", meaning: "Approx peak response payload per request" },
          ]}
        />

        <Card title="B) Demand: users → tokens/sec" subtitle="Peak demand model" right={<Pill>Demand</Pill>}>
          <Eq>{`PeakConcurrentUsers =
  total_users × peak_concurrency_pct

TokensPerRequest =
  context_len + output_len + overhead_tokens

TokensPerSecRequired =
  (PeakConcurrentUsers × requests_per_user_per_hour × TokensPerRequest) / 3600`}</Eq>
          <Hint>
            If your app uses a different “active users” model (e.g., explicit concurrent sessions), swap this section to match.
          </Hint>
        </Card>

        <Card title="C) GPU constraint 1: throughput" subtitle="Benchmark TPS per GPU × utilization" right={<Pill>Throughput</Pill>}>
          <Eq>{`GPUs_by_Throughput =
  TokensPerSecRequired / (tps_per_gpu × target_utilization)`}</Eq>
          <Small>
            <b>tps_per_gpu</b> should reflect your actual serving stack (vLLM/Triton/TF-Serving), precision, and KV settings.
          </Small>
        </Card>

        <Card title="D) GPU constraint 2: VRAM" subtitle="Weights + KV cache at peak concurrency" right={<Pill>Memory</Pill>}>
          <Eq>{`bytes_per_param = f(precision)

WeightsBytes =
  model_params_b × 1e9 × bytes_per_param × weights_overhead_factor

WeightsBytesPerGPU =
  WeightsBytes / tensor_parallel

KVTOKENS =
  (context_len + output_len) × kv_concurrency_multiplier

KVBytes =
  PeakConcurrentUsers × KVTOKENS × kv_bytes_per_token

KVBytesPerGPU =
  KVBytes / tensor_parallel

TotalVRAMBytesPerGPU =
  WeightsBytesPerGPU + KVBytesPerGPU

UsableVRAMBytesPerGPU =
  gpu_vram_gb × GiB × usable_vram_pct

GPUs_by_Memory =
  TotalVRAMBytesPerGPU / UsableVRAMBytesPerGPU`}</Eq>
          <Hint>
            The most important audit parameter here is <Pill>kv_bytes_per_token</Pill>.
            If you have a model-specific KV formula, replace it and document the exact terms.
          </Hint>
        </Card>

        <Card title="E) Final GPUs + translations" subtitle="Choose the max constraint and apply resilience" right={<Pill>Capacity</Pill>}>
          <Eq>{`GPUs_Base =
  max(GPUs_by_Throughput, GPUs_by_Memory)

GPUs_Final =
  GPUs_Base × resilience_factor

CPU_Cores = GPUs_Final × cpu_cores_per_gpu
RAM_GB    = GPUs_Final × ram_gb_per_gpu`}</Eq>
        </Card>

        <Card title="F) Network + storage" subtitle="Serving tier “extras”" right={<Pill>Ops</Pill>}>
          <Eq>{`RequestsPerSecAtPeak =
  (PeakConcurrentUsers × requests_per_user_per_hour) / 3600

PeakEgressGbps ≈
  (RequestsPerSecAtPeak × avg_egress_kb_per_request × 8) / 1024 / 1000

TotalStorageGB =
  model_repository_gb + (logs_gb_per_day × log_retention_days)`}</Eq>
          <Small>
            This is a simple first-order model. If you have per-tenant traces, add p95/p99 egress and separate logs vs metrics vs traces.
          </Small>
        </Card>

        <TraceTable title="Calculation Trace" steps={traceSteps} />

        {showPlayground ? (
          <Card title="Quick-check playground" subtitle="Adjust inputs to validate outputs against your app" right={<Pill>Audit</Pill>}>
            <div style={styles.formGrid}>
              <Field label="total_users" value={totalUsers} onChange={(v) => setTotalUsers(clamp(v, 0, 1e12))} step="1000" min={0} />
              <Field
                label="peak_concurrency_pct"
                value={peakConcurrencyPct}
                onChange={(v) => setPeakConcurrencyPct(clamp(v, 0, 1))}
                step="0.01"
                min={0}
                max={1}
              />
              <Field
                label="requests_per_user_per_hour"
                value={requestsPerUserPerHour}
                onChange={(v) => setRequestsPerUserPerHour(clamp(v, 0, 1e6))}
                step="0.5"
                min={0}
              />

              <Field label="context_len" value={contextLen} onChange={(v) => setContextLen(clamp(v, 0, 1e7))} step="256" min={0} />
              <Field label="output_len" value={outputLen} onChange={(v) => setOutputLen(clamp(v, 0, 1e7))} step="64" min={0} />
              <Field
                label="overhead_tokens"
                value={tokensPerRequestOverhead}
                onChange={(v) => setTokensPerRequestOverhead(clamp(v, 0, 1e7))}
                step="32"
                min={0}
              />

              <Field label="tps_per_gpu" value={tpsPerGpu} onChange={(v) => setTpsPerGpu(clamp(v, 0, 1e9))} step="10" min={0} />
              <Field
                label="target_utilization"
                value={targetUtilization}
                onChange={(v) => setTargetUtilization(clamp(v, 0.05, 0.95))}
                step="0.05"
                min={0.05}
                max={0.95}
              />
              <Field
                label="resilience_factor"
                value={resilienceFactor}
                onChange={(v) => setResilienceFactor(clamp(v, 1, 5))}
                step="0.05"
                min={1}
              />

              <Field label="model_params_b" value={modelParamsB} onChange={(v) => setModelParamsB(clamp(v, 0, 2000))} step="1" min={0} />
              <Select
                label="precision"
                value={precision}
                onChange={setPrecision}
                options={[
                  { label: "BF16", value: "bf16" },
                  { label: "FP16", value: "fp16" },
                  { label: "FP32", value: "fp32" },
                  { label: "INT8", value: "int8" },
                  { label: "INT4", value: "int4" },
                ]}
              />
              <Field
                label="weights_overhead_factor"
                value={weightsOverheadFactor}
                onChange={(v) => setWeightsOverheadFactor(clamp(v, 1, 3))}
                step="0.05"
                min={1}
              />

              <Field label="tensor_parallel" value={tensorParallel} onChange={(v) => setTensorParallel(clamp(v, 1, 1024))} step="1" min={1} />
              <Field label="gpu_vram_gb" value={gpuVramGB} onChange={(v) => setGpuVramGB(clamp(v, 1, 4096))} step="1" min={1} />
              <Field
                label="usable_vram_pct"
                value={usableVramPct}
                onChange={(v) => setUsableVramPct(clamp(v, 0.5, 0.98))}
                step="0.01"
                min={0.5}
                max={0.98}
              />

              <Field
                label="kv_bytes_per_token"
                value={kvBytesPerToken}
                onChange={(v) => setKvBytesPerToken(clamp(v, 0, 1024 * 1024))}
                step="1024"
                min={0}
              />
              <Field
                label="kv_concurrency_multiplier"
                value={kvConcurrencyMultiplier}
                onChange={(v) => setKvConcurrencyMultiplier(clamp(v, 0.1, 10))}
                step="0.1"
                min={0.1}
                max={10}
              />
              <div style={styles.formField} />

              <Field label="cpu_cores_per_gpu" value={cpuCoresPerGpu} onChange={(v) => setCpuCoresPerGpu(clamp(v, 0, 256))} step="1" min={0} />
              <Field label="ram_gb_per_gpu" value={ramGBPerGpu} onChange={(v) => setRamGBPerGpu(clamp(v, 0, 4096))} step="8" min={0} />
              <Field label="model_repository_gb" value={modelRepositoryGB} onChange={(v) => setModelRepositoryGB(clamp(v, 0, 1e7))} step="10" min={0} />

              <Field label="logs_gb_per_day" value={logsGBPerDay} onChange={(v) => setLogsGBPerDay(clamp(v, 0, 1e6))} step="5" min={0} />
              <Field label="log_retention_days" value={logRetentionDays} onChange={(v) => setLogRetentionDays(clamp(v, 0, 3650))} step="5" min={0} />
              <Field
                label="avg_egress_kb_per_request"
                value={avgEgressKBPerRequest}
                onChange={(v) => setAvgEgressKBPerRequest(clamp(v, 0, 1e6))}
                step="1"
                min={0}
              />
            </div>

            <Divider />

            <div style={styles.kpiGrid}>
              <Kpi label="Tokens/sec required" value={fmtNum(derived.tokensPerSecRequired, 2)} sub="Demand at peak" />
              <Kpi label="GPUs by throughput" value={fmtNum(derived.gpusByThroughput, 3)} sub="TPS + utilization" />
              <Kpi label="GPUs by VRAM" value={fmtNum(derived.gpusByMemory, 3)} sub="Weights + KV" />

              <Kpi label="Final GPUs" value={fmtNum(derived.gpusFinal, 3)} sub="max(constraints) × resilience" />
              <Kpi label="CPU cores" value={fmtNum(derived.cpuCores, 1)} sub={`${cpuCoresPerGpu} cores/GPU`} />
              <Kpi label="RAM (GB)" value={fmtNum(derived.ramGB, 1)} sub={`${ramGBPerGpu} GB/GPU`} />

              <Kpi label="Peak egress (Gbps)" value={fmtNum(derived.peakEgressGbps, 4)} sub={`${fmtNum(derived.peakEgressMbps, 2)} Mbps`} />
              <Kpi label="Total storage (GB)" value={fmtNum(derived.totalStorageGB, 1)} sub="Repo + logs retention" />
              <div style={styles.kpi} />
            </div>

            <Hint>
              If your real engine uses batching/queueing/p95 latency targets, add a section called{" "}
              <b>“Latency SLO adjustment”</b> and document how TPS is derated to meet p95/p99.
            </Hint>
          </Card>
        ) : null}

        <Card title="Common reviewer questions" subtitle="What to document if asked" right={<Pill>Notes</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>KV cache assumption</b>: how <Pill>kv_bytes_per_token</Pill> is derived per model architecture.
            </li>
            <li>
              <b>Tensor parallel strategy</b>: sharding of weights/KV, and whether you use pipeline parallel.
            </li>
            <li>
              <b>Usable VRAM</b>: allocator fragmentation, CUDA graphs, and runtime buffers.
            </li>
            <li>
              <b>TPS source</b>: benchmark conditions and latency SLO constraints.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100%",
    padding: 18,
    background: "linear-gradient(180deg, rgba(11,13,16,1) 0%, rgba(15,18,23,1) 100%)",
    color: "rgba(255,255,255,0.92)",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  },
  header: {
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    flexWrap: "wrap",
  },
  hTitle: { fontSize: 22, fontWeight: 800, letterSpacing: 0.2 },
  hSubtitle: {
    marginTop: 6,
    maxWidth: 980,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.35,
    fontSize: 13,
  },
  grid: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  cardHeader: {
    padding: "12px 14px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: 800, letterSpacing: 0.2 },
  cardSubtitle: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.3 },
  cardRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  cardBody: { padding: 14 },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.18)",
    fontSize: 11,
    color: "rgba(255,255,255,0.82)",
    whiteSpace: "nowrap",
  },
  ul: { margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.82)", lineHeight: 1.45, fontSize: 13 },
  divider: { height: 1, background: "rgba(255,255,255,0.10)", margin: "12px 0" },
  eq: {
    margin: "0 0 10px 0",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.28)",
    overflowX: "auto",
  },
  code: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace',
    fontSize: 12.5,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 1.35,
  },
  hint: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(120,200,255,0.22)",
    background: "rgba(70,130,200,0.10)",
    color: "rgba(255,255,255,0.78)",
    fontSize: 12.5,
    lineHeight: 1.35,
  },
  small: { color: "rgba(255,255,255,0.68)", fontSize: 12.5, lineHeight: 1.35 },

  toggleWrap: { display: "flex", alignItems: "center", gap: 10, userSelect: "none" },
  toggleLabel: { fontSize: 12, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" },
  toggleBtn: {
    width: 44,
    height: 24,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.16)",
    position: "relative",
    cursor: "pointer",
    padding: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 999,
    background: "rgba(255,255,255,0.88)",
    display: "block",
    transition: "transform 160ms ease",
  },
  toggleOn: { background: "rgba(70,130,200,0.22)", border: "1px solid rgba(120,200,255,0.28)" },
  toggleOff: { background: "rgba(0,0,0,0.25)" },

  formGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },
  formField: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 10,
    minWidth: 0,
  },
  label: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 8 },
  input: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
    fontSize: 13,
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
    fontSize: 13,
    boxSizing: "border-box",
  },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },
  kpi: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    minWidth: 0,
  },
  kpiLabel: { fontSize: 11, color: "rgba(255,255,255,0.62)", marginBottom: 6 },
  kpiValue: { fontSize: 18, fontWeight: 800, letterSpacing: 0.2 },
  kpiSub: { marginTop: 6, fontSize: 11.5, color: "rgba(255,255,255,0.62)", lineHeight: 1.25 },

  tableWrap: {
    overflowX: "auto",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 720 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    fontSize: 11,
    color: "rgba(255,255,255,0.70)",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    fontSize: 12.5,
    color: "rgba(255,255,255,0.82)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "top",
  },
  tdMono: {
    padding: "10px 12px",
    fontSize: 12.2,
    color: "rgba(255,255,255,0.86)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    verticalAlign: "top",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace',
    whiteSpace: "nowrap",
  },
};