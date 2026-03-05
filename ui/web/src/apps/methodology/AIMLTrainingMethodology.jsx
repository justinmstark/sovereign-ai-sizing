// File: src/apps/methodology/AIMLTrainingMethodology.jsx
import React, { useMemo, useState, useEffect } from "react";

/**
 * AIMLTrainingMethodology.jsx
 *
 * Reviewer-friendly, auditable methodology for the AI/ML Training sizing model.
 * Purpose:
 *  - Make explicit how dataset size, model size, epochs, and training strategy map
 *    to estimated GPU-hours, storage, and network.
 *  - Surface the key audit knobs: tokens-per-sample, effective throughput (tokens/sec/GPU),
 *    gradient accumulation (effective batch), and checkpoint sizing/retention.
 *
 * High-level steps (covered in the trace below):
 *  1) Convert dataset → total tokens (or samples)
 *  2) Compute total training tokens = total_tokens × epochs
 *  3) Convert to training steps (steps = total_training_tokens / (seq_len × batch_size_effective))
 *  4) Estimate GPU-hours = steps × seconds_per_step / 3600 (or use empirical avgRunGPUhours)
 *  5) Estimate storage for checkpoints / dataset and retention
 *
 * Notes:
 *  - This page intentionally exposes both analytic math and a "playground" for quick verification.
 *  - Replace "tokens-based" math with "sample-based" math if your pipeline is sample-oriented.
 */

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(digits) + "T";
  if (abs >= 1e9) return (n / 1e9).toFixed(digits) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(digits) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(digits) + "k";
  return Number(n).toFixed(digits);
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

function TraceTable({ steps }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>Calculation Trace</div>
          <div style={styles.cardSubtitle}>Step-by-step breakdown so reviewers can reproduce totals</div>
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
                  <td style={styles.tdMono}>{s.expr}</td>
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

export default function AIMLTrainingMethodology() {
  const [showPlayground, setShowPlayground] = useState(true);

  // --- Inputs (playground) ---
  // dataset side
  const [datasetTB, setDatasetTB] = useState(10); // TB of raw data (compressed/uncompressed depends on your pipeline)
  const [tokensPerKB, setTokensPerKB] = useState(1.25); // approximate tokens per KB of text (varies)
  const [datasetCompressionRatio, setDatasetCompressionRatio] = useState(1.0); // 1 = TB provided is usable tokens size; if TB is compressed set accordingly

  // model / training strategy
  const [modelParamsB, setModelParamsB] = useState(7); // billions
  const [seqLen, setSeqLen] = useState(2048); // sequence length (tokens)
  const [tokensPerSample, setTokensPerSample] = useState(seqLen); // tokens consumed per training sample (often seqLen)
  const [epochs, setEpochs] = useState(3);

  // batching / throughput
  const [batchSizeGlobal, setBatchSizeGlobal] = useState(4096); // effective global tokens per step (accumulated across GPUs)
  const [stepsPerSecond, setStepsPerSecond] = useState(0.08); // empirical steps/sec for your distributed config (steps of global batch)
  // alternate empirical metric
  const [avgRunGPUhours, setAvgRunGPUhours] = useState(48); // if you run "jobs" with known GPU-hours, this can be used instead

  // concurrency / turnover
  const [runsPerMonth, setRunsPerMonth] = useState(2);

  // checkpoint + storage
  const [checkpointGB, setCheckpointGB] = useState(20); // size per checkpoint
  const [checkpointRetention, setCheckpointRetention] = useState(3); // number of retained checkpoints

  // host sizing translations
  const [gpuPerNode, setGpuPerNode] = useState(8);
  const [cpuCoresPerGpu, setCpuCoresPerGpu] = useState(8);
  const [ramGBPerGpu, setRamGBPerGpu] = useState(64);

  // derived calculations
  const derived = useMemo(() => {
    // Convert dataset TB -> bytes -> KB -> tokens (approx)
    const datasetBytes = datasetTB * 1024 ** 4 / 1024; // intentionally normalize: TB -> GiB? keep simple
    // Simpler: TB -> KB = TB * 1e9 (approx). We'll use TB * 1e9 KB for audit clarity.
    const datasetKB = datasetTB * 1e9; // approximate
    const totalTokensInDataset = datasetKB * tokensPerKB * datasetCompressionRatio;

    // Total training tokens (account epochs)
    const totalTrainingTokens = totalTokensInDataset * epochs;

    // Steps (global) = total_training_tokens / global_batch_tokens
    const globalBatchTokens = batchSizeGlobal; // tokens consumed per step across all GPUs
    const totalSteps = globalBatchTokens > 0 ? totalTrainingTokens / globalBatchTokens : NaN;

    // Seconds per step from empirical steps/sec
    const secondsPerStep = stepsPerSecond > 0 ? 1 / stepsPerSecond : NaN;

    const totalSeconds = Number.isFinite(totalSteps) && Number.isFinite(secondsPerStep) ? totalSteps * secondsPerStep : NaN;
    const gpuHoursFromAnalytic = Number.isFinite(totalSeconds) ? totalSeconds / 3600.0 * (gpuPerNode ? 1 : 1) : NaN;
    // Note: gpuHoursFromAnalytic above gives hours for 1 global batch? For clarity we present "GPU-hours (analytic)" as:
    // gpu_hours = totalSteps × seconds_per_step × GPUs_in_global_batch / 3600
    // But since steps/sec is measured for the whole global batch (across GPUs), we need GPUs_in_global_batch to convert.
    // For simplicity we derive GPUs_in_global_batch as GPU-per-node × nodes if known; reviewers should replace with empirical measure.

    // Let's assert empirical conversion:
    // If steps/sec is measured for a global batch spread over N gpus, and we know N, then:
    const gpusInGlobalBatch = gpuPerNode; // conservative: treat this as GPUs used for benchmark; user should set to actual total GPUs
    const gpuHoursAnalyticCorrect = Number.isFinite(totalSteps) && Number.isFinite(secondsPerStep) && gpusInGlobalBatch > 0
      ? (totalSteps * secondsPerStep * gpusInGlobalBatch) / 3600.0
      : NaN;

    // Fallback to avgRunGPUhours (job-level empirical). If user provides avgRunGPUhours, use it as a sanity check.
    const gpuHoursFromAvgRun = avgRunGPUhours * runsPerMonth;

    // Choose the canonical GPU-hours to present: prefer analytic if valid, else use empirical
    const gpuHoursCanonical = Number.isFinite(gpuHoursAnalyticCorrect) ? gpuHoursAnalyticCorrect : gpuHoursFromAvgRun;

    // Hosts required (nodes) = ceil(gpu_hours / (hours_per_node_available))
    // For a quick check, estimate total concurrent training GPUs required given run durations:
    // If runs are sequential and you want to provision for concurrency you must define concurrency; omitted here.
    // Translate to CPU/RAM
    const cpuCores = gpuHoursCanonical > 0 ? (gpuHoursCanonical / 1) * cpuCoresPerGpu : NaN; // placeholder mapping
    const ramGB = gpuHoursCanonical > 0 ? (gpuHoursCanonical / 1) * ramGBPerGpu : NaN;

    // Checkpoint storage
    const checkpointStorageGB = checkpointGB * checkpointRetention;

    return {
      datasetKB,
      totalTokensInDataset,
      totalTrainingTokens,
      totalSteps,
      secondsPerStep,
      gpuHoursAnalyticCorrect,
      gpuHoursFromAvgRun,
      gpuHoursCanonical,
      cpuCores,
      ramGB,
      checkpointStorageGB,
    };
  }, [
    datasetTB,
    tokensPerKB,
    datasetCompressionRatio,
    epochs,
    batchSizeGlobal,
    stepsPerSecond,
    gpuPerNode,
    avgRunGPUhours,
    runsPerMonth,
    checkpointGB,
    checkpointRetention,
    cpuCoresPerGpu,
    ramGBPerGpu,
  ]);

  // Build trace steps (stringified values)
  const trace = useMemo(() => {
    const val = (x) => (Number.isFinite(x) ? Number(x).toFixed(6) : "—");
    return [
      {
        label: "DatasetKB (approx)",
        expr: "datasetTB × 1e9 (KB)",
        value: val(derived.datasetKB),
      },
      {
        label: "TotalTokensInDataset",
        expr: "datasetKB × tokens_per_KB × compression_ratio",
        value: val(derived.totalTokensInDataset),
      },
      {
        label: "TotalTrainingTokens",
        expr: "TotalTokensInDataset × epochs",
        value: val(derived.totalTrainingTokens),
      },
      {
        label: "TotalSteps (global)",
        expr: "TotalTrainingTokens ÷ global_batch_tokens",
        value: val(derived.totalSteps),
      },
      {
        label: "SecondsPerStep (empirical)",
        expr: "1 ÷ steps_per_second",
        value: val(derived.secondsPerStep),
      },
      {
        label: "GPU-hours (analytic)",
        expr: "TotalSteps × seconds_per_step × GPUs_in_global_batch ÷ 3600",
        value: val(derived.gpuHoursAnalyticCorrect),
      },
      {
        label: "GPU-hours (empirical jobs)",
        expr: "avgRunGPUhours × runs_per_month",
        value: val(derived.gpuHoursFromAvgRun),
      },
      {
        label: "GPU-hours (canonical chosen)",
        expr: "prefer analytic if valid, else empirical",
        value: val(derived.gpuHoursCanonical),
      },
      {
        label: "Checkpoint storage (GB)",
        expr: "checkpointGB × retention",
        value: val(derived.checkpointStorageGB),
      },
    ];
  }, [derived]);

  // keep tokensPerSample aligned to seqLen if user hasn't changed it
  useEffect(() => {
    if (tokensPerSample === seqLen) return;
    // do nothing — keep user edits intact
  }, [seqLen]); // eslint-disable-line

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>AI/ML Training – Methodology</div>
          <div style={styles.hSubtitle}>
            Clear, auditable mapping from dataset + training strategy → GPU-hours, checkpoint storage, and host
            translations.
          </div>
        </div>

        <Toggle value={showPlayground} onChange={setShowPlayground} label="Show playground" />
      </div>

      <div style={styles.grid}>
        <Card title="A) Scope & goal" subtitle="What this page sizes" right={<Pill>Scope</Pill>}>
          <ul style={styles.ul}>
            <li>Estimate GPU-hours required to complete training runs (analytic + empirical).</li>
            <li>Estimate checkpoint storage and basic host resource translation (CPU, RAM).</li>
            <li>Surface assumptions reviewers must confirm (tokens/KB, steps/sec, GPUs in global batch).</li>
          </ul>
        </Card>

        <Card title="Variables & units" subtitle="Key knobs reviewers must confirm" right={<Pill>Audit</Pill>}>
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
                {[
                  ["datasetTB", "TB", "Raw dataset size (approx); indicate compressed vs uncompressed"],
                  ["tokens_per_KB", "tokens/KB", "Tokens per KB of text (approx)"],
                  ["total_training_tokens", "tokens", "dataset_tokens × epochs"],
                  ["global_batch_tokens", "tokens/step", "Effective global tokens processed per training step (accumulated batch)"],
                  ["steps_per_second", "steps/sec", "Empirical or benchmarked steps per second for the global batch"],
                  ["gpu_hours", "GPU-hours", "Total GPU-hours required (analytic or empirical)"],
                  ["avgRunGPUhours", "GPU-hours/run", "Empirical GPU-hours for a job/run if available"],
                  ["checkpointGB", "GB", "Checkpoint size per snapshot"],
                ].map((r) => (
                  <tr key={r[0]}>
                    <td style={styles.tdMono}>{r[0]}</td>
                    <td style={styles.td}>{r[1]}</td>
                    <td style={styles.td}>{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="B) Analytic math (tokens → steps → GPU-hours)" subtitle="Use this to reproduce the analytic estimate" right={<Pill>Math</Pill>}>
          <Eq>{`dataset_kb = datasetTB × 1e9
total_tokens = dataset_kb × tokens_per_KB × compression_ratio
total_training_tokens = total_tokens × epochs
total_steps = total_training_tokens ÷ global_batch_tokens
seconds_per_step = 1 ÷ steps_per_second
gpu_hours = total_steps × seconds_per_step × GPUs_in_global_batch ÷ 3600`}</Eq>
          <div style={{ color: "rgba(255,255,255,0.78)", marginTop: 8 }}>
            If you have an empirical job-level GPU-hours number (avgRunGPUhours), use it as a check or fallback.
          </div>
        </Card>

        <TraceTable steps={trace} />

        {showPlayground ? (
          <Card title="Quick-check playground" subtitle="Adjust inputs to validate GPU-hour estimates" right={<Pill>Play</Pill>}>
            <div style={styles.formGrid}>
              <Field label="datasetTB" value={datasetTB} onChange={(v) => setDatasetTB(clamp(v, 0, 1e6))} step="1" min={0} />
              <Field label="tokens_per_KB" value={tokensPerKB} onChange={(v) => setTokensPerKB(clamp(v, 0.01, 100))} step="0.01" min={0.01} />
              <Field label="dataset_compression_ratio" value={datasetCompressionRatio} onChange={(v) => setDatasetCompressionRatio(clamp(v, 0.1, 10))} step="0.1" min={0.1} />

              <Field label="epochs" value={epochs} onChange={(v) => setEpochs(clamp(v, 1, 1000))} step="1" min={1} />
              <Field label="seq_len" value={seqLen} onChange={(v) => setSeqLen(clamp(v, 1, 1e6))} step="1" min={1} />
              <Field label="global_batch_tokens" value={batchSizeGlobal} onChange={(v) => setBatchSizeGlobal(clamp(v, 1, 1e9))} step="128" min={1} />

              <Field label="steps_per_second" value={stepsPerSecond} onChange={(v) => setStepsPerSecond(clamp(v, 0.0001, 10))} step="0.01" min={0.0001} />
              <Field label="GPUs_in_global_batch (approx)" value={gpuPerNode} onChange={(v) => setGpuPerNode(clamp(v, 1, 8192))} step="1" min={1} />
              <Field label="avgRunGPUhours" value={avgRunGPUhours} onChange={(v) => setAvgRunGPUhours(clamp(v, 0, 1e6))} step="1" min={0} />

              <Field label="runsPerMonth" value={runsPerMonth} onChange={(v) => setRunsPerMonth(clamp(v, 0, 100))} step="1" min={0} />
              <Field label="checkpointGB" value={checkpointGB} onChange={(v) => setCheckpointGB(clamp(v, 0, 1e6))} step="1" min={0} />
              <Field label="checkpointRetention" value={checkpointRetention} onChange={(v) => setCheckpointRetention(clamp(v, 0, 100))} step="1" min={0} />

              <Field label="cpuCoresPerGpu" value={cpuCoresPerGpu} onChange={(v) => setCpuCoresPerGpu(clamp(v, 0, 1024))} step="1" min={0} />
              <Field label="ramGBPerGpu" value={ramGBPerGpu} onChange={(v) => setRamGBPerGpu(clamp(v, 0, 1e6))} step="8" min={0} />
            </div>

            <div style={styles.divider} />

            <div style={styles.kpiGrid}>
              <div style={styles.kpi}>
                <div style={styles.kpiLabel}>Total training tokens</div>
                <div style={styles.kpiValue}>{fmt(derived.totalTrainingTokens, 2)}</div>
                <div style={styles.kpiSub}>dataset × epochs (tokens)</div>
              </div>

              <div style={styles.kpi}>
                <div style={styles.kpiLabel}>Total steps (global)</div>
                <div style={styles.kpiValue}>{fmt(derived.totalSteps, 2)}</div>
                <div style={styles.kpiSub}>total_tokens ÷ global_batch_tokens</div>
              </div>

              <div style={styles.kpi}>
                <div style={styles.kpiLabel}>GPU-hours (analytic)</div>
                <div style={styles.kpiValue}>{fmt(derived.gpuHoursAnalyticCorrect, 2)}</div>
                <div style={styles.kpiSub}>analytic estimate</div>
              </div>

              <div style={styles.kpi}>
                <div style={styles.kpiLabel}>GPU-hours (empirical)</div>
                <div style={styles.kpiValue}>{fmt(derived.gpuHoursFromAvgRun, 2)}</div>
                <div style={styles.kpiSub}>avgRunGPUhours × runsPerMonth</div>
              </div>

              <div style={styles.kpi}>
                <div style={styles.kpiLabel}>GPU-hours (chosen)</div>
                <div style={styles.kpiValue}>{fmt(derived.gpuHoursCanonical, 2)}</div>
                <div style={styles.kpiSub}>canonical for capacity planning</div>
              </div>

              <div style={styles.kpi}>
                <div style={styles.kpiLabel}>Checkpoint storage (GB)</div>
                <div style={styles.kpiValue}>{fmt(derived.checkpointStorageGB, 2)}</div>
                <div style={styles.kpiSub}>checkpointGB × retention</div>
              </div>
            </div>
          </Card>
        ) : null}

        <Card title="Reviewer checklist" subtitle="What to confirm when auditing a training estimate" right={<Pill>Checklist</Pill>}>
          <ul style={styles.ul}>
            <li>
              Confirm dataset definition: raw vs cleaned vs tokenized. Is TB measured compressed or expanded?
            </li>
            <li>
              Confirm tokens_per_KB (or provide tokenized sample) so conversion is exact.
            </li>
            <li>
              Verify steps/sec is measured for the same global-batch and architecture used in planning.
            </li>
            <li>
              Check whether avgRunGPUhours exists (empirical job telemetry). Use it to ground-check analytic math.
            </li>
            <li>
              Document checkpoint retention and any additional storage (preprocessed shards, replays).
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
  header: { display: "flex", gap: 14, alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  hTitle: { fontSize: 22, fontWeight: 800, letterSpacing: 0.2 },
  hSubtitle: { marginTop: 6, maxWidth: 980, color: "rgba(255,255,255,0.72)", lineHeight: 1.35, fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    overflow: "hidden",
  },
  cardHeader: { padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontSize: 14, fontWeight: 800, letterSpacing: 0.2 },
  cardSubtitle: { marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.65)" },
  cardRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  cardBody: { padding: 14 },
  pill: { display: "inline-flex", alignItems: "center", padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.18)", fontSize: 11, color: "rgba(255,255,255,0.82)" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 },
  formField: { border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 10, minWidth: 0 },
  label: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginBottom: 8 },
  input: { width: "100%", padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.92)", outline: "none", fontSize: 13, boxSizing: "border-box" },
  toggleWrap: { display: "flex", alignItems: "center", gap: 10, userSelect: "none" },
  toggleLabel: { fontSize: 12, color: "rgba(255,255,255,0.75)" },
  toggleBtn: { width: 44, height: 24, borderRadius: 999, border: "1px solid rgba(255,255,255,0.16)", position: "relative", cursor: "pointer", padding: 2 },
  toggleKnob: { width: 20, height: 20, borderRadius: 999, background: "rgba(255,255,255,0.88)", display: "block", transition: "transform 160ms ease" },
  toggleOn: { background: "rgba(70,130,200,0.22)", border: "1px solid rgba(120,200,255,0.28)" },
  toggleOff: { background: "rgba(0,0,0,0.25)" },
  divider: { height: 1, background: "rgba(255,255,255,0.10)", margin: "12px 0" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 10 },
  kpi: { padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", minWidth: 0 },
  kpiLabel: { fontSize: 11, color: "rgba(255,255,255,0.62)", marginBottom: 6 },
  kpiValue: { fontSize: 18, fontWeight: 800, letterSpacing: 0.2 },
  kpiSub: { marginTop: 6, fontSize: 11.5, color: "rgba(255,255,255,0.62)" },
  tableWrap: { overflowX: "auto", borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 640 },
  th: { textAlign: "left", padding: "10px 12px", fontSize: 11, color: "rgba(255,255,255,0.70)", borderBottom: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", fontSize: 12.5, color: "rgba(255,255,255,0.82)", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  tdMono: { padding: "10px 12px", fontSize: 12.2, color: "rgba(255,255,255,0.86)", borderBottom: "1px solid rgba(255,255,255,0.08)", fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace', whiteSpace: "nowrap" },
  ul: { margin: 0, paddingLeft: 18, color: "rgba(255,255,255,0.82)", lineHeight: 1.45, fontSize: 13 },
  eq: { margin: "0 0 10px 0", padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.28)", overflowX: "auto" },
  code: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace', fontSize: 12.5, color: "rgba(255,255,255,0.88)" },
};