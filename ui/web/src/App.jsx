// File: src/App.jsx
import { useEffect, useMemo, useState } from "react";
import LLMServicesCalculator from "./LLMServicesCalculator";

// ✅ Omniverse
import OmniverseSizingPage from "./apps/omniverse/OmniverseSizingPage";

// LLM Training
import LLMTrainingPage from "./apps/llmtraining/LLMTrainingPage";

// ✅ AI/ML Training
import AIMLTrainingApp from "./apps/training/AIMLTrainingApp";

// ✅ Digital Twins
import DigitalTwinSizingPage from "./apps/digitalTwins/DigitalTwinSizingPage.jsx";

// ✅ GenAI Inferencing Engine
import GenAIInferencingEngine from "./apps/ra/GenAIInferencingEngine";

// ✅ Methodology (NEW)
import MethodologyHome from "./apps/methodology/MethodologyHome.jsx";

function safeWorkspace(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function getJson(url, options) {
  const r = await fetch(url, options);
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response from ${url}: ${text.slice(0, 140)}`);
  }
}

/* =========================
   Accent-ish theme tokens
   ========================= */
const TOKENS = {
  container: 1200,
  bg0: "#07080c",
  bg1: "#0b0d12",
  text: "rgba(255,255,255,0.92)",
  muted: "rgba(255,255,255,0.70)",
  stroke: "rgba(255,255,255,0.12)",
  panel: "rgba(255,255,255,0.06)",
  panel2: "rgba(255,255,255,0.035)",
  shadow: "0 18px 44px rgba(0,0,0,0.38)",
  radius: 18,
  accentA: "rgba(168,85,247,0.90)", // purple
  accentB: "rgba(34,211,238,0.55)", // cyan
};

function AppShell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        color: TOKENS.text,
        background: `
          radial-gradient(1200px 700px at 18% -10%, rgba(168,85,247,.22), transparent 55%),
          radial-gradient(900px 600px at 85% 10%, rgba(34,211,238,.12), transparent 55%),
          linear-gradient(180deg, ${TOKENS.bg0}, ${TOKENS.bg1})
        `,
      }}
    >
      {children}
    </div>
  );
}

function Container({ children, style }) {
  return (
    <div
      style={{
        maxWidth: TOKENS.container,
        margin: "0 auto",
        padding: "0 18px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function TopNav({ brandLeft, right }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backdropFilter: "blur(14px)",
        background: "rgba(7,8,12,.70)",
        borderBottom: `1px solid ${TOKENS.stroke}`,
      }}
    >
      <Container>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            padding: "14px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: `linear-gradient(135deg, ${TOKENS.accentA}, ${TOKENS.accentB})`,
                boxShadow: "0 0 0 6px rgba(168,85,247,.10)",
              }}
            />
            <div style={{ fontWeight: 850, letterSpacing: 0.2 }}>{brandLeft}</div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{right}</div>
        </div>
      </Container>
    </div>
  );
}

function NavLink({ children, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 999,
        border: `1px solid ${active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.10)"}`,
        background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
        color: active ? "white" : "rgba(255,255,255,0.82)",
        cursor: "pointer",
        fontWeight: 800,
        letterSpacing: 0.15,
      }}
    >
      {children}
    </button>
  );
}

function Hero({ kicker, title, subtitle, actions }) {
  return (
    <div style={{ padding: "34px 0 18px 0" }}>
      <Container>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: TOKENS.muted, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12 }}>
            {kicker}
          </div>

          <h1 style={{ margin: 0, fontSize: "clamp(30px, 4vw, 56px)", lineHeight: 1.05, letterSpacing: -0.02 }}>
            {title}
          </h1>

          <div style={{ color: TOKENS.muted, maxWidth: 820, lineHeight: 1.55, fontSize: 15.5 }}>{subtitle}</div>

          {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>{actions}</div> : null}
        </div>
      </Container>
    </div>
  );
}

function Section({ children, style }) {
  return (
    <div style={{ padding: "22px 0", ...style }}>
      <Container>{children}</Container>
    </div>
  );
}

function Card({ title, subtitle, children, style }) {
  return (
    <div
      style={{
        borderRadius: TOKENS.radius,
        border: `1px solid ${TOKENS.stroke}`,
        background: `linear-gradient(180deg, ${TOKENS.panel}, ${TOKENS.panel2})`,
        boxShadow: TOKENS.shadow,
        ...style,
      }}
    >
      <div style={{ padding: 14 }}>
        {title ? (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 0.2, marginBottom: 3 }}>{title}</div>
            {subtitle ? <div style={{ opacity: 0.72, fontSize: 11.5, lineHeight: 1.25 }}>{subtitle}</div> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function SmallPill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.04)",
        color: "rgba(255,255,255,0.80)",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: disabled
          ? "rgba(255,255,255,0.06)"
          : `linear-gradient(135deg, ${TOKENS.accentA}, ${TOKENS.accentB})`,
        color: disabled ? "rgba(255,255,255,0.55)" : "#07080c",
        fontWeight: 950,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 16px 36px rgba(0,0,0,0.35)",
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.04)",
        color: disabled ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.90)",
        fontWeight: 900,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 850 }}>{label}</div>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "9px 10px",
          marginTop: 6,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.30)",
          color: "rgba(255,255,255,0.92)",
          outline: "none",
          fontSize: 13,
        }}
      />
    </label>
  );
}

async function noop() {}

/* =========================
   App
   ========================= */
export default function App() {
  // ---- Tabs (Sizing models + Methodology) ----
  const TABS = [
    { id: "gpu-aas", name: "GPUaaS" },
    { id: "token-factor", name: "LLM Token Factor" },
    { id: "llm-services", name: "LLM Services (Factory)" },
    { id: "genai-inferencing", name: "GenAI Inferencing Engine" },
    { id: "omniverse", name: "Omniverse" },
    { id: "llm-training", name: "LLM Training" },
    { id: "ai-ml-training", name: "AI/ML Training" },
    { id: "digital-twins", name: "Digital Twins" },

    // ✅ NEW
    { id: "methodology", name: "Methodology" },
  ];

  // ---- top-level screen ----
  const [screen, setScreen] = useState("home"); // "home" | "models"

  // ---- workspace ----
  const [clientName, setClientName] = useState("default");
  const [environment, setEnvironment] = useState("dev");

  const workspace = useMemo(() => {
    const c = safeWorkspace(clientName) || "default";
    const e = safeWorkspace(environment) || "dev";
    return `${c}_${e}`;
  }, [clientName, environment]);

  function apiHeaders(extra = {}) {
    return {
      "Content-Type": "application/json",
      "x-workspace": workspace,
      ...extra,
    };
  }

  // ---- recents ----
  const RECENTS_KEY = "ai_factory_recent_workspaces_v1";

  function addRecentWorkspace(ws) {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      const prev = raw ? JSON.parse(raw) : [];
      const next = [ws, ...prev.filter((x) => x !== ws)].slice(0, 12);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      return next;
    } catch {
      return [];
    }
  }

  function loadRecents() {
    try {
      const raw = localStorage.getItem(RECENTS_KEY);
      const prev = raw ? JSON.parse(raw) : [];
      return Array.isArray(prev) ? prev : [];
    } catch {
      return [];
    }
  }

  const [recents, setRecents] = useState(() => loadRecents());
  const [existingPick, setExistingPick] = useState("");

  useEffect(() => {
    setRecents(loadRecents());
  }, []);

  // ---- tab state ----
  const [tab, setTab] = useState("gpu-aas");

  // ---- data ----
  const [chips, setChips] = useState([]);
  const [workloads, setWorkloads] = useState([]);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    chip_id: "",
    workload_id: "",
    total_users: 10000,
    peak_concurrency_pct: 0.2,
    requests_per_user_per_hour: 6,
    tokens_per_request: 1500,
    context_len: 8192,
    output_len: 256,
    batch_size: 1,
    concurrency: 10,
    target_utilization: 0.7,
    resilience_factor: 1.2,
    installed_gpus: "",
  });

  const [gpuResult, setGpuResult] = useState(null);
  const [tokenResult, setTokenResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const [loadingChips, setLoadingChips] = useState(false);
  const [loadingWorkloads, setLoadingWorkloads] = useState(false);

  const selectedChip = useMemo(() => chips.find((c) => c.chip_id === form.chip_id), [chips, form.chip_id]);
  const selectedWorkload = useMemo(
    () => workloads.find((w) => w.workload_id === form.workload_id),
    [workloads, form.workload_id]
  );

  const fmt = (v, digits = 2) => Number(v ?? 0).toFixed(digits);

  function onChange(e) {
    const { name, value } = e.target;

    setForm((p) => ({
      ...p,
      [name]:
        name === "installed_gpus"
          ? value === ""
            ? ""
            : Number(value)
          : name.includes("pct") ||
            name.includes("util") ||
            name.includes("factor") ||
            name.includes("requests_per_user_per_hour")
          ? Number(value)
          : name.includes("users") ||
            name.includes("tokens") ||
            name.includes("len") ||
            name.includes("batch") ||
            name.includes("concurrency")
          ? Number(value)
          : value,
    }));
  }

  // ---- Load chips + workloads for this workspace (only in models screen) ----
  useEffect(() => {
    if (screen !== "models") return;
    if (tab === "methodology") return; // ✅ no API calls needed for methodology

    let alive = true;

    setErr("");
    setGpuResult(null);
    setTokenResult(null);

    Promise.all([getJson("/api/chips", { headers: apiHeaders() }), getJson("/api/workloads", { headers: apiHeaders() })])
      .then(([c, w]) => {
        if (!alive) return;
        setChips(Array.isArray(c) ? c : []);
        setWorkloads(Array.isArray(w) ? w : []);

        setForm((prev) => {
          const chip_id = prev.chip_id || (c?.[0]?.chip_id ?? "");
          const workload_id =
            prev.workload_id ||
            (w?.find?.((x) => x.service_class === "llm_inference")?.workload_id ?? w?.[0]?.workload_id ?? "");
          return { ...prev, chip_id, workload_id };
        });
      })
      .catch((e) => {
        if (!alive) return;
        setErr(String(e));
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace, screen, tab]);

  // ---- when chip changes, refresh permitted workloads ----
  useEffect(() => {
    if (screen !== "models") return;
    if (tab === "methodology") return;
    if (!form.chip_id) return;

    let alive = true;
    setLoadingWorkloads(true);
    setErr("");

    getJson(`/api/workloads?chip_id=${form.chip_id}`, { headers: apiHeaders() })
      .then((w) => {
        if (!alive) return;

        setWorkloads(Array.isArray(w) ? w : []);

        setForm((prev) => {
          const stillValid = (w || []).some((x) => x.workload_id === prev.workload_id);
          const nextWorkloadId = stillValid ? prev.workload_id : (w?.[0]?.workload_id ?? "");
          if (nextWorkloadId === prev.workload_id) return prev;
          return { ...prev, workload_id: nextWorkloadId };
        });
      })
      .catch((e) => {
        if (!alive) return;
        setErr(String(e));
      })
      .finally(() => {
        if (!alive) return;
        setLoadingWorkloads(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.chip_id, workspace, screen, tab]);

  // ---- when workload changes, refresh permitted chips ----
  useEffect(() => {
    if (screen !== "models") return;
    if (tab === "methodology") return;
    if (!form.workload_id) return;

    let alive = true;
    setLoadingChips(true);
    setErr("");

    getJson(`/api/chips?workload_id=${form.workload_id}`, { headers: apiHeaders() })
      .then((c) => {
        if (!alive) return;

        setChips(Array.isArray(c) ? c : []);

        setForm((prev) => {
          const stillValid = (c || []).some((x) => x.chip_id === prev.chip_id);
          const nextChipId = stillValid ? prev.chip_id : (c?.[0]?.chip_id ?? "");
          if (nextChipId === prev.chip_id) return prev;
          return { ...prev, chip_id: nextChipId };
        });
      })
      .catch((e) => {
        if (!alive) return;
        setErr(String(e));
      })
      .finally(() => {
        if (!alive) return;
        setLoadingChips(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.workload_id, workspace, screen, tab]);

  async function runGpuAas(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    setErr("");
    setBusy(true);

    try {
      const payload = { ...form };
      delete payload.installed_gpus;

      const res = await getJson("/api/size/gpu-aas", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(payload),
      });
      setGpuResult(res);
    } catch (ex) {
      setErr(String(ex));
    } finally {
      setBusy(false);
    }
  }

  async function runTokenFactor(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    setErr("");
    setBusy(true);

    try {
      const payload = { ...form };
      const tokenPayload = {
        ...payload,
        ...(form.installed_gpus ? { installed_gpus: Number(form.installed_gpus) } : {}),
      };

      const tf = await getJson("/api/size/llm-token-factor", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify(tokenPayload),
      });
      setTokenResult(tf);
    } catch (ex) {
      setErr(String(ex));
    } finally {
      setBusy(false);
    }
  }

  const InputsPanel = (
    <Card title="Inputs" subtitle="Workspace-aware sizing inputs + benchmark scenario.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <TextInput label="Client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. acme" />
        <TextInput
          label="Environment"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          placeholder="dev / test / prod"
        />
      </div>

      <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 14 }}>
        Workspace schema: <b>{workspace}</b> (sent as <code>x-workspace</code>)
      </div>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ opacity: 0.85, fontSize: 12, fontWeight: 850 }}>Chip</div>
        <select
          name="chip_id"
          value={form.chip_id}
          onChange={onChange}
          disabled={loadingChips}
          style={{
            width: "100%",
            padding: 10,
            marginTop: 6,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.30)",
            color: "rgba(255,255,255,0.92)",
            outline: "none",
          }}
        >
          {chips.map((c) => (
            <option key={c.chip_id} value={c.chip_id}>
              {c.vendor} {c.model_name} {c.variant} ({c.generation})
            </option>
          ))}
        </select>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>{loadingChips ? "Loading permitted chips…" : " "}</div>
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ opacity: 0.85, fontSize: 12, fontWeight: 850 }}>Workload</div>
        <select
          name="workload_id"
          value={form.workload_id}
          onChange={onChange}
          disabled={loadingWorkloads || workloads.length === 0}
          style={{
            width: "100%",
            padding: 10,
            marginTop: 6,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(0,0,0,0.30)",
            color: "rgba(255,255,255,0.92)",
            outline: "none",
          }}
        >
          {workloads.map((w) => (
            <option key={w.workload_id} value={w.workload_id}>
              {w.service_class} — {w.model_name} {w.precision} ({w.serving_stack})
            </option>
          ))}
        </select>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
          {loadingWorkloads ? "Loading permitted workloads…" : workloads.length === 0 ? "No permitted workloads for this chip." : " "}
        </div>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          ["Total users", "total_users", "number", {}],
          ["Peak concurrency (0–1)", "peak_concurrency_pct", "number", { step: "0.01" }],
          ["Requests/user/hour", "requests_per_user_per_hour", "number", { step: "0.1" }],
          ["Tokens/request", "tokens_per_request", "number", {}],
          ["Target utilization (0–1)", "target_utilization", "number", { step: "0.01" }],
          ["Resilience factor (≥1)", "resilience_factor", "number", { step: "0.05" }],
          ["Installed GPUs (optional)", "installed_gpus", "number", { placeholder: "Leave blank to derive from sizing" }],
        ].map(([label, name, type, extra]) => (
          <label key={name} style={{ display: "block" }}>
            <div style={{ opacity: 0.85, fontSize: 12, fontWeight: 850 }}>{label}</div>
            <input
              name={name}
              type={type}
              value={form[name]}
              onChange={onChange}
              {...extra}
              style={{
                width: "100%",
                padding: 10,
                marginTop: 6,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.30)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
              }}
            />
          </label>
        ))}
      </div>

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 900, opacity: 0.9 }}>Benchmark scenario (advanced)</summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          {[
            ["Context length", "context_len"],
            ["Output length", "output_len"],
            ["Batch size", "batch_size"],
            ["Concurrency", "concurrency"],
          ].map(([label, name]) => (
            <label key={name} style={{ display: "block" }}>
              <div style={{ opacity: 0.85, fontSize: 12, fontWeight: 850 }}>{label}</div>
              <input
                name={name}
                type="number"
                value={form[name]}
                onChange={onChange}
                style={{
                  width: "100%",
                  padding: 10,
                  marginTop: 6,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.30)",
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                }}
              />
            </label>
          ))}
        </div>
      </details>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <PrimaryButton onClick={runGpuAas} disabled={busy || !form.chip_id || !form.workload_id}>
          {busy ? "Working..." : "Run GPUaaS"}
        </PrimaryButton>

        <GhostButton onClick={runTokenFactor} disabled={busy || !form.chip_id || !form.workload_id}>
          {busy ? "Working..." : "Run Token Factor"}
        </GhostButton>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <SmallPill>
          Chip: {selectedChip ? `${selectedChip.vendor} ${selectedChip.model_name} ${selectedChip.variant}` : "—"}
        </SmallPill>
        <SmallPill>
          Workload:{" "}
          {selectedWorkload
            ? `${selectedWorkload.service_class} ${selectedWorkload.model_name} ${selectedWorkload.precision}`
            : "—"}
        </SmallPill>
      </div>
    </Card>
  );

  const ResultsGpuAas = (
    <Card title="Results" subtitle="GPU requirement derived from TPS benchmarks + utilization + resilience.">
      {!gpuResult ? (
        <div style={{ opacity: 0.82 }}>Run GPUaaS to see GPU requirements.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <b>Tokens/sec required:</b> {fmt(gpuResult.tokens_per_sec_required, 2)}
          </div>
          <div>
            <b>Benchmark TPS per GPU:</b> {fmt(gpuResult.tps_per_gpu, 2)}
          </div>
          <div>
            <b>Raw GPUs:</b> {fmt(gpuResult.gpu_raw, 2)}
          </div>
          <div>
            <b>Utilization-adjusted GPUs:</b> {fmt(gpuResult.gpu_adjusted_for_utilization, 2)}
          </div>
          <div style={{ fontSize: 20 }}>
            <b>Total GPUs (with resilience):</b> {gpuResult.gpu_total_with_resilience}
          </div>

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 900, opacity: 0.9 }}>Assumptions</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                background: "rgba(0,0,0,0.35)",
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${TOKENS.stroke}`,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(gpuResult.assumptions, null, 2)}
            </pre>
          </details>

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 900, opacity: 0.9 }}>Calculator details</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                background: "rgba(0,0,0,0.35)",
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${TOKENS.stroke}`,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(gpuResult.calculator_details, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </Card>
  );

  const ResultsTokenFactor = (
    <Card title="Results" subtitle="Capacity + headroom from installed GPUs vs demand.">
      {!tokenResult ? (
        <div style={{ opacity: 0.82 }}>Run Token Factor to see capacity + headroom.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <b>Tokens/sec required:</b> {fmt(tokenResult.tokens_per_sec_required, 2)}
          </div>
          <div>
            <b>Benchmark TPS per GPU:</b> {fmt(tokenResult.tps_per_gpu, 2)}
          </div>
          <div>
            <b>Installed GPUs:</b> {tokenResult.installed_gpus}
          </div>
          <div>
            <b>Tokens/sec capacity:</b> {fmt(tokenResult.tokens_per_sec_capacity, 2)}
          </div>
          <div>
            <b>Token factor (required/capacity):</b>{" "}
            {Number.isFinite(Number(tokenResult.token_factor)) ? fmt(tokenResult.token_factor, 3) : "∞"}
          </div>
          <div style={{ fontSize: 20 }}>
            <b>Headroom:</b> {fmt(tokenResult.headroom_pct, 1)}%
          </div>

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 900, opacity: 0.9 }}>Token factor details</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                background: "rgba(0,0,0,0.35)",
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${TOKENS.stroke}`,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(tokenResult, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </Card>
  );

  const ErrorBanner = err ? (
    <Section style={{ paddingTop: 0 }}>
      <div
        style={{
          padding: 12,
          background: "rgba(160,0,0,0.20)",
          border: "1px solid rgba(255,120,120,0.35)",
          color: "rgba(255,210,210,0.95)",
          borderRadius: 14,
        }}
      >
        <b>Error:</b> {err}
      </div>
    </Section>
  ) : null;

  /* =========================
     Home Screen (Accenture-ish)
     ========================= */
  const HomeScreen = (
    <>
      <Hero
        kicker="Application-led sizing"
        title="AI Factory Sizing Platform"
        subtitle={
          <>
            Translate usage patterns, responsiveness targets, and resilience requirements into practical capacity for{" "}
            <b>GPU, CPU, memory, storage</b> — with workspace-aware benchmark lookups.
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <SmallPill>Workspace: {workspace}</SmallPill>
              <SmallPill>Schema header: x-workspace</SmallPill>
              <SmallPill>Recents: {recents.length}</SmallPill>
            </div>
          </>
        }
        actions={
          <>
            <PrimaryButton
              onClick={() => {
                const next = addRecentWorkspace(workspace);
                setRecents(next);
                setScreen("models");
              }}
            >
              Open sizing models →
            </PrimaryButton>
            <GhostButton
              onClick={() => {
                const next = addRecentWorkspace(workspace);
                setRecents(next);
              }}
            >
              Save workspace
            </GhostButton>

            {/* ✅ NEW: Jump straight to methodology */}
            <GhostButton
              onClick={() => {
                setTab("methodology");
                setScreen("models");
              }}
            >
              View methodology →
            </GhostButton>
          </>
        }
      />

      <Section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(260px, 1fr))",
            gap: 14,
            alignItems: "start",
          }}
        >
          <Card
            title="New Client Environment"
            subtitle="Create a new workspace (client + environment), then jump into sizing models."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginTop: 6,
                alignItems: "start",
              }}
            >
              <TextInput label="Client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="e.g. acme" />
              <TextInput
                label="Environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                placeholder="dev / test / prod"
              />
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <PrimaryButton
                onClick={() => {
                  const next = addRecentWorkspace(workspace);
                  setRecents(next);
                  setScreen("models");
                }}
              >
                Create & Open Models →
              </PrimaryButton>

              <GhostButton
                onClick={() => {
                  const next = addRecentWorkspace(workspace);
                  setRecents(next);
                }}
              >
                Save to Recents
              </GhostButton>
            </div>

            <div style={{ marginTop: 10, opacity: 0.70, fontSize: 11.5, lineHeight: 1.25 }}>
              This doesn’t create DB tables yet — it sets the schema header (<code>x-workspace</code>) used by the API.
            </div>
          </Card>

          <Card title="Sizing Models" subtitle="Go straight to calculators. Workspace context is preserved.">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TABS.filter((t) => t.id !== "methodology").map((t) => (
                <SmallPill key={t.id}>{t.name}</SmallPill>
              ))}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <PrimaryButton
                onClick={() => {
                  const next = addRecentWorkspace(workspace);
                  setRecents(next);
                  setScreen("models");
                }}
              >
                Open sizing models →
              </PrimaryButton>

              <GhostButton
                onClick={() => {
                  setTab("gpu-aas");
                  const next = addRecentWorkspace(workspace);
                  setRecents(next);
                  setScreen("models");
                }}
              >
                Start at GPUaaS
              </GhostButton>

              {/* ✅ NEW */}
              <GhostButton
                onClick={() => {
                  setTab("methodology");
                  setScreen("models");
                }}
              >
                Methodology →
              </GhostButton>
            </div>

            <div style={{ marginTop: 10, opacity: 0.70, fontSize: 11.5, lineHeight: 1.25 }}>
              Tip: once you’re in models, switch tabs without losing workspace.
            </div>
          </Card>

          <Card title="Existing Client Environment" subtitle="Load a saved workspace and continue sizing.">
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 850 }}>Choose recent workspace</div>
              <select
                value={existingPick}
                onChange={(e) => setExistingPick(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 10px",
                  marginTop: 6,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.30)",
                  color: "rgba(255,255,255,0.92)",
                  outline: "none",
                  fontSize: 13,
                }}
              >
                <option value="">— Select —</option>
                {recents.map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <PrimaryButton
                disabled={!existingPick}
                onClick={() => {
                  const parts = String(existingPick || "").split("_");
                  if (parts.length >= 2) {
                    setClientName(parts.slice(0, -1).join("_"));
                    setEnvironment(parts[parts.length - 1]);
                  } else {
                    setClientName(existingPick || "default");
                    setEnvironment("dev");
                  }
                  setScreen("models");
                }}
              >
                Load & Open Models →
              </PrimaryButton>

              <GhostButton
                disabled={recents.length === 0}
                onClick={() => {
                  try {
                    localStorage.removeItem(RECENTS_KEY);
                  } catch {}
                  setRecents([]);
                  setExistingPick("");
                }}
              >
                Clear recents
              </GhostButton>
            </div>

            <div style={{ marginTop: 10, opacity: 0.70, fontSize: 11.5, lineHeight: 1.25 }}>
              Recents are stored in <code>localStorage</code> (client-side only).
            </div>
          </Card>
        </div>
      </Section>
    </>
  );

  /* =========================
     Models Screen (centered rail)
     ========================= */
  const ModelsScreen = (
    <>
      <Hero
        kicker="Workspace-aware sizing"
        title={TABS.find((t) => t.id === tab)?.name || "Sizing Models"}
        subtitle={
          <>
            Workspace schema: <b>{workspace}</b> (sent as <code>x-workspace</code>)
          </>
        }
        actions={
          <>
            <GhostButton
              onClick={() => {
                setScreen("home");
              }}
            >
              ← Home
            </GhostButton>
            <GhostButton
              onClick={() => {
                // quick refresh
                setErr("");
                setGpuResult(null);
                setTokenResult(null);
                // harmless kick to re-run effects
                noop();
              }}
            >
              Clear results
            </GhostButton>
          </>
        }
      />

      <Section style={{ paddingTop: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {TABS.map((t) => (
            <NavLink key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.name}
            </NavLink>
          ))}
        </div>
      </Section>

      {ErrorBanner}

      {/* Per-tab content */}
      {tab === "methodology" ? (
        <Section style={{ paddingTop: 0 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Card
              title="Methodology"
              subtitle="Reference pages showing the calculations and assumptions behind each sizing model."
            />
            <Card>
              <MethodologyHome />
            </Card>
          </div>
        </Section>
      ) : tab === "digital-twins" ? (
        <>
          <Section style={{ paddingTop: 0 }}>
            <Card
              title="Workspace"
              subtitle={
                <>
                  Digital Twins sizing currently persists its workloads in <code>localStorage</code> (client-side).
                  Workspace is: <b>{workspace}</b>
                </>
              }
            />
          </Section>

          <Section style={{ paddingTop: 0 }}>
            <Card>
              <DigitalTwinSizingPage />
            </Card>
          </Section>
        </>
      ) : tab === "llm-services" ? (
        <Section style={{ paddingTop: 0 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Card
              title="Workspace"
              subtitle={
                <>
                  Using schema: <b>{workspace}</b> — next step is wiring this calculator into the same DB tables.
                </>
              }
            />
            <Card>
              <LLMServicesCalculator />
            </Card>
          </div>
        </Section>
      ) : tab === "genai-inferencing" ? (
        <Section style={{ paddingTop: 0 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Card
              title="Workspace"
              subtitle={
                <>
                  GenAI Inferencing Engine sizing runs client-side (no DB calls yet). Workspace is: <b>{workspace}</b>
                </>
              }
            />
            <Card>
              <GenAIInferencingEngine />
            </Card>
          </div>
        </Section>
      ) : tab === "llm-training" ? (
        <Section style={{ paddingTop: 0 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Card
              title="Workspace"
              subtitle={
                <>
                  LLM Training capture currently persists in <code>localStorage</code> (client-side). Workspace is:{" "}
                  <b>{workspace}</b>
                </>
              }
            />
            <Card>
              <LLMTrainingPage />
            </Card>
          </div>
        </Section>
      ) : tab === "ai-ml-training" ? (
        <Section style={{ paddingTop: 0 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Card
              title="Workspace"
              subtitle={
                <>
                  AI/ML Training capture persists in <code>localStorage</code> (client-side). Workspace is:{" "}
                  <b>{workspace}</b>
                </>
              }
            />
            <Card>
              <AIMLTrainingApp />
            </Card>
          </div>
        </Section>
      ) : tab === "omniverse" ? (
        <Section style={{ paddingTop: 0 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Card
              title="Workspace"
              subtitle={
                <>
                  Omniverse sizing currently persists its catalog in <code>localStorage</code> (client-side). Workspace is:{" "}
                  <b>{workspace}</b>
                </>
              }
            />
            <Card>
              <OmniverseSizingPage />
            </Card>
          </div>
        </Section>
      ) : (
        <Section style={{ paddingTop: 0 }}>
          <div
            className="_modelsGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.05fr 0.95fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            {InputsPanel}
            {tab === "gpu-aas" ? ResultsGpuAas : ResultsTokenFactor}
          </div>

          <style>{`
            @media (max-width: 980px){
              ._modelsGrid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
        </Section>
      )}
    </>
  );

  return (
    <AppShell>
      <TopNav
        brandLeft="AI Factory Sizing"
        right={
          <>
            <SmallPill>{workspace}</SmallPill>
            {screen === "home" ? (
              <PrimaryButton
                onClick={() => {
                  const next = addRecentWorkspace(workspace);
                  setRecents(next);
                  setScreen("models");
                }}
              >
                Open models
              </PrimaryButton>
            ) : (
              <GhostButton onClick={() => setScreen("home")}>Home</GhostButton>
            )}
          </>
        }
      />

      {screen === "home" ? HomeScreen : ModelsScreen}

      <div style={{ padding: "26px 0" }}>
        <Container>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ marginTop: 12, opacity: 0.65, fontSize: 12 }}>
            Tip: Move any stray CSS (like <code>#root</code> / <code>.logo</code>) into <code>src/index.css</code> or{" "}
            <code>src/App.css</code> — it should not be inside <code>App.jsx</code>.
          </div>
        </Container>
      </div>
    </AppShell>
  );
}