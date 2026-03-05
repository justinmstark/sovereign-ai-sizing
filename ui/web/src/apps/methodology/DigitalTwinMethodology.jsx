// File: src/apps/methodology/DigitalTwinMethodology.jsx
import React, { useMemo, useState } from "react";

/**
 * DigitalTwinMethodology.jsx
 * Transparent, reviewer-friendly methodology page for Digital Twin sizing.
 * - No Tailwind
 * - Self-contained styling (dark theme)
 * - Includes:
 *   1) Variables & Units table
 *   2) Step-by-step Calculation Trace table
 *   3) Optional “quick-check playground”
 *
 * Notes:
 * - This is a baseline, auditable model.
 * - If your production calculator includes additional tier tables or multipliers,
 *   add them as explicit factors and reflect them in Variables + Trace.
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
        {steps?.note ? <div style={{ marginTop: 10 }}>{steps.note}</div> : null}
      </div>
    </div>
  );
}

function complexityPresetFactor(preset) {
  // Replace with your calculator’s tier factors if different.
  if (preset === "light") return 0.85;
  if (preset === "standard") return 1.0;
  if (preset === "heavy") return 1.35;
  if (preset === "extreme") return 1.7;
  return 1.0;
}

export default function DigitalTwinMethodology() {
  const [showPlayground, setShowPlayground] = useState(true);

  // --- Workload inputs ---
  const [activeUsers, setActiveUsers] = useState(40); // concurrent interactive users
  const [sessionsPerUserPerDay, setSessionsPerUserPerDay] = useState(2);
  const [avgSessionMinutes, setAvgSessionMinutes] = useState(35);

  // Baseline GPU cost to serve 1 concurrent user for 1 hour (before complexity tier)
  const [gpuHoursPerUserHour, setGpuHoursPerUserHour] = useState(0.35);

  const [complexity, setComplexity] = useState("standard");

  // Utilization/headroom planning
  const [targetGpuUtil, setTargetGpuUtil] = useState(0.65);

  // Packing constraint
  const [maxConcurrentUsersPerGpu, setMaxConcurrentUsersPerGpu] = useState(6);

  // CPU & Memory rules-of-thumb (explicit; align to your calculator)
  const [cpuCoresPerGpu, setCpuCoresPerGpu] = useState(12);
  const [ramGBPerGpu, setRamGBPerGpu] = useState(96);

  // Storage assumptions
  const [sceneDataTB, setSceneDataTB] = useState(6);
  const [cacheTB, setCacheTB] = useState(2);
  const [logsGBPerDay, setLogsGBPerDay] = useState(35);
  const [logRetentionDays, setLogRetentionDays] = useState(30);

  // Network assumptions
  const [avgStreamMbpsPerUser, setAvgStreamMbpsPerUser] = useState(12);

  // Availability / N+1
  const [redundancyFactor, setRedundancyFactor] = useState(1.15);

  const derived = useMemo(() => {
    const daysPerYear = 365;
    const hoursPerYear = 24 * 365; // 8760

    const userHoursPerDayPerUser = (sessionsPerUserPerDay * avgSessionMinutes) / 60.0;

    // Annual interactive user-hours
    const annualUserHours = activeUsers * userHoursPerDayPerUser * daysPerYear;

    const complexityFactor = complexityPresetFactor(complexity);

    // Annual GPU-hours (demand)
    const annualGpuHours = annualUserHours * gpuHoursPerUserHour * complexityFactor;

    // GPUs by hours/utilization
    const requiredGpusByHours =
      targetGpuUtil > 0 ? annualGpuHours / (hoursPerYear * targetGpuUtil) : NaN;

    // GPUs by peak concurrency packing
    const requiredGpusByConcurrency =
      maxConcurrentUsersPerGpu > 0 ? activeUsers / maxConcurrentUsersPerGpu : NaN;

    // Must satisfy both constraints
    const requiredGpusBase = Math.max(requiredGpusByHours, requiredGpusByConcurrency);

    // Add redundancy/headroom
    const requiredGpusFinal = requiredGpusBase * redundancyFactor;

    const requiredCpuCores = requiredGpusFinal * cpuCoresPerGpu;
    const requiredRamGB = requiredGpusFinal * ramGBPerGpu;

    const logStorageGB = logsGBPerDay * logRetentionDays;
    const totalStorageTB = sceneDataTB + cacheTB + logStorageGB / 1024.0;

    const peakEgressMbps = activeUsers * avgStreamMbpsPerUser;
    const peakEgressGbps = peakEgressMbps / 1000.0;

    return {
      daysPerYear,
      hoursPerYear,
      userHoursPerDayPerUser,
      annualUserHours,
      complexityFactor,
      annualGpuHours,
      requiredGpusByHours,
      requiredGpusByConcurrency,
      requiredGpusBase,
      requiredGpusFinal,
      requiredCpuCores,
      requiredRamGB,
      logStorageGB,
      totalStorageTB,
      peakEgressGbps,
      peakEgressMbps,
    };
  }, [
    activeUsers,
    sessionsPerUserPerDay,
    avgSessionMinutes,
    gpuHoursPerUserHour,
    complexity,
    targetGpuUtil,
    maxConcurrentUsersPerGpu,
    cpuCoresPerGpu,
    ramGBPerGpu,
    sceneDataTB,
    cacheTB,
    logsGBPerDay,
    logRetentionDays,
    avgStreamMbpsPerUser,
    redundancyFactor,
  ]);

  const traceSteps = useMemo(() => {
    const val = (x) => (Number.isFinite(x) ? x.toFixed(6) : "—");
    const tb = (x) => (Number.isFinite(x) ? x.toFixed(4) : "—");
    return [
      {
        label: "UserHoursPerDayPerUser",
        expr: "sessionsPerUserPerDay × (avgSessionMinutes ÷ 60)",
        value: val(derived.userHoursPerDayPerUser),
      },
      {
        label: "Annual_User_Hours",
        expr: "activeUsers × UserHoursPerDayPerUser × 365",
        value: val(derived.annualUserHours),
      },
      {
        label: "Complexity_Factor",
        expr: "tier(light/standard/heavy/extreme)",
        value: val(derived.complexityFactor),
      },
      {
        label: "Annual_GPU_Hours",
        expr: "Annual_User_Hours × gpuHoursPerUserHour × Complexity_Factor",
        value: val(derived.annualGpuHours),
      },
      {
        label: "Required_GPUs_by_Hours",
        expr: "Annual_GPU_Hours ÷ (8,760 × target_gpu_utilization)",
        value: val(derived.requiredGpusByHours),
      },
      {
        label: "Required_GPUs_by_Concurrency",
        expr: "activeUsers ÷ maxConcurrentUsersPerGpu",
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
        label: "Required_CPU_Cores",
        expr: "Required_GPUs_Final × cpuCoresPerGpu",
        value: val(derived.requiredCpuCores),
      },
      {
        label: "Required_RAM_GB",
        expr: "Required_GPUs_Final × ramGBPerGpu",
        value: val(derived.requiredRamGB),
      },
      {
        label: "Log_Storage_GB",
        expr: "logsGBPerDay × logRetentionDays",
        value: val(derived.logStorageGB),
      },
      {
        label: "Total_Storage_TB",
        expr: "sceneDataTB + cacheTB + (Log_Storage_GB ÷ 1024)",
        value: tb(derived.totalStorageTB),
      },
      {
        label: "Peak_Egress_Gbps",
        expr: "(activeUsers × avgStreamMbpsPerUser) ÷ 1000",
        value: val(derived.peakEgressGbps),
      },
    ];
  }, [derived]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>Digital Twins – Methodology</div>
          <div style={styles.hSubtitle}>
            Transparent conversion from usage into <Pill>GPU capacity</Pill>,{" "}
            <Pill>CPU/RAM</Pill>, <Pill>Storage</Pill>, and optional{" "}
            <Pill>Network</Pill> requirements.
          </div>
        </div>
        <Toggle value={showPlayground} onChange={setShowPlayground} label="Show playground" />
      </div>

      <div style={styles.grid}>
        <Card
          title="A) What is being sized?"
          subtitle="A digital twin deployment typically includes rendering, simulation and data services"
          right={<Pill>Scope</Pill>}
        >
          <ul style={styles.ul}>
            <li>
              <b>Interactive visualization</b>: GPU-bound streaming / rendering sessions.
            </li>
            <li>
              <b>Simulation</b>: physics, autonomy, sensors (may be CPU+GPU and bursty).
            </li>
            <li>
              <b>Data</b>: scene assets, caches, time-series, logs/telemetry.
            </li>
            <li>
              <b>Networking</b>: pixel streaming egress depends on concurrency × bitrate.
            </li>
          </ul>
          <Small>
            This page models the interactive tier explicitly and derives host/storage/network
            requirements from the resulting GPU capacity.
          </Small>
        </Card>

        <VariablesCard
          rows={[
            {
              name: "activeUsers",
              unit: "concurrent users",
              meaning: "Peak/typical concurrent interactive users requiring rendering capacity",
            },
            {
              name: "sessionsPerUserPerDay",
              unit: "sessions/user/day",
              meaning: "Average number of sessions each user performs per day",
            },
            {
              name: "avgSessionMinutes",
              unit: "minutes/session",
              meaning: "Average session length",
            },
            {
              name: "gpuHoursPerUserHour",
              unit: "GPU-hours / (user-hour)",
              meaning:
                "Baseline GPU cost to serve 1 concurrent user for 1 hour at standard settings (before complexity tier)",
            },
            {
              name: "complexity",
              unit: "tier",
              meaning: "Scene and physics intensity tier (light/standard/heavy/extreme)",
            },
            {
              name: "target_gpu_utilization",
              unit: "0–1",
              meaning:
                "Planned usable utilization (includes headroom for queueing, maintenance, failures)",
            },
            {
              name: "maxConcurrentUsersPerGpu",
              unit: "users/GPU",
              meaning: "Packing limit: maximum concurrent users supported per GPU",
            },
            {
              name: "redundancyFactor",
              unit: "multiplier",
              meaning: "Extra headroom for N+1 / failure domains / maintenance windows",
            },
            {
              name: "cpuCoresPerGpu",
              unit: "cores/GPU",
              meaning: "Host CPU cores per GPU for render/sim node sizing",
            },
            {
              name: "ramGBPerGpu",
              unit: "GB/GPU",
              meaning: "Host memory per GPU for render/sim node sizing",
            },
            {
              name: "sceneDataTB",
              unit: "TB",
              meaning: "Scene / asset dataset footprint (USD, textures, CAD, etc.)",
            },
            {
              name: "cacheTB",
              unit: "TB",
              meaning: "Derived caches (compiled/baked assets, streaming caches, mirrors)",
            },
            {
              name: "logsGBPerDay",
              unit: "GB/day",
              meaning: "Telemetry/log volume produced per day",
            },
            {
              name: "logRetentionDays",
              unit: "days",
              meaning: "Retention period for logs/telemetry",
            },
            {
              name: "avgStreamMbpsPerUser",
              unit: "Mbps/user",
              meaning: "Average streaming bitrate per concurrent user (peak planning)",
            },
          ]}
        />

        <Card title="B) Sessions → annual user-hours" subtitle="Auditable demand signal" right={<Pill>Demand</Pill>}>
          <Eq>{`UserHoursPerDayPerUser =
  sessionsPerUserPerDay × (avgSessionMinutes / 60)

Annual_User_Hours =
  activeUsers × UserHoursPerDayPerUser × 365`}</Eq>
          <Hint>
            If you have telemetry, replace this with measured annual user-hours. Keep the demand
            signal explicit so it can be audited.
          </Hint>
        </Card>

        <Card title="C) User-hours → GPU-hours" subtitle="Multiply by baseline GPU cost and complexity tier" right={<Pill>Compute</Pill>}>
          <Eq>{`Complexity_Factor =
  tier(light/standard/heavy/extreme)

Annual_GPU_Hours =
  Annual_User_Hours × gpuHoursPerUserHour × Complexity_Factor`}</Eq>
          <Small>
            <b>gpuHoursPerUserHour</b> should be benchmark-derived (resolution/fps/codec/scene).
            Complexity tiers capture heavier scenes and more physics/sensors.
          </Small>
        </Card>

        <Card title="D) Demand → GPUs (hours constraint)" subtitle="Utilization converts theoretical to usable capacity" right={<Pill>Capacity</Pill>}>
          <Eq>{`Hours_Per_Year = 8,760

Required_GPUs_by_Hours =
  Annual_GPU_Hours / (Hours_Per_Year × target_gpu_utilization)`}</Eq>
        </Card>

        <Card title="E) Peak constraint (packing)" subtitle="Must also satisfy peak concurrency" right={<Pill>Concurrency</Pill>}>
          <Eq>{`Required_GPUs_by_Concurrency =
  activeUsers / maxConcurrentUsersPerGpu

Required_GPUs_Base =
  max(Required_GPUs_by_Hours, Required_GPUs_by_Concurrency)`}</Eq>
        </Card>

        <Card title="F) Headroom / N+1" subtitle="Apply redundancy factor" right={<Pill>Resilience</Pill>}>
          <Eq>{`Required_GPUs_Final =
  Required_GPUs_Base × redundancyFactor`}</Eq>
        </Card>

        <Card title="G) Host resources (derived)" subtitle="CPU and RAM translated from GPU capacity" right={<Pill>Host</Pill>}>
          <Eq>{`Required_CPU_Cores =
  Required_GPUs_Final × cpuCoresPerGpu

Required_RAM_GB =
  Required_GPUs_Final × ramGBPerGpu`}</Eq>
          <Hint>
            If you split “render tier” and “sim tier”, apply different CPU/RAM ratios per tier and sum
            results.
          </Hint>
        </Card>

        <Card title="H) Storage and logs" subtitle="Assets + cache + logs retention" right={<Pill>Storage</Pill>}>
          <Eq>{`Log_Storage_GB =
  logsGBPerDay × logRetentionDays

Total_Storage_TB =
  sceneDataTB + cacheTB + (Log_Storage_GB / 1024)`}</Eq>
        </Card>

        <Card title="I) Optional network sizing" subtitle="Peak egress planning" right={<Pill>Network</Pill>}>
          <Eq>{`Peak_Egress_Mbps =
  activeUsers × avgStreamMbpsPerUser

Peak_Egress_Gbps =
  Peak_Egress_Mbps / 1000`}</Eq>
        </Card>

        <TraceTable steps={traceSteps} />

        {showPlayground ? (
          <Card
            title="Quick-check playground"
            subtitle="Change inputs to validate outputs match the calculator"
            right={<Pill>Audit</Pill>}
          >
            <div style={styles.formGrid}>
              <Field label="activeUsers (concurrent)" value={activeUsers} onChange={setActiveUsers} min={0} />
              <Field
                label="sessionsPerUserPerDay"
                value={sessionsPerUserPerDay}
                onChange={setSessionsPerUserPerDay}
                step="0.5"
                min={0}
              />
              <Field
                label="avgSessionMinutes"
                value={avgSessionMinutes}
                onChange={setAvgSessionMinutes}
                min={0}
              />

              <Field
                label="gpuHoursPerUserHour"
                value={gpuHoursPerUserHour}
                onChange={setGpuHoursPerUserHour}
                step="0.05"
                min={0}
              />
              <Select
                label="complexity tier"
                value={complexity}
                onChange={setComplexity}
                options={[
                  { label: "Light (0.85x)", value: "light" },
                  { label: "Standard (1.0x)", value: "standard" },
                  { label: "Heavy (1.35x)", value: "heavy" },
                  { label: "Extreme (1.7x)", value: "extreme" },
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
                label="maxConcurrentUsersPerGpu"
                value={maxConcurrentUsersPerGpu}
                onChange={(v) => setMaxConcurrentUsersPerGpu(clamp(v, 1, 999))}
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
              <Field
                label="avgStreamMbpsPerUser"
                value={avgStreamMbpsPerUser}
                onChange={(v) => setAvgStreamMbpsPerUser(clamp(v, 0, 200))}
                step="1"
                min={0}
              />

              <Field
                label="cpuCoresPerGpu"
                value={cpuCoresPerGpu}
                onChange={(v) => setCpuCoresPerGpu(clamp(v, 0, 256))}
                min={0}
              />
              <Field
                label="ramGBPerGpu"
                value={ramGBPerGpu}
                onChange={(v) => setRamGBPerGpu(clamp(v, 0, 4096))}
                min={0}
              />
              <div style={styles.formField} />

              <Field label="sceneDataTB" value={sceneDataTB} onChange={setSceneDataTB} step="0.5" min={0} />
              <Field label="cacheTB" value={cacheTB} onChange={setCacheTB} step="0.5" min={0} />
              <Field label="logsGBPerDay" value={logsGBPerDay} onChange={setLogsGBPerDay} step="5" min={0} />

              <Field
                label="logRetentionDays"
                value={logRetentionDays}
                onChange={(v) => setLogRetentionDays(clamp(v, 0, 3650))}
                step="5"
                min={0}
              />
              <div style={styles.formField} />
              <div style={styles.formField} />
            </div>

            <Divider />

            <div style={styles.kpiGrid}>
              <Kpi
                label="Annual user-hours"
                value={fmtNum(derived.annualUserHours, 2)}
                sub={`activeUsers × userHours/day × 365`}
              />
              <Kpi
                label="Annual GPU-hours"
                value={fmtNum(derived.annualGpuHours, 2)}
                sub={`Annual user-hours × gpu cost × tier`}
              />
              <Kpi
                label="Final GPUs (with redundancy)"
                value={fmtNum(derived.requiredGpusFinal, 2)}
                sub={`max(hours, concurrency) × redundancy`}
              />

              <Kpi
                label="CPU cores (derived)"
                value={fmtNum(derived.requiredCpuCores, 1)}
                sub={`${cpuCoresPerGpu} cores/GPU`}
              />
              <Kpi
                label="RAM (GB, derived)"
                value={fmtNum(derived.requiredRamGB, 1)}
                sub={`${ramGBPerGpu} GB/GPU`}
              />
              <Kpi
                label="Total storage (TB)"
                value={fmtNum(derived.totalStorageTB, 2)}
                sub="Scenes + cache + logs retention"
              />

              <Kpi
                label="Peak egress (Gbps)"
                value={fmtNum(derived.peakEgressGbps, 3)}
                sub={`${derived.peakEgressMbps.toFixed(1)} Mbps peak`}
              />
              <div style={styles.kpi} />
              <div style={styles.kpi} />
            </div>

            <Hint>
              If your production calculator rounds GPUs up (ceil) or enforces minimum cluster sizes,
              state that as an explicit output policy. This methodology is intentionally “pure math”
              plus named factors.
            </Hint>
          </Card>
        ) : null}

        <Card
          title="Common reviewer questions"
          subtitle="What to document if asked"
          right={<Pill>Notes</Pill>}
        >
          <ul style={styles.ul}>
            <li>
              <b>Benchmark method</b>: how <Pill>gpuHoursPerUserHour</Pill> and bitrate were measured.
            </li>
            <li>
              <b>Tier meaning</b>: what differentiates light/standard/heavy/extreme.
            </li>
            <li>
              <b>Peak vs average</b>: how you chose <Pill>activeUsers</Pill> from telemetry.
            </li>
            <li>
              <b>Redundancy policy</b>: why the chosen <Pill>redundancyFactor</Pill>.
            </li>
            <li>
              <b>Storage copies</b>: whether you include replicas/backups/DR in the TB terms.
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

  // Tables (Variables + Trace)
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