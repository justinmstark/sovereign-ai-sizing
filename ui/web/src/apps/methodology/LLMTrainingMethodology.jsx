// File: src/apps/methodology/LLMTrainingMethodology.jsx
import React, { useMemo, useState } from "react";

/**
 * LLMTrainingMethodology.jsx
 * Transparent, reviewer-friendly methodology page for LLM Training sizing.
 * - No Tailwind
 * - Self-contained styling (dark theme)
 * - Includes:
 *   1) Variables & Units table
 *   2) Step-by-step Calculation Trace table
 *   3) Optional playground to validate arithmetic
 *
 * This page is designed to be benchmark-agnostic:
 * - If your production calculator uses a chip+precision table (GPU-hours/run, tokens/sec, etc.)
 *   keep those numbers explicit here as inputs so reviewers can replace them with measured data.
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

function pct(n, digits = 0) {
  if (!Number.isFinite(n)) return "—";
  return (n * 100).toFixed(digits) + "%";
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

function scenarioFactorY(yearIndex, cagr) {
  // Year 0 => 1.0, Year 1 => (1+cagr), Year 2 => (1+cagr)^2, etc.
  return Math.pow(1 + (Number.isFinite(cagr) ? cagr : 0), Math.max(0, yearIndex));
}

export default function LLMTrainingMethodology() {
  const [showPlayground, setShowPlayground] = useState(true);

  // -------------------------
  // Inputs (baseline year 0)
  // -------------------------
  const [avgRunGPUhours, setAvgRunGPUhours] = useState(5200); // GPU-hours per run
  const [runsPerMonth, setRunsPerMonth] = useState(6);
  const [concurrency, setConcurrency] = useState(2); // parallel runs
  const [epochs, setEpochs] = useState(3); // shown for context, not used unless you model it

  // Utilization / packing
  const [targetUtilization, setTargetUtilization] = useState(0.65); // target GPU utilization
  const [gpuPerNode, setGpuPerNode] = useState(8);

  // Storage
  const [datasetTB, setDatasetTB] = useState(40);
  const [checkpointGB, setCheckpointGB] = useState(180);
  const [checkpointsPerRun, setCheckpointsPerRun] = useState(8);
  const [checkpointRetentionMonths, setCheckpointRetentionMonths] = useState(6);

  // Growth (scenario-style)
  const [cagrActivity, setCagrActivity] = useState(0.25); // runs/month growth
  const [cagrComplexity, setCagrComplexity] = useState(0.15); // GPU-hours/run growth

  // Planning horizon
  const [years, setYears] = useState(3);

  const derived = useMemo(() => {
    const HOURS_PER_YEAR = 8760;

    // Year-by-year projection for demand (gpu-hours/year)
    const yearly = [];
    for (let y = 0; y < years; y++) {
      const activityFactor = scenarioFactorY(y, cagrActivity);
      const complexityFactor = scenarioFactorY(y, cagrComplexity);

      const runsPerMonthY = runsPerMonth * activityFactor;
      const avgRunGPUhoursY = avgRunGPUhours * complexityFactor;

      const gpuHoursPerYearY = avgRunGPUhoursY * runsPerMonthY * 12 * concurrency;

      const requiredGpusY =
        targetUtilization > 0 ? gpuHoursPerYearY / (HOURS_PER_YEAR * targetUtilization) : NaN;

      const requiredNodesY = gpuPerNode > 0 ? requiredGpusY / gpuPerNode : NaN;

      // Checkpoint storage:
      // Monthly checkpoint production ~ runs/month × checkpoints/run × checkpointGB
      // Retention months multiplies this
      const checkpointGBPerMonthY = runsPerMonthY * checkpointsPerRun * checkpointGB;
      const checkpointStorageGBY = checkpointGBPerMonthY * checkpointRetentionMonths;

      yearly.push({
        y,
        activityFactor,
        complexityFactor,
        runsPerMonthY,
        avgRunGPUhoursY,
        gpuHoursPerYearY,
        requiredGpusY,
        requiredNodesY,
        checkpointGBPerMonthY,
        checkpointStorageGBY,
      });
    }

    // Year 0 key values
    const y0 = yearly[0] || null;

    // Dataset typically persists; checkpoints add on top
    const datasetGB = datasetTB * 1024;
    const totalStorageGBY0 = datasetGB + (y0 ? y0.checkpointStorageGBY : 0);

    return {
      HOURS_PER_YEAR,
      yearly,
      y0,
      datasetGB,
      totalStorageGBY0,
    };
  }, [
    avgRunGPUhours,
    runsPerMonth,
    concurrency,
    targetUtilization,
    gpuPerNode,
    datasetTB,
    checkpointGB,
    checkpointsPerRun,
    checkpointRetentionMonths,
    cagrActivity,
    cagrComplexity,
    years,
  ]);

  const traceStepsY0 = useMemo(() => {
    const y0 = derived.y0;
    if (!y0) return [];
    const val = (x) => (Number.isFinite(x) ? x.toFixed(6) : "—");
    const gb = (x) => (Number.isFinite(x) ? x.toFixed(2) : "—");
    return [
      {
        label: "RunsPerMonth_Y0",
        expr: "runsPerMonth",
        value: val(y0.runsPerMonthY),
      },
      {
        label: "AvgRunGPUhours_Y0",
        expr: "avgRunGPUhours",
        value: val(y0.avgRunGPUhoursY),
      },
      {
        label: "GPUHoursPerYear_Y0",
        expr: "AvgRunGPUhours_Y0 × RunsPerMonth_Y0 × 12 × concurrency",
        value: val(y0.gpuHoursPerYearY),
      },
      {
        label: "Required_GPUs_Y0",
        expr: "GPUHoursPerYear_Y0 ÷ (8,760 × target_utilization)",
        value: val(y0.requiredGpusY),
      },
      {
        label: "Required_Nodes_Y0",
        expr: "Required_GPUs_Y0 ÷ gpu_per_node",
        value: val(y0.requiredNodesY),
      },
      {
        label: "CheckpointGBPerMonth_Y0",
        expr: "RunsPerMonth_Y0 × checkpointsPerRun × checkpointGB",
        value: gb(y0.checkpointGBPerMonthY) + " GB/month",
      },
      {
        label: "CheckpointStorageGB_Y0",
        expr: "CheckpointGBPerMonth_Y0 × checkpointRetentionMonths",
        value: gb(y0.checkpointStorageGBY) + " GB",
      },
      {
        label: "DatasetGB",
        expr: "datasetTB × 1024",
        value: gb(derived.datasetGB) + " GB",
      },
      {
        label: "TotalStorageGB_Y0",
        expr: "DatasetGB + CheckpointStorageGB_Y0",
        value: gb(derived.totalStorageGBY0) + " GB",
      },
    ];
  }, [derived]);

  const yearRows = useMemo(() => {
    const y = derived.yearly || [];
    return y.map((r) => ({
      year: r.y,
      runsPerMonth: r.runsPerMonthY,
      avgRunGPUhours: r.avgRunGPUhoursY,
      gpuHoursPerYear: r.gpuHoursPerYearY,
      reqGpus: r.requiredGpusY,
      reqNodes: r.requiredNodesY,
      ckptGB: r.checkpointStorageGBY,
    }));
  }, [derived.yearly]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>LLM Training – Methodology</div>
          <div style={styles.hSubtitle}>
            Transparent conversion from training runs into <Pill>GPU capacity</Pill>, <Pill>Nodes</Pill>,
            and <Pill>Storage</Pill> (dataset + checkpoint retention), with simple{" "}
            <Pill>activity</Pill> and <Pill>complexity</Pill> growth.
          </div>
        </div>
        <Toggle value={showPlayground} onChange={setShowPlayground} label="Show playground" />
      </div>

      <div style={styles.grid}>
        <Card
          title="A) What is being sized?"
          subtitle="Training is planned primarily from GPU-hours demand"
          right={<Pill>Scope</Pill>}
        >
          <ul style={styles.ul}>
            <li>
              <b>Compute</b>: GPU-hours per run × runs per month × concurrency.
            </li>
            <li>
              <b>Capacity</b>: convert annual GPU-hours to GPUs using utilization; translate to nodes.
            </li>
            <li>
              <b>Storage</b>: dataset footprint + checkpoint production × retention.
            </li>
            <li>
              <b>Growth</b>: separate CAGR for activity (runs/month) and complexity (GPU-hours/run).
            </li>
          </ul>
          <Small>
            If your production calculator uses token counts/params/epochs to derive GPU-hours/run,
            keep that derivation explicit (or benchmark-derived) and mirrored in this page.
          </Small>
        </Card>

        <VariablesCard
          rows={[
            { name: "avgRunGPUhours", unit: "GPU-hours/run", meaning: "Compute consumed by one training run (benchmark or derived)" },
            { name: "runsPerMonth", unit: "runs/month", meaning: "Number of training runs per month (baseline Year 0)" },
            { name: "concurrency", unit: "count", meaning: "Parallel runs required at the same time" },
            { name: "target_utilization", unit: "0–1", meaning: "Planned usable utilization (headroom included)" },
            { name: "gpu_per_node", unit: "GPUs/node", meaning: "GPUs per physical node for node translation" },
            { name: "datasetTB", unit: "TB", meaning: "Training dataset footprint (stored, replicated as per policy)" },
            { name: "checkpointGB", unit: "GB/checkpoint", meaning: "Average size of one checkpoint artifact" },
            { name: "checkpointsPerRun", unit: "checkpoints/run", meaning: "How many checkpoints are kept per run (not total emitted)" },
            { name: "checkpointRetentionMonths", unit: "months", meaning: "How long checkpoints are retained (rolling window)" },
            { name: "cagrActivity", unit: "0–1", meaning: "Annual growth rate applied to runsPerMonth" },
            { name: "cagrComplexity", unit: "0–1", meaning: "Annual growth rate applied to avgRunGPUhours" },
            { name: "years", unit: "count", meaning: "Projection horizon (Year 0..years-1)" },
          ]}
        />

        <Card title="B) Year 0 compute demand" subtitle="GPU-hours/year from runs and concurrency" right={<Pill>Demand</Pill>}>
          <Eq>{`GPUHoursPerYear_Y0 =
  avgRunGPUhours × runsPerMonth × 12 × concurrency`}</Eq>
        </Card>

        <Card title="C) Convert demand to GPUs and nodes" subtitle="Utilization and packing" right={<Pill>Capacity</Pill>}>
          <Eq>{`Hours_Per_Year = 8,760

Required_GPUs_Y0 =
  GPUHoursPerYear_Y0 / (Hours_Per_Year × target_utilization)

Required_Nodes_Y0 =
  Required_GPUs_Y0 / gpu_per_node`}</Eq>
          <Hint>
            Output policy (ceil GPUs/nodes, minimum cluster size, HA) should be stated in the calculator output section.
            This page shows the auditable math.
          </Hint>
        </Card>

        <Card title="D) Checkpoint storage (rolling retention)" subtitle="Monthly production × retention months" right={<Pill>Storage</Pill>}>
          <Eq>{`CheckpointGBPerMonth_Y0 =
  runsPerMonth × checkpointsPerRun × checkpointGB

CheckpointStorageGB_Y0 =
  CheckpointGBPerMonth_Y0 × checkpointRetentionMonths

TotalStorageGB_Y0 =
  (datasetTB × 1024) + CheckpointStorageGB_Y0`}</Eq>
          <Small>
            If you include replicas/DR copies, represent them as explicit multipliers (e.g., ×2 for mirrored copy).
          </Small>
        </Card>

        <Card title="E) Growth model (Year y)" subtitle="Separate activity and complexity CAGR" right={<Pill>Growth</Pill>}>
          <Eq>{`ActivityFactor(y) = (1 + cagrActivity)^y
ComplexityFactor(y) = (1 + cagrComplexity)^y

runsPerMonth(y) = runsPerMonth × ActivityFactor(y)
avgRunGPUhours(y) = avgRunGPUhours × ComplexityFactor(y)

GPUHoursPerYear(y) =
  avgRunGPUhours(y) × runsPerMonth(y) × 12 × concurrency`}</Eq>
        </Card>

        <TraceTable title="Calculation Trace (Year 0)" steps={traceStepsY0} />

        <Card title="Year-by-year projection" subtitle="Demand and capacity by year" right={<Pill>Projection</Pill>}>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Year</th>
                  <th style={styles.th}>Runs/month</th>
                  <th style={styles.th}>GPU-hours/run</th>
                  <th style={styles.th}>GPU-hours/year</th>
                  <th style={styles.th}>Req GPUs</th>
                  <th style={styles.th}>Req Nodes</th>
                  <th style={styles.th}>Checkpoint Storage (GB)</th>
                </tr>
              </thead>
              <tbody>
                {yearRows.map((r) => (
                  <tr key={r.year}>
                    <td style={styles.td}>{r.year}</td>
                    <td style={styles.tdMono}>{fmtNum(r.runsPerMonth, 2)}</td>
                    <td style={styles.tdMono}>{fmtNum(r.avgRunGPUhours, 2)}</td>
                    <td style={styles.tdMono}>{fmtNum(r.gpuHoursPerYear, 2)}</td>
                    <td style={styles.tdMono}>{fmtNum(r.reqGpus, 2)}</td>
                    <td style={styles.tdMono}>{fmtNum(r.reqNodes, 2)}</td>
                    <td style={styles.tdMono}>{fmtNum(r.ckptGB, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Hint>
            If your calculator rounds up GPUs/nodes, apply it as an output policy and show both:
            <b> raw</b> (this table) and <b>rounded</b> (calculator output).
          </Hint>
        </Card>

        {showPlayground ? (
          <Card title="Quick-check playground" subtitle="Adjust inputs to validate outputs match your calculator" right={<Pill>Audit</Pill>}>
            <div style={styles.formGrid}>
              <Field label="avgRunGPUhours" value={avgRunGPUhours} onChange={(v) => setAvgRunGPUhours(clamp(v, 0, 1e12))} step="100" min={0} />
              <Field label="runsPerMonth" value={runsPerMonth} onChange={(v) => setRunsPerMonth(clamp(v, 0, 1e9))} step="1" min={0} />
              <Field label="concurrency" value={concurrency} onChange={(v) => setConcurrency(clamp(v, 1, 1e6))} step="1" min={1} />

              <Field label="epochs (context)" value={epochs} onChange={(v) => setEpochs(clamp(v, 0, 1e6))} step="1" min={0} />
              <Field
                label="target_utilization"
                value={targetUtilization}
                onChange={(v) => setTargetUtilization(clamp(v, 0.05, 0.95))}
                step="0.05"
                min={0.05}
                max={0.95}
              />
              <Field label="gpu_per_node" value={gpuPerNode} onChange={(v) => setGpuPerNode(clamp(v, 1, 64))} step="1" min={1} />

              <Field label="datasetTB" value={datasetTB} onChange={(v) => setDatasetTB(clamp(v, 0, 1e6))} step="1" min={0} />
              <Field label="checkpointGB" value={checkpointGB} onChange={(v) => setCheckpointGB(clamp(v, 0, 1e6))} step="10" min={0} />
              <Field label="checkpointsPerRun" value={checkpointsPerRun} onChange={(v) => setCheckpointsPerRun(clamp(v, 0, 1e6))} step="1" min={0} />

              <Field
                label="checkpointRetentionMonths"
                value={checkpointRetentionMonths}
                onChange={(v) => setCheckpointRetentionMonths(clamp(v, 0, 240))}
                step="1"
                min={0}
              />
              <Field
                label="cagrActivity"
                value={cagrActivity}
                onChange={(v) => setCagrActivity(clamp(v, 0, 5))}
                step="0.05"
                min={0}
              />
              <Field
                label="cagrComplexity"
                value={cagrComplexity}
                onChange={(v) => setCagrComplexity(clamp(v, 0, 5))}
                step="0.05"
                min={0}
              />

              <Field
                label="years"
                value={years}
                onChange={(v) => setYears(clamp(Math.round(v), 1, 10))}
                step="1"
                min={1}
                max={10}
              />
              <div style={styles.formField} />
              <div style={styles.formField} />
            </div>

            <Divider />

            <div style={styles.kpiGrid}>
              <Kpi
                label="Year 0 GPU-hours/year"
                value={fmtNum(derived.y0?.gpuHoursPerYearY ?? NaN, 2)}
                sub="avgRunGPUhours × runs/month × 12 × concurrency"
              />
              <Kpi
                label="Year 0 required GPUs"
                value={fmtNum(derived.y0?.requiredGpusY ?? NaN, 2)}
                sub={`÷ (8,760 × ${targetUtilization})`}
              />
              <Kpi
                label="Year 0 required nodes"
                value={fmtNum(derived.y0?.requiredNodesY ?? NaN, 2)}
                sub={`÷ ${gpuPerNode} GPUs/node`}
              />

              <Kpi
                label="Checkpoint storage (GB, Y0)"
                value={fmtNum(derived.y0?.checkpointStorageGBY ?? NaN, 2)}
                sub={`${checkpointRetentionMonths} months retention`}
              />
              <Kpi
                label="Dataset (GB)"
                value={fmtNum(derived.datasetGB, 2)}
                sub={`${datasetTB} TB × 1024`}
              />
              <Kpi
                label="Total storage (GB, Y0)"
                value={fmtNum(derived.totalStorageGBY0, 2)}
                sub="Dataset + retained checkpoints"
              />
            </div>

            <Hint>
              If your actual calculator derives <Pill>avgRunGPUhours</Pill> from params/tokens/epochs,
              add that derivation as an explicit formula section here (and expose the intermediate values).
            </Hint>
          </Card>
        ) : null}

        <Card title="Common reviewer questions" subtitle="What to document if asked" right={<Pill>Notes</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>Source of avgRunGPUhours</b>: benchmark details (model size, batch, precision, nodes, interconnect).
            </li>
            <li>
              <b>What “run” means</b>: full pretrain? finetune? RLHF stage? multi-stage pipeline?
            </li>
            <li>
              <b>Checkpoint policy</b>: are all checkpoints retained or only “best-of”? any compression?
            </li>
            <li>
              <b>Replication/DR</b>: whether dataset/checkpoints include extra copies.
            </li>
            <li>
              <b>Growth realism</b>: separate activity vs complexity growth is intentionally explicit.
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