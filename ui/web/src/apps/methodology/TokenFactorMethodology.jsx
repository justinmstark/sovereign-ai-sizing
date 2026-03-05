// File: src/apps/methodology/TokenFactorMethodology.jsx
import React, { useMemo, useState } from "react";

/**
 * TokenFactorMethodology.jsx
 * Transparent methodology page for the "LLM Token Factor" calculator.
 *
 * Intent:
 * - Compare REQUIRED tokens/sec demand vs INSTALLED tokens/sec capacity.
 * - "Token factor" = required / capacity (lower is better; >1 means under-provisioned).
 * - "Headroom %" = (capacity - required) / required × 100
 *
 * Demand model (same as GPUaaS):
 * - total_users × peak_concurrency_pct => peak concurrent users
 * - peak concurrent users × requests_per_user_per_hour => requests/hour at peak
 * - requests/hour × tokens_per_request => tokens/hour at peak
 * - / 3600 => tokens/sec required
 *
 * Capacity model:
 * - installed_gpus × tps_per_gpu => tokens/sec capacity
 *
 * Notes:
 * - In your app, tps_per_gpu comes from the benchmark DB by chip/workload and scenario settings
 *   (context_len/output_len/batch_size/concurrency).
 * - This page makes that dependency explicit and keeps the arithmetic auditable.
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

function Field({ label, value, onChange, step, min, max, placeholder }) {
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
        placeholder={placeholder}
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

export default function TokenFactorMethodology() {
  const [showPlayground, setShowPlayground] = useState(true);

  // Demand inputs
  const [totalUsers, setTotalUsers] = useState(10000);
  const [peakConcurrencyPct, setPeakConcurrencyPct] = useState(0.2);
  const [requestsPerUserPerHour, setRequestsPerUserPerHour] = useState(6);
  const [tokensPerRequest, setTokensPerRequest] = useState(1500);

  // Capacity inputs
  const [installedGpus, setInstalledGpus] = useState(64);
  const [tpsPerGpu, setTpsPerGpu] = useState(250);

  // Benchmark scenario reference fields (typically used to select TPS)
  const [contextLen, setContextLen] = useState(8192);
  const [outputLen, setOutputLen] = useState(256);
  const [batchSize, setBatchSize] = useState(1);
  const [benchConcurrency, setBenchConcurrency] = useState(10);

  const derived = useMemo(() => {
    const peakConcurrentUsers = totalUsers * peakConcurrencyPct;
    const requestsPerHourAtPeak = peakConcurrentUsers * requestsPerUserPerHour;
    const tokensPerHour = requestsPerHourAtPeak * tokensPerRequest;
    const tokensPerSecRequired = tokensPerHour / 3600.0;

    const tokensPerSecCapacity = installedGpus * tpsPerGpu;

    const tokenFactor =
      tokensPerSecCapacity > 0 ? tokensPerSecRequired / tokensPerSecCapacity : Infinity;

    const headroomPct =
      tokensPerSecRequired > 0
        ? ((tokensPerSecCapacity - tokensPerSecRequired) / tokensPerSecRequired) * 100.0
        : Infinity;

    return {
      peakConcurrentUsers,
      requestsPerHourAtPeak,
      tokensPerHour,
      tokensPerSecRequired,
      tokensPerSecCapacity,
      tokenFactor,
      headroomPct,
    };
  }, [
    totalUsers,
    peakConcurrencyPct,
    requestsPerUserPerHour,
    tokensPerRequest,
    installedGpus,
    tpsPerGpu,
  ]);

  const traceSteps = useMemo(() => {
    const val = (x) => (Number.isFinite(x) ? x.toFixed(6) : x === Infinity ? "∞" : "—");
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
        label: "TokensPerSecCapacity",
        expr: "installed_gpus × tps_per_gpu",
        value: val(derived.tokensPerSecCapacity),
      },
      {
        label: "TokenFactor",
        expr: "TokensPerSecRequired ÷ TokensPerSecCapacity",
        value: val(derived.tokenFactor),
      },
      {
        label: "HeadroomPct",
        expr: "((TokensPerSecCapacity − TokensPerSecRequired) ÷ TokensPerSecRequired) × 100",
        value: val(derived.headroomPct),
      },
    ];
  }, [derived]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>LLM Token Factor – Methodology</div>
          <div style={styles.hSubtitle}>
            Auditable comparison of <Pill>required</Pill> vs <Pill>installed</Pill> token throughput.
            Outputs <Pill>token factor</Pill> and <Pill>headroom</Pill>.
          </div>
        </div>
        <Toggle value={showPlayground} onChange={setShowPlayground} label="Show playground" />
      </div>

      <div style={styles.grid}>
        <Card title="A) What is being measured?" subtitle="Capacity check against an installed GPU fleet" right={<Pill>Scope</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>Required throughput</b>: tokens/sec derived from user activity at peak.
            </li>
            <li>
              <b>Installed capacity</b>: installed_gpus × benchmark TPS per GPU.
            </li>
            <li>
              <b>Token factor</b>: required / capacity (≥1 means you are short).
            </li>
            <li>
              <b>Headroom %</b>: how much capacity remains vs required load.
            </li>
          </ul>
          <Small>
            This is a “sanity check” view: it’s perfect for comparing a target demand profile to an existing cluster.
          </Small>
        </Card>

        <VariablesCard
          rows={[
            { name: "total_users", unit: "users", meaning: "Total users in population" },
            { name: "peak_concurrency_pct", unit: "0–1", meaning: "Fraction of users active concurrently at peak" },
            { name: "requests_per_user_per_hour", unit: "req/user/hour", meaning: "Request frequency per active user at peak" },
            { name: "tokens_per_request", unit: "tokens/req", meaning: "Total tokens processed per request (input + output, per your policy)" },
            { name: "tokens_per_sec_required", unit: "tokens/sec", meaning: "Peak throughput demand derived from above" },
            { name: "installed_gpus", unit: "GPUs", meaning: "Number of GPUs available for this service pool" },
            { name: "tps_per_gpu", unit: "tokens/sec/GPU", meaning: "Benchmark throughput for the chosen chip/workload/settings" },
            { name: "tokens_per_sec_capacity", unit: "tokens/sec", meaning: "Installed capacity = installed_gpus × tps_per_gpu" },
            { name: "token_factor", unit: "ratio", meaning: "Required ÷ capacity (lower is better)" },
            { name: "headroom_pct", unit: "%", meaning: "((capacity − required) ÷ required) × 100" },
            { name: "context_len", unit: "tokens", meaning: "Benchmark context length (used to look up TPS)" },
            { name: "output_len", unit: "tokens", meaning: "Benchmark output length (used to look up TPS)" },
            { name: "batch_size", unit: "count", meaning: "Benchmark batch size (used to look up TPS)" },
            { name: "concurrency", unit: "count", meaning: "Benchmark concurrency (used to look up TPS)" },
          ]}
        />

        <Card title="B) Demand: users → tokens/sec" subtitle="Same demand model as GPUaaS" right={<Pill>Demand</Pill>}>
          <Eq>{`PeakConcurrentUsers =
  total_users × peak_concurrency_pct

RequestsPerHourAtPeak =
  PeakConcurrentUsers × requests_per_user_per_hour

TokensPerHourAtPeak =
  RequestsPerHourAtPeak × tokens_per_request

TokensPerSecRequired =
  TokensPerHourAtPeak / 3600`}</Eq>
          <Hint>
            Ensure <Pill>tokens_per_request</Pill> is defined consistently across calculators
            (input-only vs input+output; overhead policy).
          </Hint>
        </Card>

        <Card title="C) Capacity: installed GPUs → tokens/sec" subtitle="Benchmark TPS per GPU" right={<Pill>Capacity</Pill>}>
          <Eq>{`TokensPerSecCapacity =
  installed_gpus × tps_per_gpu`}</Eq>
          <Small>
            <b>tps_per_gpu</b> is typically a DB lookup by chip/workload and benchmark scenario (context/output/batch/concurrency).
          </Small>
        </Card>

        <Card title="D) Token factor and headroom" subtitle="What the outputs mean" right={<Pill>Outputs</Pill>}>
          <Eq>{`TokenFactor =
  TokensPerSecRequired / TokensPerSecCapacity

HeadroomPct =
  ((TokensPerSecCapacity − TokensPerSecRequired) / TokensPerSecRequired) × 100`}</Eq>
          <Hint>
            Interpretation:
            <ul style={{ margin: "8px 0 0 18px", lineHeight: 1.35 }}>
              <li><b>TokenFactor &lt; 1</b> → you have headroom</li>
              <li><b>TokenFactor = 1</b> → exactly saturated at peak</li>
              <li><b>TokenFactor &gt; 1</b> → under-provisioned (required exceeds capacity)</li>
            </ul>
          </Hint>
        </Card>

        <TraceTable title="Calculation Trace" steps={traceSteps} />

        {showPlayground ? (
          <Card title="Quick-check playground" subtitle="Adjust inputs to reproduce your token factor outputs" right={<Pill>Audit</Pill>}>
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
                label="installed_gpus"
                value={installedGpus}
                onChange={(v) => setInstalledGpus(clamp(v, 0, 1e9))}
                step="1"
                min={0}
              />
              <Field
                label="tps_per_gpu (benchmark)"
                value={tpsPerGpu}
                onChange={(v) => setTpsPerGpu(clamp(v, 0, 1e9))}
                step="10"
                min={0}
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
              <div style={styles.formField} />
            </div>

            <Divider />

            <div style={styles.kpiGrid}>
              <Kpi label="Tokens/sec required" value={fmtNum(derived.tokensPerSecRequired, 2)} sub="From users → requests → tokens" />
              <Kpi label="Tokens/sec capacity" value={fmtNum(derived.tokensPerSecCapacity, 2)} sub="Installed GPUs × TPS/GPU" />
              <Kpi
                label="Token factor (req/cap)"
                value={Number.isFinite(Number(derived.tokenFactor)) ? fmtNum(derived.tokenFactor, 3) : "∞"}
                sub="Lower is better"
              />

              <Kpi
                label="Headroom %"
                value={Number.isFinite(Number(derived.headroomPct)) ? fmtNum(derived.headroomPct, 1) + "%" : "∞"}
                sub="(cap - req) / req"
              />
              <Kpi label="Peak concurrent users" value={fmtNum(derived.peakConcurrentUsers, 2)} sub="Users × peak %" />
              <Kpi label="Requests/hour (peak)" value={fmtNum(derived.requestsPerHourAtPeak, 2)} sub="Concurrent × req/hr" />
            </div>

            <Hint>
              If you have multiple pools (embeddings vs chat vs rerank) compute token factor per pool and
              then show an overall “worst pool” or weighted aggregate explicitly.
            </Hint>
          </Card>
        ) : null}

        <Card title="Common reviewer questions" subtitle="What to document if asked" right={<Pill>Notes</Pill>}>
          <ul style={styles.ul}>
            <li>
              <b>Installed GPUs</b>: do you count only service GPUs or include spare/maintenance capacity?
            </li>
            <li>
              <b>Benchmark representativeness</b>: does TPS match your production stack and target latency?
            </li>
            <li>
              <b>Demand peak window</b>: 1m vs 5m vs hourly peaks can change required throughput materially.
            </li>
            <li>
              <b>Rounding / reservations</b>: do you reserve capacity for retries, batching inefficiency, or multi-tenant noise?
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