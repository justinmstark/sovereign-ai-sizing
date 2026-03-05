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

function TabsBar({ tabs, activeTab, setTab }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: isActive ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
              color: isActive ? "white" : "rgba(255,255,255,0.82)",
              cursor: "pointer",
              fontWeight: 750,
              letterSpacing: 0.2,
              boxShadow: isActive ? "0 10px 24px rgba(0,0,0,0.25)" : "none",
              transition: "transform 120ms ease, background 120ms ease, border 120ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0px)";
            }}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

function HeaderBlock({ workspace, onGoHome, showHomeButton }) {
  return (
    <>
      <div
        style={{
          padding: "20px 18px",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            "radial-gradient(circle at 20% 10%, rgba(120,160,255,0.12), transparent 45%), radial-gradient(circle at 90% 30%, rgba(120,160,255,0.08), transparent 55%), rgba(255,255,255,0.03)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 40, letterSpacing: -0.6, lineHeight: 1.05 }}>
              AI Factory Sizing Platform
            </h1>
            <div style={{ opacity: 0.86, marginTop: 8, fontSize: 14 }}>
              Application-led sizing → benchmark TPS lookup → capacity + headroom (workspace-aware)
            </div>
            <div style={{ opacity: 0.72, fontSize: 12, marginTop: 10 }}>
              Workspace schema: <b>{workspace}</b> (sent as <code>x-workspace</code>)
            </div>
          </div>

          {showHomeButton ? (
            <button
              type="button"
              onClick={onGoHome}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.88)",
                fontWeight: 750,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ← Home
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

/* ===== Compact sizing pass ===== */

function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 850, letterSpacing: 0.2, marginBottom: 3 }}>{title}</div>
      {subtitle ? <div style={{ opacity: 0.72, fontSize: 11.5, lineHeight: 1.25 }}>{subtitle}</div> : null}
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.035)",
        boxShadow: "0 18px 44px rgba(0,0,0,0.34)",
      }}
    >
      <SectionTitle title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 750 }}>{label}</div>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "8px 10px",
          marginTop: 6,
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.26)",
          color: "rgba(255,255,255,0.92)",
          outline: "none",
          fontSize: 13,
          lineHeight: 1.2,
        }}
      />
    </label>
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
        fontWeight: 750,
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
        padding: "9px 12px",
        borderRadius: 11,
        border: "1px solid rgba(255,255,255,0.16)",
        background: disabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.10)",
        color: disabled ? "rgba(255,255,255,0.5)" : "white",
        fontWeight: 850,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 12px 22px rgba(0,0,0,0.26)",
        fontSize: 13.5,
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
        padding: "9px 12px",
        borderRadius: 11,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "transparent",
        color: disabled ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.88)",
        fontWeight: 850,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13.5,
      }}
    >
      {children}
    </button>
  );
}

export default function App() {
  // ---- Tabs (Sizing models) ----
  const TABS = [
    { id: "gpu-aas", name: "GPUaaS" },
    { id: "token-factor", name: "LLM Token Factor" },
    { id: "llm-services", name: "LLM Services (Factory)" },
    { id: "genai-inferencing", name: "GenAI Inferencing Engine" },
    { id: "omniverse", name: "Omniverse" },
    { id: "llm-training", name: "LLM Training" },
    { id: "ai-ml-training", name: "AI/ML Training" },
    { id: "digital-twins", name: "Digital Twins" },
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

  const selectedChip = useMemo(
    () => chips.find((c) => c.chip_id === form.chip_id),
    [chips, form.chip_id]
  );
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

    let alive = true;

    setErr("");
    setGpuResult(null);
    setTokenResult(null);

    Promise.all([
      getJson("/api/chips", { headers: apiHeaders() }),
      getJson("/api/workloads", { headers: apiHeaders() }),
    ])
      .then(([c, w]) => {
        if (!alive) return;
        setChips(Array.isArray(c) ? c : []);
        setWorkloads(Array.isArray(w) ? w : []);

        setForm((prev) => {
          const chip_id = prev.chip_id || (c?.[0]?.chip_id ?? "");
          const workload_id =
            prev.workload_id ||
            (w?.find?.((x) => x.service_class === "llm_inference")?.workload_id ??
              w?.[0]?.workload_id ??
              "");
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
  }, [workspace, screen]);

  // ---- when chip changes, refresh permitted workloads ----
  useEffect(() => {
    if (screen !== "models") return;
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
  }, [form.chip_id, workspace, screen]);

  // ---- when workload changes, refresh permitted chips ----
  useEffect(() => {
    if (screen !== "models") return;
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
  }, [form.workload_id, workspace, screen]);

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
    <div
      style={{
        padding: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Inputs</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <label>
          <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Client</div>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
            placeholder="e.g. acme"
          />
        </label>
        <label>
          <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Environment</div>
          <input
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
            placeholder="dev / test / prod"
          />
        </label>
      </div>

      <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 14 }}>
        Workspace schema: <b>{workspace}</b> (sent as <code>x-workspace</code>)
      </div>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Chip</div>
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
            background: "rgba(0,0,0,0.28)",
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
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>
          {loadingChips ? "Loading permitted chips…" : " "}
        </div>
      </label>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Workload</div>
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
            background: "rgba(0,0,0,0.28)",
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
          {loadingWorkloads
            ? "Loading permitted workloads…"
            : workloads.length === 0
            ? "No permitted workloads for this chip."
            : " "}
        </div>
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label>
          <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Total users</div>
          <input
            name="total_users"
            type="number"
            value={form.total_users}
            onChange={onChange}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
          />
        </label>

        <label>
          <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Peak concurrency (0–1)</div>
          <input
            name="peak_concurrency_pct"
            type="number"
            step="0.01"
            value={form.peak_concurrency_pct}
            onChange={onChange}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
          />
        </label>

        <label>
          <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Requests/user/hour</div>
          <input
            name="requests_per_user_per_hour"
            type="number"
            step="0.1"
            value={form.requests_per_user_per_hour}
            onChange={onChange}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
          />
        </label>

        <label>
          <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Tokens/request</div>
          <input
            name="tokens_per_request"
            type="number"
            value={form.tokens_per_request}
            onChange={onChange}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
          />
        </label>

        <label>
          <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Target utilization (0–1)</div>
          <input
            name="target_utilization"
            type="number"
            step="0.01"
            value={form.target_utilization}
            onChange={onChange}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
          />
        </label>

        <label>
          <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Resilience factor (≥1)</div>
          <input
            name="resilience_factor"
            type="number"
            step="0.05"
            value={form.resilience_factor}
            onChange={onChange}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
          />
        </label>

        <label>
          <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Installed GPUs (optional)</div>
          <input
            name="installed_gpus"
            type="number"
            value={form.installed_gpus}
            onChange={onChange}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.28)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
            }}
            placeholder="Leave blank to derive from sizing"
          />
        </label>
      </div>

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 800, opacity: 0.88 }}>Benchmark scenario (advanced)</summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <label>
            <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Context length</div>
            <input
              name="context_len"
              type="number"
              value={form.context_len}
              onChange={onChange}
              style={{
                width: "100%",
                padding: 10,
                marginTop: 6,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.28)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
              }}
            />
          </label>
          <label>
            <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Output length</div>
            <input
              name="output_len"
              type="number"
              value={form.output_len}
              onChange={onChange}
              style={{
                width: "100%",
                padding: 10,
                marginTop: 6,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.28)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
              }}
            />
          </label>
          <label>
            <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Batch size</div>
            <input
              name="batch_size"
              type="number"
              value={form.batch_size}
              onChange={onChange}
              style={{
                width: "100%",
                padding: 10,
                marginTop: 6,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.28)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
              }}
            />
          </label>
          <label>
            <div style={{ opacity: 0.8, fontSize: 12, fontWeight: 700 }}>Concurrency</div>
            <input
              name="concurrency"
              type="number"
              value={form.concurrency}
              onChange={onChange}
              style={{
                width: "100%",
                padding: 10,
                marginTop: 6,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.28)",
                color: "rgba(255,255,255,0.92)",
                outline: "none",
              }}
            />
          </label>
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
    </div>
  );

  const ResultsGpuAas = (
    <div
      style={{
        padding: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Results</h2>

      {!gpuResult ? (
        <div style={{ opacity: 0.8 }}>Run GPUaaS to see GPU requirements.</div>
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
            <summary style={{ cursor: "pointer", fontWeight: 800, opacity: 0.88 }}>Assumptions</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                background: "rgba(0,0,0,0.35)",
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {JSON.stringify(gpuResult.assumptions, null, 2)}
            </pre>
          </details>

          <details>
            <summary style={{ cursor: "pointer", fontWeight: 800, opacity: 0.88 }}>Calculator details</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                background: "rgba(0,0,0,0.35)",
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {JSON.stringify(gpuResult.calculator_details, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );

  const ResultsTokenFactor = (
    <div
      style={{
        padding: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Results</h2>

      {!tokenResult ? (
        <div style={{ opacity: 0.8 }}>Run Token Factor to see capacity + headroom.</div>
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
            <summary style={{ cursor: "pointer", fontWeight: 800, opacity: 0.88 }}>Token factor details</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                background: "rgba(0,0,0,0.35)",
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {JSON.stringify(tokenResult, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );

  // ---- Home screen ----
  const HomeScreen = (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <SmallPill>Workspace: {workspace}</SmallPill>
        <SmallPill>Schema header: x-workspace</SmallPill>
        <SmallPill>Recents: {recents.length}</SmallPill>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(260px, 1fr))",
          gap: 14,
          alignItems: "start",
        }}
      >
        {/* 1) New Client Environment */}
        <Card
          title="New Client Environment"
          subtitle="Create a new workspace (client + environment), then jump into sizing models."
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(160px, 220px) minmax(160px, 220px)",
              gap: 10,
              marginTop: 6,
              alignItems: "start",
            justifyContent: "start",
            }}
          >
            <TextInput
              label="Client"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. acme"
            />
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

          <div style={{ marginTop: 10, opacity: 0.68, fontSize: 11.5, lineHeight: 1.25 }}>
            This doesn’t create DB tables yet — it sets the schema header (<code>x-workspace</code>) used by the API.
          </div>
        </Card>

        {/* 2) Sizing Models */}
        <Card title="Sizing Models" subtitle="Go straight to calculators. Workspace context is preserved.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {TABS.map((t) => (
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
          </div>

          <div style={{ marginTop: 10, opacity: 0.68, fontSize: 11.5, lineHeight: 1.25 }}>
            Tip: once you’re in models, use tabs to switch calculators without losing workspace.
          </div>
        </Card>

        {/* 3) Existing Client Environment */}
        <Card title="Existing Client Environment" subtitle="Load a saved workspace and continue sizing.">
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 750 }}>Choose recent workspace</div>
            <select
              value={existingPick}
              onChange={(e) => setExistingPick(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                marginTop: 6,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.26)",
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

          <div style={{ marginTop: 10, opacity: 0.68, fontSize: 11.5, lineHeight: 1.25 }}>
            Recents are stored in <code>localStorage</code> (client-side only).
          </div>
        </Card>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginTop: 2 }} />

      <div style={{ opacity: 0.75, fontSize: 12 }}>
        When you’re ready: we can wire “New / Existing Environment” into the same DB tables (so environments become real,
        not just a header).
      </div>
    </div>
  );

  // ---- Fullscreen page: Digital Twins ----
  if (screen === "models" && tab === "digital-twins") {
    return (
      <div
        style={{
          fontFamily: "system-ui",
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 20% 10%, rgba(120,160,255,0.12), transparent 45%), radial-gradient(circle at 90% 30%, rgba(120,160,255,0.08), transparent 55%), #0b0d10",
          color: "white",
        }}
      >
        <div style={{ padding: 28, maxWidth: 1240, margin: "0 auto" }}>
          <HeaderBlock workspace={workspace} showHomeButton={true} onGoHome={() => setScreen("home")} />
          <TabsBar tabs={TABS} activeTab={tab} setTab={setTab} />

          {err && (
            <div
              style={{
                padding: 12,
                background: "rgba(160,0,0,0.20)",
                border: "1px solid rgba(255,120,120,0.35)",
                color: "rgba(255,210,210,0.95)",
                borderRadius: 12,
                marginBottom: 16,
              }}
            >
              <b>Error:</b> {err}
            </div>
          )}

          <div
            style={{
              padding: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 16,
              marginBottom: 16,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ fontWeight: 850, marginBottom: 6 }}>Workspace</div>
            <div style={{ opacity: 0.82, fontSize: 13 }}>
              Digital Twins sizing currently persists its workloads in <code>localStorage</code> (client-side). Workspace
              is: <b>{workspace}</b>
            </div>
          </div>
        </div>

        <DigitalTwinSizingPage />
      </div>
    );
  }

  // ---- Models screen ----
  if (screen === "models") {
    return (
      <div
        style={{
          fontFamily: "system-ui",
          padding: 28,
          maxWidth: 1240,
          margin: "0 auto",
          minHeight: "100vh",
          background:
            "radial-gradient(circle at 20% 10%, rgba(120,160,255,0.12), transparent 45%), radial-gradient(circle at 90% 30%, rgba(120,160,255,0.08), transparent 55%), #0b0d10",
          color: "white",
        }}
      >
        <HeaderBlock workspace={workspace} showHomeButton={true} onGoHome={() => setScreen("home")} />
        <TabsBar tabs={TABS} activeTab={tab} setTab={setTab} />

        {err && (
          <div
            style={{
              padding: 12,
              background: "rgba(160,0,0,0.20)",
              border: "1px solid rgba(255,120,120,0.35)",
              color: "rgba(255,210,210,0.95)",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <b>Error:</b> {err}
          </div>
        )}

        {/* Screens */}
        {tab === "llm-services" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                padding: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 850, marginBottom: 6 }}>Workspace</div>
              <div style={{ opacity: 0.82, fontSize: 13 }}>
                Using schema: <b>{workspace}</b> — next step is wiring this calculator into the same DB tables.
              </div>
            </div>
            <LLMServicesCalculator />
          </div>
        ) : tab === "genai-inferencing" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                padding: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 850, marginBottom: 6 }}>Workspace</div>
              <div style={{ opacity: 0.82, fontSize: 13 }}>
                GenAI Inferencing Engine sizing runs client-side (no DB calls yet). Workspace is: <b>{workspace}</b>
              </div>
            </div>

            <GenAIInferencingEngine />
          </div>
        ) : tab === "llm-training" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                padding: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 850, marginBottom: 6 }}>Workspace</div>
              <div style={{ opacity: 0.82, fontSize: 13 }}>
                LLM Training capture currently persists in <code>localStorage</code> (client-side). Workspace is:{" "}
                <b>{workspace}</b>
              </div>
            </div>

            <LLMTrainingPage />
          </div>
        ) : tab === "ai-ml-training" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                padding: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 850, marginBottom: 6 }}>Workspace</div>
              <div style={{ opacity: 0.82, fontSize: 13 }}>
                AI/ML Training capture persists in <code>localStorage</code> (client-side). Workspace is:{" "}
                <b>{workspace}</b>
              </div>
            </div>

            <AIMLTrainingApp />
          </div>
        ) : tab === "omniverse" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                padding: 14,
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 16,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ fontWeight: 850, marginBottom: 6 }}>Workspace</div>
              <div style={{ opacity: 0.82, fontSize: 13 }}>
                Omniverse sizing currently persists its catalog in <code>localStorage</code> (client-side). Workspace is:{" "}
                <b>{workspace}</b>
              </div>
            </div>

            <OmniverseSizingPage />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 18, alignItems: "start" }}>
            {InputsPanel}
            {tab === "gpu-aas" ? ResultsGpuAas : ResultsTokenFactor}
          </div>
        )}
      </div>
    );
  }

  // ---- Default: Home ----
  return (
    <div
      style={{
        fontFamily: "system-ui",
        padding: 28,
        maxWidth: 1240,
        margin: "0 auto",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 10%, rgba(120,160,255,0.12), transparent 45%), radial-gradient(circle at 90% 30%, rgba(120,160,255,0.08), transparent 55%), #0b0d10",
        color: "white",
      }}
    >
      <HeaderBlock workspace={workspace} showHomeButton={false} />
      {HomeScreen}
    </div>
  );
}