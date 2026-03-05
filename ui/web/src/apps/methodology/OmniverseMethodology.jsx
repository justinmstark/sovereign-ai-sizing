// File: src/apps/methodology/OmniverseMethodology.jsx
import React, { useMemo, useState } from "react";

/**
 * OmniverseMethodology.jsx
 * Transparent, reviewer-friendly methodology page for Omniverse sizing.
 * - No Tailwind
 * - Self-contained styling (dark theme)
 * - Includes:
 *   1) Variables & Units table
 *   2) Step-by-step Calculation Trace table
 *   3) Optional “quick-check playground”
 *
 * This page provides an auditable baseline model:
 * - GPU sizing uses TWO constraints: annual GPU-hours and peak concurrency packing
 * - Nucleus sizing is a tiered CPU/RAM scaling unit (explicit factor)
 * - Storage sums: assets × versioning + cache + snapshots + metadata + logs retention
 * - Network is peak egress from creator/reviewer bitrate
 *
 * If your production calculator has exact tier tables/multipliers, replace the factor functions below
 * and mirror them in Variables + Trace.
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
      <select
        style={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
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
          <div style={styles.cardSubtitle}>
            Step-by-step breakdown that can be reproduced externally
          </div>
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

// Simple tier factors (replace with your calculator’s real mapping if needed)
function renderTierFactor(tier) {
  if (tier === "basic") return 0.85;
  if (tier === "standard") return 1.0;
  if (tier === "pro") return 1.3;
  if (tier === "cinematic") return 1.7;
  return 1.0;
}

function nucleusTierFactor(tier) {
  if (tier === "small") return 0.9;
  if (tier === "standard") return 1.0;
  if (tier === "large") return 1.25;
  if (tier === "xlarge") return 1.55;
  return 1.0;
}

export default function OmniverseMethodology() {
  const [showPlayground, setShowPlayground] = useState(true);

  // ---- Sessions / demand ----
  const [concurrentCreators, setConcurrentCreators] = useState(25);
  const [concurrentReviewers, setConcurrentReviewers] = useState(40);
  const [reviewerWeight, setReviewerWeight] = useState(0.35);

  // ---- Utilization / packing ----
  const [targetGpuUtil, setTargetGpuUtil] = useState(0.65);
  const [sessionsPerGpu, setSessionsPerGpu] = useState(5);
  const [redundancyFactor, setRedundancyFactor] = useState(1.15);

  // ---- GPU-hours model ----
  const [dutyCycle, setDutyCycle] = useState(0.35); // fraction of day sessions active
  const [gpuHoursPerSessionHour, setGpuHoursPerSessionHour] = useState(0.28);
  const [renderTier, setRenderTier] = useState("standard");

  // ---- Nucleus sizing ----
  const [nucleusTier, setNucleusTier] = useState("standard");
  const [nucleusBaseCpuCores, setNucleusBaseCpuCores] = useState(32);
  const [nucleusBaseRamGB, setNucleusBaseRamGB] = useState(256);

  // ---- Render host translation (per GPU) ----
  const [cpuCoresPerGpu, setCpuCoresPerGpu] = useState(12);
  const [ramGBPerGpu, setRamGBPerGpu] = useState(96);

  // ---- Storage ----
  const [sourceAssetsTB, setSourceAssetsTB] = useState(12);
  const [versioningOverheadPct, setVersioningOverheadPct] = useState(0.35);
  const [cacheTB, setCacheTB] = useState(4);
  const [snapshotsTB, setSnapshotsTB] = useState(6);
  const [metadataGB, setMetadataGB] = useState(120);
  const [logsGBPerDay, setLogsGBPerDay] = useState(40);
  const [logRetentionDays, setLogRetentionDays] = useState(30);

  // ---- Network ----
  const [avgStreamMbpsPerCreator, setAvgStreamMbpsPerCreator] = useState(18);
  const [avgStreamMbpsPerReviewer, setAvgStreamMbpsPerReviewer] = useState(10);

  const derived = useMemo(() => {
    const HOURS_PER_YEAR = 8760;
    const daysPerYear = 365;

    const effectiveConcurrentSessions =
      concurrentCreators + concurrentReviewers * reviewerWeight;

    const renderFactor = renderTierFactor(renderTier);

    const annualSessionHours =
      effectiveConcurrentSessions * (24 * dutyCycle) * daysPerYear;

    const annualGpuHours = annualSessionHours * gpuHoursPerSessionHour * renderFactor;

    const requiredGpusByHours =
      targetGpuUtil > 0 ? annualGpuHours / (HOURS_PER_YEAR * targetGpuUtil) : NaN;

    const requiredGpusByConcurrency =
      sessionsPerGpu > 0 ? effectiveConcurrentSessions / sessionsPerGpu : NaN;

    const requiredGpusBase = Math.max(requiredGpusByHours, requiredGpusByConcurrency);
    const requiredGpusFinal = requiredGpusBase * redundancyFactor;

    const renderCpuCores = requiredGpusFinal * cpuCoresPerGpu;
    const renderRamGB = requiredGpusFinal * ramGBPerGpu;

    const nucFactor = nucleusTierFactor(nucleusTier);
    const nucleusCpuCores = nucleusBaseCpuCores * nucFactor;
    const nucleusRamGB = nucleusBaseRamGB * nucFactor;

    const versioningFactor = 1 + versioningOverheadPct;
    const logStorageGB = logsGBPerDay * logRetentionDays;

    const totalStorageTB =
      sourceAssetsTB * versioningFactor +
      cacheTB +
      snapshotsTB +
      metadataGB / 1024.0 +
      logStorageGB / 1024.0;

    const peakMbps =
      concurrentCreators * avgStreamMbpsPerCreator +
      concurrentReviewers * avgStreamMbpsPerReviewer;
    const peakGbps = peakMbps / 1000.0;

    return {
      HOURS_PER_YEAR,
      daysPerYear,
      effectiveConcurrentSessions,
      renderFactor,
      annualSessionHours,
      annualGpuHours,
      requiredGpusByHours,
      requiredGpusByConcurrency,
      requiredGpusBase,
      requiredGpusFinal,
      renderCpuCores,
      renderRamGB,
      nucFactor,
      nucleusCpuCores,
      nucleusRamGB,
      versioningFactor,
      logStorageGB,
      totalStorageTB,
      peakMbps,
      peakGbps,
    };
  }, [
    concurrentCreators,
    concurrentReviewers,
    reviewerWeight,
    dutyCycle,
    gpuHoursPerSessionHour,
    renderTier,
    targetGpuUtil,
    sessionsPerGpu,
    redundancyFactor,
    cpuCoresPerGpu,
    ramGBPerGpu,
    nucleusTier,
    nucleusBaseCpuCores,
    nucleusBaseRamGB,
    sourceAssetsTB,
    versioningOverheadPct,
    cacheTB,
    snapshotsTB,
    metadataGB,
    logsGBPerDay,
    logRetentionDays,
    avgStreamMbpsPerCreator,
    avgStreamMbpsPerReviewer,
  ]);

  const traceSteps = useMemo(() => {
    const val = (x) => (Number.isFinite(x) ? x.toFixed(6) : "—");
    const tb = (x) => (Number.isFinite(x) ? x.toFixed(4) : "—");
    return [
      {
        label: "Effective_Concurrent_Sessions",
        expr: "concurrentCreators + (concurrentReviewers × reviewerWeight)",
        value: val(derived.effectiveConcurrentSessions),
      },
      {
        label: "Annual_Session_Hours",
        expr: "Effective_Concurrent_Sessions × (24 × dutyCycle) × 365",
        value: val(derived.annualSessionHours),
      },
      {
        label: "Render_Factor",
        expr: "tier(basic/standard/pro/cinematic)",
        value: val(derived.renderFactor),
      },
      {
        label: "Annual_GPU_Hours",
        expr: "Annual_Session_Hours × gpuHoursPerSessionHour × Render_Factor",
        value: val(derived.annualGpuHours),
      },
      {
        label: "Required_GPUs_by_Hours",
        expr: "Annual_GPU_Hours ÷ (8,760 × target_gpu_utilization)",
        value: val(derived.requiredGpusByHours),
      },
      {
        label: "Required_GPUs_by_Concurrency",
        expr: "Effective_Concurrent_Sessions ÷ sessionsPerGpu",
        value: val(derived.requiredGpusByConcurrency),
      },
      {
        label: "Required_GPUs_Base",
        expr: "max(Required_GPUs_by_Hours, Required_GPUs_by_Concurrency)",
        value: val(derived.requiredGpusBase),
      },
      {
        label: "Required_GPUs_Final",
        expr: "Required_GPUs_Base × redundancyFactor",
        value: val(derived.requiredGpusFinal),
      },
      {
        label: "Render_CPU_Cores",
        expr: "Required_GPUs_Final × cpuCoresPerGpu",
        value: val(derived.renderCpuCores),
      },
      {
        label: "Render_RAM_GB",
        expr: "Required_GPUs_Final × ramGBPerGpu",
        value: val(derived.renderRamGB),
      },
      {
        label: "Nucleus_Factor",
        expr: "tier(small/standard/large/xlarge)",
        value: val(derived.nucFactor),
      },
      {
        label: "Nucleus_CPU_Cores",
        expr: "nucleusBaseCpuCores × Nucleus_Factor",
        value: val(derived.nucleusCpuCores),
      },
      {
        label: "Nucleus_RAM_GB",
        expr: "nucleusBaseRamGB × Nucleus_Factor",
        value: val(derived.nucleusRamGB),
      },
      {
        label: "Versioning_Factor",
        expr: "1 + versioningOverheadPct",
        value: val(derived.versioningFactor),
      },
      {
        label: "Log_Storage_GB",
        expr: "logsGBPerDay × logRetentionDays",
        value: val(derived.logStorageGB),
      },
      {
        label: "Total_Storage_TB",
        expr:
          "(sourceAssetsTB × Versioning_Factor) + cacheTB + snapshotsTB + (metadataGB/1024) + (Log_Storage_GB/1024)",
        value: tb(derived.totalStorageTB),
      },
      {
        label: "Peak_Egress_Gbps",
        expr:
          "((concurrentCreators × avgStreamMbpsPerCreator) + (concurrentReviewers × avgStreamMbpsPerReviewer)) ÷ 1000",
        value: val(derived.peakGbps),
      },
    ];
  }, [derived]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>Omniverse – Methodology</div>
          <div style={styles.hSubtitle}>
            Transparent conversion from Omniverse collaboration demand into{" "}
            <Pill>GPU render capacity</Pill>, <Pill>Nucleus</Pill> sizing,{" "}
            <Pill>Storage</Pill>, and <Pill>Network</Pill>.
          </div>
        </div>
        <Toggle value={showPlayground} onChange={setShowPlayground} label="Show playground" />
      </div>

      <div style={styles.grid}>
        <Card title="A) Architecture being sized" subtitle="Common Omniverse building blocks" right={<Pill>Scope</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>Kit / Streaming</b>: interactive creation + review/view sessions (GPU + network).
            </li>
            <li>
              <b>Nucleus</b>: collaboration, versioning, indexing, metadata services (CPU/RAM + storage).
            </li>
            <li>
              <b>Storage</b>: USD assets, caches, snapshots/DR, metadata and logs.
            </li>
            <li>
              <b>Network</b>: streaming bitrate × concurrency (peak egress planning).
            </li>
          </ul>
          <Small>
            If you include Farm/Replicator/Simulation compute, treat it as a separate tier with its
            own GPU-hours/CPU-hours model.
          </Small>
        </Card>

        <VariablesCard
          rows={[
            { name: "concurrentCreators", unit: "sessions", meaning: "Peak concurrent creator sessions (higher GPU cost)" },
            { name: "concurrentReviewers", unit: "sessions", meaning: "Peak concurrent review/view sessions (lower GPU cost)" },
            { name: "reviewerWeight", unit: "multiplier", meaning: "Reviewer session cost relative to creator session cost" },
            { name: "dutyCycle", unit: "0–1", meaning: "Fraction of day sessions are actively consuming GPU (vs idle)" },
            { name: "gpuHoursPerSessionHour", unit: "GPU-hours/session-hour", meaning: "GPU cost for one active session-hour at standard fidelity" },
            { name: "renderTier", unit: "tier", meaning: "Quality/fidelity tier (basic/standard/pro/cinematic) mapped to a factor" },
            { name: "target_gpu_utilization", unit: "0–1", meaning: "Planned usable utilization (headroom included)" },
            { name: "sessionsPerGpu", unit: "sessions/GPU", meaning: "Packing limit for concurrent sessions per GPU" },
            { name: "redundancyFactor", unit: "multiplier", meaning: "Extra headroom for N+1 / maintenance / failure domains" },
            { name: "cpuCoresPerGpu", unit: "cores/GPU", meaning: "Render host CPU cores per GPU" },
            { name: "ramGBPerGpu", unit: "GB/GPU", meaning: "Render host RAM per GPU" },
            { name: "nucleusTier", unit: "tier", meaning: "Nucleus sizing tier mapped to a factor" },
            { name: "nucleusBaseCpuCores", unit: "cores", meaning: "Baseline Nucleus CPU cores at standard tier" },
            { name: "nucleusBaseRamGB", unit: "GB", meaning: "Baseline Nucleus RAM at standard tier" },
            { name: "sourceAssetsTB", unit: "TB", meaning: "Primary asset footprint (USD, textures, CAD, etc.)" },
            { name: "versioningOverheadPct", unit: "0–∞", meaning: "Extra storage from branches/deltas/duplication (e.g., 0.35 = +35%)" },
            { name: "cacheTB", unit: "TB", meaning: "Compiled/stream caches and mirrors" },
            { name: "snapshotsTB", unit: "TB", meaning: "Snapshots/backup/DR copies as TB term" },
            { name: "metadataGB", unit: "GB", meaning: "Index/search/metadata DB and related stores" },
            { name: "logsGBPerDay", unit: "GB/day", meaning: "Log/telemetry volume produced per day" },
            { name: "logRetentionDays", unit: "days", meaning: "Retention period for logs/telemetry" },
            { name: "avgStreamMbpsPerCreator", unit: "Mbps/session", meaning: "Average streaming bitrate per creator session at peak" },
            { name: "avgStreamMbpsPerReviewer", unit: "Mbps/session", meaning: "Average streaming bitrate per reviewer session at peak" },
          ]}
        />

        <Card title="B) Effective concurrent sessions" subtitle="Creators + weighted reviewers" right={<Pill>Demand</Pill>}>
          <Eq>{`Effective_Concurrent_Sessions =
  concurrentCreators + (concurrentReviewers × reviewerWeight)`}</Eq>
          <Hint>
            Review-only sessions often cost less. Weighting makes the model auditable without needing
            separate GPU tiers.
          </Hint>
        </Card>

        <Card title="C) Sessions → annual GPU-hours" subtitle="Session-hours × GPU cost × render tier" right={<Pill>Compute</Pill>}>
          <Eq>{`Annual_Session_Hours =
  Effective_Concurrent_Sessions × (24 × dutyCycle) × 365

Render_Factor = tier(renderTier)

Annual_GPU_Hours =
  Annual_Session_Hours × gpuHoursPerSessionHour × Render_Factor`}</Eq>
        </Card>

        <Card title="D) GPUs from demand + utilization" subtitle="Convert GPU-hours to GPUs" right={<Pill>Capacity</Pill>}>
          <Eq>{`Hours_Per_Year = 8,760

Required_GPUs_by_Hours =
  Annual_GPU_Hours / (Hours_Per_Year × target_gpu_utilization)`}</Eq>
        </Card>

        <Card title="E) Peak packing constraint" subtitle="Sessions per GPU" right={<Pill>Concurrency</Pill>}>
          <Eq>{`Required_GPUs_by_Concurrency =
  Effective_Concurrent_Sessions / sessionsPerGpu

Required_GPUs_Base =
  max(Required_GPUs_by_Hours, Required_GPUs_by_Concurrency)`}</Eq>
        </Card>

        <Card title="F) Redundancy / N+1" subtitle="Headroom for failures and maintenance" right={<Pill>Resilience</Pill>}>
          <Eq>{`Required_GPUs_Final =
  Required_GPUs_Base × redundancyFactor`}</Eq>
        </Card>

        <Card title="G) Render host CPU/RAM translation" subtitle="Derived from GPU count" right={<Pill>Host</Pill>}>
          <Eq>{`Render_CPU_Cores =
  Required_GPUs_Final × cpuCoresPerGpu

Render_RAM_GB =
  Required_GPUs_Final × ramGBPerGpu`}</Eq>
        </Card>

        <Card title="H) Nucleus host sizing" subtitle="Tier-based scaling unit" right={<Pill>Nucleus</Pill>}>
          <Eq>{`Nucleus_Factor = tier(nucleusTier)

Nucleus_CPU_Cores =
  nucleusBaseCpuCores × Nucleus_Factor

Nucleus_RAM_GB =
  nucleusBaseRamGB × Nucleus_Factor`}</Eq>
        </Card>

        <Card title="I) Storage model" subtitle="Assets + versioning + cache + snapshots + metadata + logs" right={<Pill>Storage</Pill>}>
          <Eq>{`Versioning_Factor =
  1 + versioningOverheadPct

Log_Storage_GB =
  logsGBPerDay × logRetentionDays

Total_Storage_TB =
  (sourceAssetsTB × Versioning_Factor)
  + cacheTB
  + snapshotsTB
  + (metadataGB / 1024)
  + (Log_Storage_GB / 1024)`}</Eq>
        </Card>

        <Card title="J) Network sizing (peak)" subtitle="Bitrate × concurrency" right={<Pill>Network</Pill>}>
          <Eq>{`Peak_Egress_Mbps =
  (concurrentCreators × avgStreamMbpsPerCreator)
  + (concurrentReviewers × avgStreamMbpsPerReviewer)

Peak_Egress_Gbps =
  Peak_Egress_Mbps / 1000`}</Eq>
        </Card>

        <TraceTable steps={traceSteps} />

        {showPlayground ? (
          <Card title="Quick-check playground" subtitle="Change inputs to validate outputs match your calculator" right={<Pill>Audit</Pill>}>
            <div style={styles.formGrid}>
              <Field label="concurrentCreators" value={concurrentCreators} onChange={setConcurrentCreators} min={0} />
              <Field label="concurrentReviewers" value={concurrentReviewers} onChange={setConcurrentReviewers} min={0} />
              <Field
                label="reviewerWeight"
                value={reviewerWeight}
                onChange={(v) => setReviewerWeight(clamp(v, 0, 2))}
                step="0.05"
                min={0}
                max={2}
              />

              <Field
                label="dutyCycle"
                value={dutyCycle}
                onChange={(v) => setDutyCycle(clamp(v, 0, 1))}
                step="0.05"
                min={0}
                max={1}
              />
              <Field
                label="gpuHoursPerSessionHour"
                value={gpuHoursPerSessionHour}
                onChange={(v) => setGpuHoursPerSessionHour(clamp(v, 0, 10))}
                step="0.05"
                min={0}
              />
              <Select
                label="renderTier"
                value={renderTier}
                onChange={setRenderTier}
                options={[
                  { label: "Basic (0.85x)", value: "basic" },
                  { label: "Standard (1.0x)", value: "standard" },
                  { label: "Pro (1.3x)", value: "pro" },
                  { label: "Cinematic (1.7x)", value: "cinematic" },
                ]}
              />

              <Field
                label="target_gpu_utilization"
                value={targetGpuUtil}
                onChange={(v) => setTargetGpuUtil(clamp(v, 0.05, 0.95))}
                step="0.05"
                min={0.05}
                max={0.95}
              />
              <Field
                label="sessionsPerGpu"
                value={sessionsPerGpu}
                onChange={(v) => setSessionsPerGpu(clamp(v, 1, 999))}
                min={1}
              />
              <Field
                label="redundancyFactor"
                value={redundancyFactor}
                onChange={(v) => setRedundancyFactor(clamp(v, 1.0, 2.0))}
                step="0.05"
                min={1.0}
                max={2.0}
              />

              <Select
                label="nucleusTier"
                value={nucleusTier}
                onChange={setNucleusTier}
                options={[
                  { label: "Small (0.9x)", value: "small" },
                  { label: "Standard (1.0x)", value: "standard" },
                  { label: "Large (1.25x)", value: "large" },
                  { label: "XLarge (1.55x)", value: "xlarge" },
                ]}
              />
              <Field
                label="nucleusBaseCpuCores"
                value={nucleusBaseCpuCores}
                onChange={(v) => setNucleusBaseCpuCores(clamp(v, 0, 4096))}
                min={0}
              />
              <Field
                label="nucleusBaseRamGB"
                value={nucleusBaseRamGB}
                onChange={(v) => setNucleusBaseRamGB(clamp(v, 0, 65536))}
                min={0}
              />

              <Field label="cpuCoresPerGpu" value={cpuCoresPerGpu} onChange={(v) => setCpuCoresPerGpu(clamp(v, 0, 256))} min={0} />
              <Field label="ramGBPerGpu" value={ramGBPerGpu} onChange={(v) => setRamGBPerGpu(clamp(v, 0, 4096))} min={0} />
              <div style={styles.formField} />

              <Field label="sourceAssetsTB" value={sourceAssetsTB} onChange={setSourceAssetsTB} step="0.5" min={0} />
              <Field
                label="versioningOverheadPct"
                value={versioningOverheadPct}
                onChange={(v) => setVersioningOverheadPct(clamp(v, 0, 5))}
                step="0.05"
                min={0}
                max={5}
              />
              <Field label="cacheTB" value={cacheTB} onChange={setCacheTB} step="0.5" min={0} />

              <Field label="snapshotsTB" value={snapshotsTB} onChange={setSnapshotsTB} step="0.5" min={0} />
              <Field label="metadataGB" value={metadataGB} onChange={setMetadataGB} step="10" min={0} />
              <Field label="logsGBPerDay" value={logsGBPerDay} onChange={setLogsGBPerDay} step="5" min={0} />

              <Field
                label="logRetentionDays"
                value={logRetentionDays}
                onChange={(v) => setLogRetentionDays(clamp(v, 0, 3650))}
                step="5"
                min={0}
              />
              <Field
                label="avgStreamMbpsPerCreator"
                value={avgStreamMbpsPerCreator}
                onChange={(v) => setAvgStreamMbpsPerCreator(clamp(v, 0, 200))}
                step="1"
                min={0}
              />
              <Field
                label="avgStreamMbpsPerReviewer"
                value={avgStreamMbpsPerReviewer}
                onChange={(v) => setAvgStreamMbpsPerReviewer(clamp(v, 0, 200))}
                step="1"
                min={0}
              />
            </div>

            <Divider />

            <div style={styles.kpiGrid}>
              <Kpi
                label="Effective concurrent sessions"
                value={fmtNum(derived.effectiveConcurrentSessions, 2)}
                sub={`${concurrentCreators} + (${concurrentReviewers} × ${reviewerWeight})`}
              />
              <Kpi label="Annual GPU-hours" value={fmtNum(derived.annualGpuHours, 2)} sub="Session-hours × GPU cost × tier" />
              <Kpi label="Final GPUs (with redundancy)" value={fmtNum(derived.requiredGpusFinal, 2)} sub={`Base × ${redundancyFactor}`} />

              <Kpi label="Render CPU cores" value={fmtNum(derived.renderCpuCores, 1)} sub={`${cpuCoresPerGpu} cores/GPU`} />
              <Kpi label="Render RAM (GB)" value={fmtNum(derived.renderRamGB, 1)} sub={`${ramGBPerGpu} GB/GPU`} />
              <Kpi label="Nucleus RAM (GB)" value={fmtNum(derived.nucleusRamGB, 1)} sub={`Tier factor ${fmtNum(derived.nucFactor, 2)}`} />

              <Kpi label="Total storage (TB)" value={fmtNum(derived.totalStorageTB, 2)} sub="Assets+versioning+cache+snapshots+logs" />
              <Kpi label="Peak egress (Gbps)" value={fmtNum(derived.peakGbps, 3)} sub={`${fmtNum(derived.peakMbps, 1)} Mbps`} />
              <div style={styles.kpi} />
            </div>

            <Hint>
              If your production calculator rounds GPUs/nodes up or enforces minimum cluster sizes,
              state that explicitly as an output policy (and show raw vs rounded).
            </Hint>
          </Card>
        ) : null}

        <Card title="Common reviewer questions" subtitle="What to document if asked" right={<Pill>Notes</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>Benchmarks</b>: how <Pill>gpuHoursPerSessionHour</Pill> was measured (resolution/fps/scene/codec).
            </li>
            <li>
              <b>Concurrency</b>: creators vs reviewers, and why <Pill>reviewerWeight</Pill> is chosen.
            </li>
            <li>
              <b>Nucleus scale</b>: what drives tier selection (users, repos, ops/sec, indexing).
            </li>
            <li>
              <b>Storage copies</b>: snapshots/DR/replication policy and retention.
            </li>
            <li>
              <b>Network</b>: bitrate assumptions and peak vs average planning.
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
  hTitle: {
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  hSubtitle: {
    marginTop: 6,
    maxWidth: 980,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.35,
    fontSize: 13,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
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
  cardTitle: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 1.3,
  },
  cardRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  cardBody: {
    padding: 14,
  },
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
  ul: {
    margin: 0,
    paddingLeft: 18,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.45,
    fontSize: 13,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.10)",
    margin: "12px 0",
  },
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
  small: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12.5,
    lineHeight: 1.35,
  },
  toggleWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    userSelect: "none",
  },
  toggleLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    whiteSpace: "nowrap",
  },
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
  toggleOn: {
    background: "rgba(70,130,200,0.22)",
    border: "1px solid rgba(120,200,255,0.28)",
  },
  toggleOff: {
    background: "rgba(0,0,0,0.25)",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  formField: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 10,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 8,
  },
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

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  kpi: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    minWidth: 0,
  },
  kpiLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.62)",
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.2,
  },
  kpiSub: {
    marginTop: 6,
    fontSize: 11.5,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 1.25,
  },

  // Tables
  tableWrap: {
    overflowX: "auto",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720,
  },
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