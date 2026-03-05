// File: src/apps/training/AIMLTrainingApp.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./AIMLTrainingApp.css";

/**
 * AI/ML Model Training — workload capture + derived sizing
 * Layout: 3 columns (Workloads | Workload details (Steps 1–6) | Derived demand)
 * Persisted to localStorage.
 */

const LS_KEY = "sovereign_ai_aiml_training_v1";

const TRAINING_TYPES = [
  { id: "CPU_ONLY", label: "CPU-only (Tabular ML / Feature Engineering)" },
  { id: "SINGLE_GPU", label: "Single-node GPU training" },
  { id: "MULTI_GPU", label: "Multi-GPU (single node)" },
  { id: "MULTI_NODE", label: "Multi-node distributed training" },
];

const FRAMEWORKS = [
  "PyTorch",
  "TensorFlow",
  "XGBoost",
  "LightGBM",
  "scikit-learn",
  "CatBoost",
  "Other",
];

const DATA_FORMATS = ["Parquet", "CSV", "Images", "Audio", "Video", "Other"];
const DATA_LOCALITY = ["Object storage", "NFS", "Block", "Local NVMe", "Other"];

const HPO_LEVELS = [
  { id: "NONE", label: "None" },
  { id: "LIGHT", label: "Light (≤20 trials)" },
  { id: "MEDIUM", label: "Medium (20–100 trials)" },
  { id: "HEAVY", label: "Heavy (100+ trials)" },
];

const PRECISIONS = ["FP32", "TF32", "FP16/BF16", "Other"];
const GOVERNANCE = ["Public", "Internal", "Confidential", "Restricted"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function clampNum(v, min = 0, max = Number.POSITIVE_INFINITY) {
  const n = Number(v);
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function fmt(n, digits = 0) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return x.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function gbToTb(gb) {
  return gb / 1024;
}

/**
 * Default assumptions / multipliers
 * (Keep these explicit + adjustable so sizing is transparent.)
 */
const DEFAULTS = {
  cpuPerJob: 32,
  ramPerJobGB: 256,
  gpusPerJob: 4,
  avgRunHours: 6,
  runsPerMonth: 20,
  concurrentJobs: 2,
  datasetRawGB: 2000,
  workingSetMultiplier: 2.0, // processed + caches
  checkpointGBPerRun: 40, // DL-heavy; near-zero for CPU ML typically
  logsGBPerRun: 2,
  hpoTrialMultiplier: {
    NONE: 1,
    LIGHT: 1.2,
    MEDIUM: 2.5,
    HEAVY: 6,
  },
};

function inferArchetype(w) {
  switch (w.trainingType) {
    case "CPU_ONLY":
      return "CPU ML Training Pod";
    case "SINGLE_GPU":
      return "Single-Node GPU Training Pod";
    case "MULTI_GPU":
      return "Single-Node Multi-GPU Training Pod";
    case "MULTI_NODE":
      return "Multi-Node GPU Training Pod";
    default:
      return "AI/ML Training Pod";
  }
}

function networkClass(w) {
  if (w.trainingType === "MULTI_NODE")
    return "Low-latency fabric (RoCE/IB class), 200–400Gb";
  if (w.trainingType === "MULTI_GPU")
    return "High-throughput east-west, 100–200Gb";
  if (w.trainingType === "SINGLE_GPU") return "100Gb recommended (25Gb minimum)";
  return "25–100Gb (data ingest dependent)";
}

function storagePerformanceHint(w) {
  if (w.trainingType === "MULTI_NODE" || w.trainingType === "MULTI_GPU")
    return "High read throughput + metadata performance; NVMe scratch advised";
  if (w.hpoLevel === "HEAVY" || w.concurrentJobs >= 8)
    return "High IOPS for many small reads/writes; NVMe scratch + fast shared storage";
  return "Balanced throughput/IOPS; ensure strong dataset read performance";
}

function deriveSizing(w) {
  const runsPerMonth = clampNum(w.runsPerMonth, 0);
  const avgRunHours = clampNum(w.avgRunHours, 0);
  const concurrentJobs = clampNum(w.concurrentJobs, 0);

  const hpoMult = DEFAULTS.hpoTrialMultiplier[w.hpoLevel] ?? 1;
  const effectiveRuns = runsPerMonth * hpoMult;

  const cpuPerJob = clampNum(w.cpuPerJob, 0);
  const ramPerJobGB = clampNum(w.ramPerJobGB, 0);
  const gpusPerJob = clampNum(w.gpusPerJob, 0);

  const peakCPU = cpuPerJob * concurrentJobs;
  const peakRAMGB = ramPerJobGB * concurrentJobs;
  const peakGPU = (w.trainingType === "CPU_ONLY" ? 0 : gpusPerJob) * concurrentJobs;

  const cpuHours = effectiveRuns * avgRunHours * cpuPerJob;
  const gpuHours =
    effectiveRuns * avgRunHours * (w.trainingType === "CPU_ONLY" ? 0 : gpusPerJob);

  const datasetRawGB = clampNum(w.datasetRawGB, 0);
  const workingGB = datasetRawGB * clampNum(w.workingSetMultiplier, 1, 10);

  const checkpointGBPerRun = clampNum(w.checkpointGBPerRun, 0);
  const logsGBPerRun = clampNum(w.logsGBPerRun, 0);

  const checkpointsGB = effectiveRuns * checkpointGBPerRun;
  const logsGB = effectiveRuns * logsGBPerRun;

  const totalCapGB = datasetRawGB + workingGB + checkpointsGB + logsGB;

  const ioIntensity =
    (w.trainingType === "MULTI_NODE" ? 3 : 0) +
    (w.trainingType === "MULTI_GPU" ? 2 : 0) +
    (w.trainingType === "SINGLE_GPU" ? 1 : 0) +
    (w.hpoLevel === "HEAVY" ? 2 : 0) +
    (concurrentJobs >= 8 ? 1 : 0);

  const ioProfile =
    ioIntensity >= 5 ? "Very High" : ioIntensity >= 3 ? "High" : ioIntensity >= 2 ? "Medium" : "Low";

  return {
    effectiveRuns,
    peakCPU,
    peakRAMGB,
    peakGPU,
    cpuHours,
    gpuHours,
    datasetRawGB,
    workingGB,
    checkpointsGB,
    logsGB,
    totalCapGB,
    ioProfile,
    archetype: inferArchetype(w),
    network: networkClass(w),
    storageHint: storagePerformanceHint(w),
  };
}

/** ---------------------------
 * Help popups (FIXED)
 * --------------------------*/
function HelpTip({ text }) {
  const [open, setOpen] = React.useState(false);

  // Auto-close after 8 seconds
  React.useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      setOpen(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, [open]);

  // Close on Escape + outside click
  React.useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onDown = (e) => {
      if (e.target.closest(".tr-helpWrap")) return;
      setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  return (
    <span className="tr-helpWrap">
      <button
        type="button"
        className="tr-helpBtn"
        aria-expanded={open}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ?
      </button>

      {open && (
        <div
          className="tr-helpPopover"
          role="dialog"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="tr-helpText">{text}</div>

          <div className="tr-helpActions">
            <button
              type="button"
              className="tr-btn tr-btnSecondary tr-btnSm"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

function SectionTitle({ n, title, subtitle }) {
  return (
    <div className="tr-sectionTitle">
      <div className="tr-sectionTitleRow">
        <div className="tr-sectionTitleMain">
          {n}. {title}
        </div>
        {subtitle ? <div className="tr-sectionTitleSub">{subtitle}</div> : null}
      </div>
      <div className="tr-divider" />
    </div>
  );
}

function Field({ label, hint, help, children }) {
  return (
    <div className="tr-field">
      <div className="tr-fieldTop">
        <div className="tr-fieldLabelRow">
          <span className="tr-fieldLabelText">{label}</span>
          {help ? <HelpTip text={help} /> : null}
        </div>

        {hint ? <div className="tr-fieldHint">{hint}</div> : null}
      </div>

      {children}
    </div>
  );
}

function Input({ value, onChange, type = "text", min, step, placeholder }) {
  return (
    <input
      className="tr-input"
      type={type}
      min={min}
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select className="tr-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        )
      )}
    </select>
  );
}

function Card({ title, children, right }) {
  return (
    <div className="tr-card">
      <div className="tr-cardHeader">
        <div className="tr-cardTitle">{title}</div>
        <div className="tr-cardRight">{right}</div>
      </div>
      <div className="tr-cardBody">{children}</div>
    </div>
  );
}

function Pill({ children }) {
  return <span className="tr-pill">{children}</span>;
}

function StatTile({ label, value }) {
  return (
    <div className="tr-statTile">
      <div className="tr-statLabel">{label}</div>
      <div className="tr-statValue">{value}</div>
    </div>
  );
}

function makeNewWorkload() {
  return {
    id: uid(),
    name: "AI/ML Training Workload",
    description: "",
    // Step 1
    trainingType: "CPU_ONLY",
    framework: "XGBoost",
    precision: "FP32",

    // Step 2
    datasetRawGB: DEFAULTS.datasetRawGB,
    dataFormat: "Parquet",
    dataLocality: "Object storage",
    workingSetMultiplier: DEFAULTS.workingSetMultiplier,

    // Step 3
    runsPerMonth: DEFAULTS.runsPerMonth,
    avgRunHours: DEFAULTS.avgRunHours,
    concurrentJobs: DEFAULTS.concurrentJobs,
    hpoLevel: "NONE",

    // Step 4
    cpuPerJob: DEFAULTS.cpuPerJob,
    ramPerJobGB: DEFAULTS.ramPerJobGB,
    gpusPerJob: DEFAULTS.gpusPerJob,

    // Step 5
    checkpointGBPerRun: DEFAULTS.checkpointGBPerRun,
    logsGBPerRun: DEFAULTS.logsGBPerRun,

    // Step 6
    ttrHoursTarget: 0, // 0 = not specified
    governance: "Internal",
    namedSuppliers: [],
    namedSuppliersOther: "",
    notes: "",
  };
}

export default function AIMLTrainingApp() {
  const [workloads, setWorkloads] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [makeNewWorkload()];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return [makeNewWorkload()];
      return parsed;
    } catch {
      return [makeNewWorkload()];
    }
  });

  const [activeId, setActiveId] = useState(() => workloads?.[0]?.id);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(workloads));
  }, [workloads]);

  useEffect(() => {
    if (!workloads.find((w) => w.id === activeId)) {
      setActiveId(workloads?.[0]?.id);
    }
  }, [workloads, activeId]);

  const active = workloads.find((w) => w.id === activeId) ?? workloads[0];

  const derived = useMemo(() => (active ? deriveSizing(active) : null), [active]);

  const portfolio = useMemo(() => {
    const rows = workloads.map((w) => ({ w, d: deriveSizing(w) }));
    const peakGPU = Math.max(0, ...rows.map((r) => r.d.peakGPU));
    const peakCPU = Math.max(0, ...rows.map((r) => r.d.peakCPU));
    const peakRAMGB = Math.max(0, ...rows.map((r) => r.d.peakRAMGB));
    const gpuHours = rows.reduce((a, r) => a + r.d.gpuHours, 0);
    const cpuHours = rows.reduce((a, r) => a + r.d.cpuHours, 0);
    const storageGB = rows.reduce((a, r) => a + r.d.totalCapGB, 0);
    return { peakGPU, peakCPU, peakRAMGB, gpuHours, cpuHours, storageGB };
  }, [workloads]);

  function updateActive(patch) {
    setWorkloads((prev) => prev.map((w) => (w.id === activeId ? { ...w, ...patch } : w)));
  }

  function addWorkload() {
    const w = makeNewWorkload();
    setWorkloads((prev) => [w, ...prev]);
    setActiveId(w.id);
  }

  function duplicateWorkload(id) {
    const src = workloads.find((w) => w.id === id);
    if (!src) return;
    const copy = { ...src, id: uid(), name: `${src.name} (copy)` };
    setWorkloads((prev) => [copy, ...prev]);
    setActiveId(copy.id);
  }

  function removeWorkload(id) {
    setWorkloads((prev) => prev.filter((w) => w.id !== id));
  }

  return (
    <div className="tr-page">
      {/* Header */}
      <div className="tr-header">
        <div className="tr-headerInner">
          <div className="tr-headerLeft">
            <div className="tr-h1">AI/ML Model Training</div>
            <div className="tr-subtitle">
              Capture training workloads and derive compute, storage, and network demand.
            </div>
          </div>

          <div className="tr-headerRight">
            <Pill>Workloads: {workloads.length}</Pill>
            <Pill>
              Portfolio Peak: {fmt(portfolio.peakGPU)} GPUs · {fmt(portfolio.peakCPU)} vCPU ·{" "}
              {fmt(portfolio.peakRAMGB)} GB RAM
            </Pill>
            <Pill>
              Monthly: {fmt(portfolio.gpuHours)} GPU-hrs · {fmt(portfolio.cpuHours)} CPU-hrs ·{" "}
              {fmt(gbToTb(portfolio.storageGB), 1)} TB
            </Pill>

            <button className="tr-btn tr-btnPrimary" onClick={addWorkload}>
              + New workload
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="tr-main">
        <div className="tr-grid">
          {/* Left */}
          <div className="tr-colLeft">
            <Card
              title="Workloads"
              right={
                <button className="tr-btn tr-btnSecondary tr-btnSm" onClick={addWorkload}>
                  Add
                </button>
              }
            >
              <div className="tr-stack">
                {workloads.map((w) => {
                  const d = deriveSizing(w);
                  const isActive = w.id === activeId;
                  return (
                    <button
                      key={w.id}
                      className={`tr-workloadRow ${isActive ? "tr-workloadRowActive" : ""}`}
                      onClick={() => setActiveId(w.id)}
                    >
                      <div className="tr-workloadRowTop">
                        <div className="tr-workloadRowMain">
                          <div className="tr-workloadName" title={w.name}>
                            {w.name}
                          </div>
                          <div className="tr-pillRow">
                            <Pill>{inferArchetype(w)}</Pill>
                            <Pill>Peak {fmt(d.peakGPU)} GPU</Pill>
                            <Pill>{d.ioProfile} IO</Pill>
                          </div>
                        </div>

                        <div className="tr-workloadRowActions">
                          <button
                            className="tr-btn tr-btnSecondary tr-btnXs"
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateWorkload(w.id);
                            }}
                          >
                            Copy
                          </button>
                          <button
                            className="tr-btn tr-btnSecondary tr-btnXs"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeWorkload(w.id);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Middle */}
          <div className="tr-colMid">
            <Card title="Workload details (Steps 1–6)">
              {!active ? (
                <div className="tr-muted">No active workload.</div>
              ) : (
                <div className="tr-steps">
                  {/* Basic */}
                  <div className="tr-formGrid2">
                    <Field
                      label="Workload name"
                      help="A friendly name for this training workload. Keep it specific enough to recognise in portfolio rollups."
                    >
                      <Input
                        value={active.name}
                        onChange={(v) => updateActive({ name: v })}
                        placeholder="e.g., Fraud model retrain (XGBoost)"
                      />
                    </Field>

                    <Field
                      label="Framework"
                      help="The primary framework/library used for training. This influences whether the workload is CPU-leaning (tabular ML) or GPU-leaning (deep learning)."
                    >
                      <Select
                        value={active.framework}
                        onChange={(v) => updateActive({ framework: v })}
                        options={FRAMEWORKS}
                      />
                    </Field>

                    <div className="tr-span2">
                      <Field
                        label="Description"
                        hint="What is this training workload for?"
                        help="One sentence describing what the model does and what triggers training (e.g., weekly retrain, new data arrival, model drift)."
                      >
                        <Input
                          value={active.description}
                          onChange={(v) => updateActive({ description: v })}
                          placeholder="One sentence summary…"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Step 1 */}
                  <div>
                    <SectionTitle n={1} title="Training pattern" />
                    <div className="tr-formGrid3">
                      <Field
                        label="Training type"
                        help={
                          "CPU-only: best for XGBoost/LightGBM and heavy feature engineering.\n" +
                          "Single-node GPU: 1–8 GPUs in one server.\n" +
                          "Multi-GPU (single node): multiple GPUs in one server.\n" +
                          "Multi-node: distributed training across servers; requires low-latency fabric (RoCE/IB)."
                        }
                      >
                        <Select
                          value={active.trainingType}
                          onChange={(v) => updateActive({ trainingType: v })}
                          options={TRAINING_TYPES}
                        />
                      </Field>

                      <Field
                        label="Precision"
                        hint="If GPU training"
                        help={
                          "Precision affects throughput and memory.\n" +
                          "FP16/BF16 typically improves speed and reduces memory vs FP32.\n" +
                          "TF32 is common on NVIDIA for training with good accuracy/perf trade-off."
                        }
                      >
                        <Select
                          value={active.precision}
                          onChange={(v) => updateActive({ precision: v })}
                          options={PRECISIONS}
                        />
                      </Field>

                      <Field
                        label="Time-to-train target (hours)"
                        hint="0 = not specified"
                        help={
                          "Optional SLA for completing a training run.\n" +
                          "If you set this, you’re indicating a delivery constraint that may drive higher peak capacity."
                        }
                      >
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={active.ttrHoursTarget}
                          onChange={(v) => updateActive({ ttrHoursTarget: clampNum(v, 0) })}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div>
                    <SectionTitle n={2} title="Dataset and feature engineering" />
                    <div className="tr-formGrid3">
                      <Field
                        label="Raw dataset size (GB)"
                        help={
                          "Total size of the training dataset consumed per run.\n" +
                          "If the dataset grows over time, use a forward-looking size (e.g., 12–24 months)."
                        }
                      >
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={active.datasetRawGB}
                          onChange={(v) => updateActive({ datasetRawGB: clampNum(v, 0) })}
                        />
                      </Field>

                      <Field
                        label="Working set multiplier"
                        hint="Processed/caches (1–10)"
                        help={
                          "Working set includes processed datasets, feature-engineered outputs, cached shards, and temporary files.\n" +
                          "Rule of thumb:\n" +
                          "• Tabular/feature eng: 2–5×\n" +
                          "• CV/video: 1–2×\n" +
                          "• Heavy dataset versioning: increase multiplier"
                        }
                      >
                        <Input
                          type="number"
                          min={1}
                          step={0.1}
                          value={active.workingSetMultiplier}
                          onChange={(v) =>
                            updateActive({ workingSetMultiplier: clampNum(v, 1, 10) })
                          }
                        />
                      </Field>

                      <Field label="Data format" help="Common formats influence preprocessing and IO patterns.">
                        <Select
                          value={active.dataFormat}
                          onChange={(v) => updateActive({ dataFormat: v })}
                          options={DATA_FORMATS}
                        />
                      </Field>

                      <Field
                        label="Data locality"
                        help="Where training reads the dataset from. Local NVMe reduces latency; object/NFS may require higher network throughput."
                      >
                        <Select
                          value={active.dataLocality}
                          onChange={(v) => updateActive({ dataLocality: v })}
                          options={DATA_LOCALITY}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div>
                    <SectionTitle
                      n={3}
                      title="Run profile and concurrency"
                      subtitle="This is the main capacity driver"
                    />
                    <div className="tr-formGrid4">
                      <Field
                        label="Runs per month"
                        help="Completed training runs per month (excluding HPO multiplier)."
                      >
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={active.runsPerMonth}
                          onChange={(v) => updateActive({ runsPerMonth: clampNum(v, 0) })}
                        />
                      </Field>

                      <Field label="Avg run duration (hours)" help="Average wall-clock time per training run.">
                        <Input
                          type="number"
                          min={0}
                          step={0.25}
                          value={active.avgRunHours}
                          onChange={(v) => updateActive({ avgRunHours: clampNum(v, 0) })}
                        />
                      </Field>

                      <Field
                        label="Concurrent jobs"
                        help={
                          "How many training jobs run at the same time.\n" +
                          "Example: 4 GPUs/job with 3 concurrent jobs ⇒ peak 12 GPUs."
                        }
                      >
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={active.concurrentJobs}
                          onChange={(v) => updateActive({ concurrentJobs: clampNum(v, 0) })}
                        />
                      </Field>

                      <Field
                        label="HPO / AutoML intensity"
                        help={
                          "Scales effective runs to represent hyperparameter tuning.\n" +
                          "Light: ≤20 trials, Medium: 20–100, Heavy: 100+"
                        }
                      >
                        <Select
                          value={active.hpoLevel}
                          onChange={(v) => updateActive({ hpoLevel: v })}
                          options={HPO_LEVELS}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div>
                    <SectionTitle n={4} title="Compute shape per job" />
                    <div className="tr-formGrid3">
                      <Field
                        label="CPU per job (vCPU)"
                        help="vCPU required for preprocessing + dataloaders + training."
                      >
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={active.cpuPerJob}
                          onChange={(v) => updateActive({ cpuPerJob: clampNum(v, 0) })}
                        />
                      </Field>

                      <Field
                        label="RAM per job (GB)"
                        help="Peak RAM per job (caching, feature engineering, loaders)."
                      >
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={active.ramPerJobGB}
                          onChange={(v) => updateActive({ ramPerJobGB: clampNum(v, 0) })}
                        />
                      </Field>

                      <Field label="GPUs per job" hint="0 for CPU-only" help="GPU count per training job.">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={active.gpusPerJob}
                          onChange={(v) => updateActive({ gpusPerJob: clampNum(v, 0) })}
                        />
                      </Field>
                    </div>

                    {active.trainingType === "CPU_ONLY" ? (
                      <div className="tr-note">CPU-only training selected — GPU demand will be treated as 0.</div>
                    ) : null}
                  </div>

                  {/* Step 5 */}
                  <div>
                    <SectionTitle n={5} title="Artifacts and checkpoints" />
                    <div className="tr-formGrid3">
                      <Field
                        label="Checkpoint size per run (GB)"
                        hint="Set to 0 if not used"
                        help="Affects storage capacity and write bandwidth. DL writes checkpoints; tabular ML often minimal."
                      >
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={active.checkpointGBPerRun}
                          onChange={(v) => updateActive({ checkpointGBPerRun: clampNum(v, 0) })}
                        />
                      </Field>

                      <Field label="Logs/metrics per run (GB)" help="Experiment tracking, telemetry, eval outputs.">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={active.logsGBPerRun}
                          onChange={(v) => updateActive({ logsGBPerRun: clampNum(v, 0) })}
                        />
                      </Field>

                      <Field label="Notes" help="Anything that changes sizing/architecture (bursts, SLAs, compliance).">
                        <Input
                          value={active.notes}
                          onChange={(v) => updateActive({ notes: v })}
                          placeholder="e.g., needs fast scratch for preprocessing"
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Step 6 */}
                  <div>
                    <SectionTitle n={6} title="Governance and constraints" />
                    <div className="tr-formGrid3">
                      <Field
                        label="Data classification"
                        help="Signals residency/segmentation requirements (restricted enclaves, audit logging, etc.)."
                      >
                        <Select
                          value={active.governance}
                          onChange={(v) => updateActive({ governance: v })}
                          options={GOVERNANCE}
                        />
                      </Field>

                      <Field
                        label="Named suppliers"
                        hint="Comma separated (OEM/ISV/Integrator)"
                        help="Record preferred/mandated suppliers for this workload."
                      >
                        <Input
                          value={(active.namedSuppliers || []).join(", ")}
                          onChange={(v) =>
                            updateActive({
                              namedSuppliers: v
                                .split(",")
                                .map((x) => x.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="e.g., Dell, NVIDIA, Red Hat"
                        />
                      </Field>

                      <Field
                        label="Other supplier notes"
                        help="Procurement/legal notes (EA coverage, version pinning, support requirements)."
                      >
                        <Input
                          value={active.namedSuppliersOther}
                          onChange={(v) => updateActive({ namedSuppliersOther: v })}
                          placeholder="If needed…"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Right */}
          <div className="tr-colRight">
            <Card
              title="Derived demand"
              right={derived ? <span className="tr-mutedSmall">{derived.archetype}</span> : null}
            >
              {!derived ? (
                <div className="tr-muted">No derived data.</div>
              ) : (
                <div className="tr-rightStack">
                  <div className="tr-statGrid">
                    <StatTile label="Peak GPUs" value={fmt(derived.peakGPU)} />
                    <StatTile label="Peak vCPU" value={fmt(derived.peakCPU)} />
                    <StatTile label="Peak RAM (GB)" value={fmt(derived.peakRAMGB)} />
                    <StatTile label="Effective runs / month" value={fmt(derived.effectiveRuns, 1)} />
                  </div>

                  <div className="tr-panel">
                    <div className="tr-panelTitle">Monthly consumption</div>
                    <div className="tr-kv">
                      <div className="tr-kvRow">
                        <span>GPU-hours</span>
                        <span className="tr-strong">{fmt(derived.gpuHours)}</span>
                      </div>
                      <div className="tr-kvRow">
                        <span>CPU-hours</span>
                        <span className="tr-strong">{fmt(derived.cpuHours)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="tr-panel">
                    <div className="tr-panelTitle">Storage sizing</div>
                    <div className="tr-kv">
                      <div className="tr-kvRow">
                        <span>Raw dataset</span>
                        <span className="tr-strong">{fmt(gbToTb(derived.datasetRawGB), 1)} TB</span>
                      </div>
                      <div className="tr-kvRow">
                        <span>Working set</span>
                        <span className="tr-strong">{fmt(gbToTb(derived.workingGB), 1)} TB</span>
                      </div>
                      <div className="tr-kvRow">
                        <span>Checkpoints</span>
                        <span className="tr-strong">{fmt(gbToTb(derived.checkpointsGB), 1)} TB</span>
                      </div>
                      <div className="tr-kvRow">
                        <span>Logs</span>
                        <span className="tr-strong">{fmt(gbToTb(derived.logsGB), 2)} TB</span>
                      </div>

                      <div className="tr-dividerSoft" />

                      <div className="tr-kvRow">
                        <span>Total capacity</span>
                        <span className="tr-strong">{fmt(gbToTb(derived.totalCapGB), 1)} TB</span>
                      </div>

                      <div className="tr-mutedSmall">
                        IO profile: <span className="tr-strong">{derived.ioProfile}</span>
                      </div>
                    </div>
                  </div>

                  <div className="tr-panel">
                    <div className="tr-panelTitle">Infrastructure hints</div>
                    <div className="tr-hintBlock">
                      <div className="tr-hintLabel">Network</div>
                      <div>{derived.network}</div>
                    </div>
                    <div className="tr-hintBlock">
                      <div className="tr-hintLabel">Storage</div>
                      <div>{derived.storageHint}</div>
                    </div>
                  </div>

                  <div className="tr-panel tr-panelTint">
                    <div className="tr-panelTitle">Archetype</div>
                    <div className="tr-strong">{derived.archetype}</div>
                    <div className="tr-mutedSmall" style={{ marginTop: 8 }}>
                      Next: map this archetype to provider-specific reference architectures.
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}