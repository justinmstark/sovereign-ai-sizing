// File: src/apps/methodology/GPUaaSMethodology.jsx
import React, { useMemo, useState } from "react";

/**
 * GPUaaSMethodology.jsx
 * Transparent methodology page for the GPUaaS calculator.
 * - No Tailwind
 * - Self-contained dark theme
 * - Includes:
 *   1) Variables & Units table
 *   2) Step-by-step Calculation Trace table
 *   3) Quick-check playground (lets reviewers reproduce totals)
 *
 * Model intent (matches typical GPUaaS sizing):
 * 1) Convert business usage into required tokens/sec.
 *    - total_users × peak_concurrency_pct => peak concurrent users
 *    - peak concurrent users × requests/user/hour => requests/hour at peak
 *    - requests/hour × tokens/request => tokens/hour at peak
 *    - tokens/hour / 3600 => tokens/sec required
 *
 * 2) Convert demand to GPU count using benchmark throughput (TPS/GPU).
 *    - gpu_raw = tokens/sec required / tps_per_gpu
 *
 * 3) Apply utilization and resilience/headroom.
 *    - gpu_adj_util = gpu_raw / target_utilization
 *    - gpu_total = gpu_adj_util × resilience_factor
 *
 * Notes:
 * - If your API uses a more nuanced benchmark model (context_len/output_len/batch/concurrency),
 *   represent it here explicitly by adding an "EffectiveTPS" derivation section.
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

export default function GPUaaSMethodology() {
  const [showPlayground, setShowPlayground] = useState(true);

  // Inputs (mirror the GPUaaS form fields)
  const [totalUsers, setTotalUsers] = useState(10000);
  const [peakConcurrencyPct, setPeakConcurrencyPct] = useState(0.2);
  const [requestsPerUserPerHour, setRequestsPerUserPerHour] = useState(6);
  const [tokensPerRequest, setTokensPerRequest] = useState(1500);

  const [tpsPerGpu, setTpsPerGpu] = useState(250); // benchmark throughput tokens/sec per GPU
  const [targetUtilization, setTargetUtilization] = useState(0.7);
  const [resilienceFactor, setResilienceFactor] = useState(1.2);

  // Advanced (present in App.jsx but not directly used in this simplified math unless you derive TPS)
  const [contextLen, setContextLen] = useState(8192);
  const [outputLen, setOutputLen] = useState(256);
  const [batchSize, setBatchSize] = useState(1);
  const [benchConcurrency, setBenchConcurrency] = useState(10);

  const derived = useMemo(() => {
    const peakConcurrentUsers = totalUsers * peakConcurrencyPct;

    const requestsPerHourAtPeak = peakConcurrentUsers * requestsPerUserPerHour;
    const tokensPerHour = requestsPerHourAtPeak * tokensPerRequest;

    const tokensPerSecRequired = tokensPerHour / 3600.0;

    const gpuRaw = tpsPerGpu > 0 ? tokensPerSecRequired / tpsPerGpu : NaN;
    const gpuAdjustedForUtil =
      targetUtilization > 0 ? gpuRaw / targetUtilization : NaN;

    const gpuTotalWithResilience = gpuAdjustedForUtil * resilienceFactor;

    return {
      peakConcurrentUsers,
      requestsPerHourAtPeak,
      tokensPerHour,
      tokensPerSecRequired,
      gpuRaw,
      gpuAdjustedForUtil,
      gpuTotalWithResilience,
    };
  }, [
    totalUsers,
    peakConcurrencyPct,
    requestsPerUserPerHour,
    tokensPerRequest,
    tpsPerGpu,
    targetUtilization,
    resilienceFactor,
  ]);

  const traceSteps = useMemo(() => {
    const val = (x) => (Number.isFinite(x) ? x.toFixed(6) : "—");
    return [
      {
        label: "PeakConcurrentUsers",
        expr: "total_users × peak_concurrency_pct",
        value: val(derived.peakConcurrentUsers),
      },
      {
        label: "RequestsPerHourAtPeak",
        expr: "PeakConcurrentUsers × requests_per_user_per_hour",
        value: val(derived.requestsPerHourAtPeak),
      },
      {
        label: "TokensPerHourAtPeak",
        expr: "RequestsPerHourAtPeak × tokens_per_request",
        value: val(derived.tokensPerHour),
      },
      {
        label: "TokensPerSecRequired",
        expr: "TokensPerHourAtPeak ÷ 3600",
        value: val(derived.tokensPerSecRequired),
      },
      {
        label: "GPU_Raw",
        expr: "TokensPerSecRequired ÷ tps_per_gpu",
        value: val(derived.gpuRaw),
      },
      {
        label: "GPU_Adj_Util",
        expr: "GPU_Raw ÷ target_utilization",
        value: val(derived.gpuAdjustedForUtil),
      },
      {
        label: "GPU_Total_With_Resilience",
        expr: "GPU_Adj_Util × resilience_factor",
        value: val(derived.gpuTotalWithResilience),
      },
    ];
  }, [derived]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>GPUaaS – Methodology</div>
          <div style={styles.hSubtitle}>
            Auditable conversion from users/requests into{" "}
            <Pill>tokens/sec demand</Pill> and then to{" "}
            <Pill>GPU count</Pill> using benchmark{" "}
            <Pill>TPS per GPU</Pill>, utilization, and resilience headroom.
          </div>
        </div>
        <Toggle value={showPlayground} onChange={setShowPlayground} label="Show playground" />
      </div>

      <div style={styles.grid}>
        <Card title="A) What is being sized?" subtitle="Interactive inference GPU capacity" right={<Pill>Scope</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>Demand</b>: tokens/sec required at peak.
            </li>
            <li>
              <b>Benchmark</b>: tokens/sec per GPU (TPS/GPU) for the selected chip + workload.
            </li>
            <li>
              <b>Capacity</b>: GPUs required after utilization target and resilience headroom.
            </li>
          </ul>
          <Small>
            In your live app, <Pill>tps_per_gpu</Pill> is read from DB based on chip/workload and benchmark settings.
            This page makes that dependency explicit.
          </Small>
        </Card>

        <VariablesCard
          rows={[
            { name: "total_users", unit: "users", meaning: "Total users in population" },
            { name: "peak_concurrency_pct", unit: "0–1", meaning: "Fraction of users active concurrently at peak" },
            { name: "requests_per_user_per_hour", unit: "req/user/hour", meaning: "Request frequency per active user at peak" },
            { name: "tokens_per_request", unit: "tokens/req", meaning: "Total tokens processed per request (input + output, per your policy)" },
            { name: "tokens_per_sec_required", unit: "tokens/sec", meaning: "Peak throughput demand derived from above" },
            { name: "tps_per_gpu", unit: "tokens/sec/GPU", meaning: "Benchmark throughput for the chosen chip/workload/settings" },
            { name: "target_utilization", unit: "0–1", meaning: "Planned usable utilization (headroom included)" },
            { name: "resilience_factor", unit: "≥1", meaning: "Extra headroom for failover / maintenance / burst" },
            { name: "gpu_raw", unit: "GPUs", meaning: "Tokens/sec required divided by TPS per GPU" },
            { name: "gpu_total_with_resilience", unit: "GPUs", meaning: "Final recommended GPU count after utilization + resilience" },
            { name: "context_len", unit: "tokens", meaning: "Benchmark context length (used to look up TPS)" },
            { name: "output_len", unit: "tokens", meaning: "Benchmark output length (used to look up TPS)" },
            { name: "batch_size", unit: "count", meaning: "Benchmark batch size (used to look up TPS)" },
            { name: "concurrency", unit: "count", meaning: "Benchmark concurrency (used to look up TPS)" },
          ]}
        />

        <Card title="B) Convert users → tokens/sec" subtitle="Peak activity model" right={<Pill>Demand</Pill>}>
          <Eq>{`PeakConcurrentUsers =
  total_users × peak_concurrency_pct

RequestsPerHourAtPeak =
  PeakConcurrentUsers × requests_per_user_per_hour

TokensPerHourAtPeak =
  RequestsPerHourAtPeak × tokens_per_request

TokensPerSecRequired =
  TokensPerHourAtPeak / 3600`}</Eq>
          <Hint>
            Make sure <Pill>tokens_per_request</Pill> matches your definition (input only vs input+output).
            If you include overhead (system prompts, tool calls), document it as an explicit multiplier.
          </Hint>
        </Card>

        <Card title="C) Convert tokens/sec → GPUs" subtitle="Benchmark TPS per GPU" right={<Pill>Benchmark</Pill>}>
          <Eq>{`GPU_Raw =
  TokensPerSecRequired / tps_per_gpu`}</Eq>
          <Small>
            <b>tps_per_gpu</b> is workload+chip specific (and depends on context/output length, batch, concurrency, stack).
          </Small>
        </Card>

        <Card title="D) Apply utilization and resilience" subtitle="Headroom policy" right={<Pill>Policy</Pill>}>
          <Eq>{`GPU_Adj_Util =
  GPU_Raw / target_utilization

GPU_Total_With_Resilience =
  GPU_Adj_Util × resilience_factor`}</Eq>
          <Hint>
            Many teams round up GPU totals. If you do, show both <b>raw</b> and <b>rounded</b> outputs.
          </Hint>
        </Card>

        <TraceTable title="Calculation Trace" steps={traceSteps} />

        {showPlayground ? (
          <Card title="Quick-check playground" subtitle="Adjust inputs to reproduce your calculator outputs" right={<Pill>Audit</Pill>}>
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

              <Field
                label="tokens_per_request"
                value={tokensPerRequest}
                onChange={(v) => setTokensPerRequest(clamp(v, 0, 1e9))}
                step="50"
                min={0}
              />
              <Field
                label="tps_per_gpu (benchmark)"
                value={tpsPerGpu}
                onChange={(v) => setTpsPerGpu(clamp(v, 0, 1e9))}
                step="10"
                min={0}
              />
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
              <div style={styles.formField}>
                <div style={styles.label}>Benchmark scenario (reference)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <div style={styles.miniLabel}>context_len</div>
                    <input
                      style={styles.input}
                      type="number"
                      value={contextLen}
                      onChange={(e) => setContextLen(clamp(Number(e.target.value), 0, 1e7))}
                    />
                  </div>
                  <div>
                    <div style={styles.miniLabel}>output_len</div>
                    <input
                      style={styles.input}
                      type="number"
                      value={outputLen}
                      onChange={(e) => setOutputLen(clamp(Number(e.target.value), 0, 1e7))}
                    />
                  </div>
                  <div>
                    <div style={styles.miniLabel}>batch_size</div>
                    <input
                      style={styles.input}
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(clamp(Number(e.target.value), 1, 1e6))}
                      min={1}
                    />
                  </div>
                  <div>
                    <div style={styles.miniLabel}>concurrency</div>
                    <input
                      style={styles.input}
                      type="number"
                      value={benchConcurrency}
                      onChange={(e) => setBenchConcurrency(clamp(Number(e.target.value), 1, 1e6))}
                      min={1}
                    />
                  </div>
                </div>
              </div>
              <div style={styles.formField} />
            </div>

            <Divider />

            <div style={styles.kpiGrid}>
              <Kpi
                label="Tokens/sec required"
                value={fmtNum(derived.tokensPerSecRequired, 2)}
                sub="From users → requests → tokens"
              />
              <Kpi
                label="Raw GPUs"
                value={fmtNum(derived.gpuRaw, 3)}
                sub="Demand ÷ TPS/GPU"
              />
              <Kpi
                label="GPUs (util + resilience)"
                value={fmtNum(derived.gpuTotalWithResilience, 3)}
                sub="÷ utilization × resilience"
              />

              <Kpi label="Peak concurrent users" value={fmtNum(derived.peakConcurrentUsers, 2)} sub="Users × peak %" />
              <Kpi label="Requests/hour (peak)" value={fmtNum(derived.requestsPerHourAtPeak, 2)} sub="Concurrent × req/hr" />
              <Kpi label="Tokens/hour (peak)" value={fmtNum(derived.tokensPerHour, 2)} sub="Req/hr × tokens/req" />
            </div>

            <Hint>
              If your API computes <Pill>tps_per_gpu</Pill> dynamically from{" "}
              <Pill>context_len</Pill>, <Pill>output_len</Pill>, <Pill>batch_size</Pill>,{" "}
              and <Pill>concurrency</Pill>, add a section here titled <b>“Effective TPS derivation”</b>
              and expose that math (or table lookup rules) explicitly.
            </Hint>
          </Card>
        ) : null}

        <Card title="Common reviewer questions" subtitle="What to document if asked" right={<Pill>Notes</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>Tokens/request definition</b>: input only vs input+output; overhead (system/tool tokens).
            </li>
            <li>
              <b>Benchmark provenance</b>: how TPS/GPU was measured (model, stack, precision, KV-cache settings).
            </li>
            <li>
              <b>Peak definition</b>: what time window “peak” represents (1 min, 5 min, hour).
            </li>
            <li>
              <b>Resilience factor</b>: N+1, AZ failure, maintenance, burst allowance.
            </li>
            <li>
              <b>Rounding policy</b>: ceil GPUs, minimum cluster sizes, per-pool segmentation (embeddings vs chat).
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
  miniLabel: {
    fontSize: 10.5,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 6,
    fontWeight: 800,
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