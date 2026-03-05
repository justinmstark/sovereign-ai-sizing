// File: src/App.jsx
import { useEffect, useMemo, useState } from "react";
import LLMServicesCalculator from "./LLMServicesCalculator"; // Step 3: new screen

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
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            border: "1px solid #444",
            background: activeTab === t.id ? "#111" : "transparent",
            color: activeTab === t.id ? "white" : "#ddd",
            cursor: "pointer",
            fontWeight: 650,
          }}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}

function HeaderBlock({ workspace }) {
  return (
    <>
      <h1 style={{ marginBottom: 6 }}>AI Factory Sizing Platform</h1>
      <div style={{ opacity: 0.8, marginBottom: 14 }}>
        Application-led sizing → benchmark TPS lookup → capacity + headroom (workspace-aware)
      </div>
      <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 14 }}>
        Workspace schema: <b>{workspace}</b> (sent as <code>x-workspace</code>)
      </div>
    </>
  );
}

export default function App() {
  // ---- Step 3: tabs ----
  const TABS = [
    { id: "gpu-aas", name: "GPUaaS" },
    { id: "token-factor", name: "LLM Token Factor" },
    { id: "llm-services", name: "LLM Services (Factory)" },
    { id: "genai-inferencing", name: "GenAI Inferencing Engine" }, // ✅ NEW
    { id: "omniverse", name: "Omniverse" },
    { id: "llm-training", name: "LLM Training" },
    { id: "ai-ml-training", name: "AI/ML Training" }, // ✅ NEW
    { id: "digital-twins", name: "Digital Twins" },
  ];
  const [tab, setTab] = useState("gpu-aas");

  // ---- Step 4: workspace (client/environment) ----
  const [clientName, setClientName] = useState("default");
  const [environment, setEnvironment] = useState("dev"); // dev/test/prod etc.

  const workspace = useMemo(() => {
    const c = safeWorkspace(clientName) || "default";
    const e = safeWorkspace(environment) || "dev";
    return `${c}_${e}`;
  }, [clientName, environment]);

  function apiHeaders(extra = {}) {
    return {
      "Content-Type": "application/json",
      "x-workspace": workspace, // backend uses this as schema
      ...extra,
    };
  }

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

  // Safe number formatting (avoid render crashes)
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

  // ---- Load chips + workloads for this workspace ----
  useEffect(() => {
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
  }, [workspace]);

  // ---- when chip changes, refresh permitted workloads ----
  useEffect(() => {
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
  }, [form.chip_id, workspace]);

  // ---- when workload changes, refresh permitted chips ----
  useEffect(() => {
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
  }, [form.workload_id, workspace]);

  // ---- Step 3: run GPUaaS only ----
  async function runGpuAas(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    setErr("");
    setBusy(true);

    try {
      const payload = { ...form };
      delete payload.installed_gpus; // gpu-aas doesn't need it

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

  // ---- Step 3: run Token Factor only ----
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
    <div style={{ padding: 16, border: "1px solid #333", borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>Inputs</h2>

      {/* Workspace (Step 4) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <label>
          Client
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
            placeholder="e.g. acme"
          />
        </label>
        <label>
          Environment
          <input
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
            placeholder="dev / test / prod"
          />
        </label>
      </div>

      <div style={{ opacity: 0.7, fontSize: 12, marginBottom: 14 }}>
        Workspace schema: <b>{workspace}</b> (sent as <code>x-workspace</code>)
      </div>

      <label style={{ display: "block", marginBottom: 10 }}>
        Chip
        <select
          name="chip_id"
          value={form.chip_id}
          onChange={onChange}
          disabled={loadingChips}
          style={{ width: "100%", padding: 8, marginTop: 6 }}
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
        Workload
        <select
          name="workload_id"
          value={form.workload_id}
          onChange={onChange}
          disabled={loadingWorkloads || workloads.length === 0}
          style={{ width: "100%", padding: 8, marginTop: 6 }}
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
          Total users
          <input
            name="total_users"
            type="number"
            value={form.total_users}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Peak concurrency (0–1)
          <input
            name="peak_concurrency_pct"
            type="number"
            step="0.01"
            value={form.peak_concurrency_pct}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Requests/user/hour
          <input
            name="requests_per_user_per_hour"
            type="number"
            step="0.1"
            value={form.requests_per_user_per_hour}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Tokens/request
          <input
            name="tokens_per_request"
            type="number"
            value={form.tokens_per_request}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Target utilization (0–1)
          <input
            name="target_utilization"
            type="number"
            step="0.01"
            value={form.target_utilization}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Resilience factor (≥1)
          <input
            name="resilience_factor"
            type="number"
            step="0.05"
            value={form.resilience_factor}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
          />
        </label>

        <label>
          Installed GPUs (optional)
          <input
            name="installed_gpus"
            type="number"
            value={form.installed_gpus}
            onChange={onChange}
            style={{ width: "100%", padding: 8, marginTop: 6 }}
            placeholder="Leave blank to derive from sizing"
          />
        </label>
      </div>

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer" }}>Benchmark scenario (advanced)</summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <label>
            Context length
            <input
              name="context_len"
              type="number"
              value={form.context_len}
              onChange={onChange}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </label>
          <label>
            Output length
            <input
              name="output_len"
              type="number"
              value={form.output_len}
              onChange={onChange}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </label>
          <label>
            Batch size
            <input
              name="batch_size"
              type="number"
              value={form.batch_size}
              onChange={onChange}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </label>
          <label>
            Concurrency
            <input
              name="concurrency"
              type="number"
              value={form.concurrency}
              onChange={onChange}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
            />
          </label>
        </div>
      </details>

      <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={runGpuAas}
          disabled={busy || !form.chip_id || !form.workload_id}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #444",
            background: "#111",
            color: "white",
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Working..." : "Run GPUaaS"}
        </button>

        <button
          type="button"
          onClick={runTokenFactor}
          disabled={busy || !form.chip_id || !form.workload_id}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #444",
            background: "#111",
            color: "white",
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Working..." : "Run Token Factor"}
        </button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
        Selected:{" "}
        {selectedChip ? `${selectedChip.vendor} ${selectedChip.model_name} ${selectedChip.variant}` : "—"} /{" "}
        {selectedWorkload
          ? `${selectedWorkload.service_class} ${selectedWorkload.model_name} ${selectedWorkload.precision}`
          : "—"}
      </div>
    </div>
  );

  const ResultsGpuAas = (
    <div style={{ padding: 16, border: "1px solid #333", borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>Results</h2>

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
            <summary style={{ cursor: "pointer" }}>Assumptions</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                background: "#111",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #333",
              }}
            >
              {JSON.stringify(gpuResult.assumptions, null, 2)}
            </pre>
          </details>

          <details>
            <summary style={{ cursor: "pointer" }}>Calculator details</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                background: "#111",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #333",
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
    <div style={{ padding: 16, border: "1px solid #333", borderRadius: 12 }}>
      <h2 style={{ marginTop: 0 }}>Results</h2>

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
            <summary style={{ cursor: "pointer" }}>Token factor details</summary>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                marginTop: 10,
                background: "#111",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #333",
              }}
            >
              {JSON.stringify(tokenResult, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );

  // ---- Fullscreen page: Digital Twins ----
  if (tab === "digital-twins") {
    return (
      <div style={{ fontFamily: "system-ui" }}>
        <div style={{ padding: 28, maxWidth: 1200, margin: "0 auto" }}>
          <HeaderBlock workspace={workspace} />
          <TabsBar tabs={TABS} activeTab={tab} setTab={setTab} />

          {err && (
            <div
              style={{
                padding: 12,
                background: "#2b0000",
                border: "1px solid #7a2a2a",
                color: "#ffb3b3",
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <b>Error:</b> {err}
            </div>
          )}

          <div style={{ padding: 14, border: "1px solid #333", borderRadius: 12, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Workspace</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              Digital Twins sizing currently persists its workloads in <code>localStorage</code> (client-side). Workspace
              is: <b>{workspace}</b>
            </div>
          </div>
        </div>

        <DigitalTwinSizingPage />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 28, maxWidth: 1200, margin: "0 auto" }}>
      <HeaderBlock workspace={workspace} />
      <TabsBar tabs={TABS} activeTab={tab} setTab={setTab} />

      {err && (
        <div
          style={{
            padding: 12,
            background: "#2b0000",
            border: "1px solid #7a2a2a",
            color: "#ffb3b3",
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          <b>Error:</b> {err}
        </div>
      )}

      {/* Screens */}
      {tab === "llm-services" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ padding: 14, border: "1px solid #333", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Workspace</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              Using schema: <b>{workspace}</b> — next step is wiring this calculator into the same DB tables.
            </div>
          </div>
          <LLMServicesCalculator />
        </div>
      ) : tab === "genai-inferencing" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ padding: 14, border: "1px solid #333", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Workspace</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              GenAI Inferencing Engine sizing runs client-side (no DB calls yet). Workspace is: <b>{workspace}</b>
            </div>
          </div>

          <GenAIInferencingEngine />
        </div>
      ) : tab === "llm-training" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ padding: 14, border: "1px solid #333", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Workspace</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              LLM Training capture currently persists in <code>localStorage</code> (client-side). Workspace is:{" "}
              <b>{workspace}</b>
            </div>
          </div>

          <LLMTrainingPage />
        </div>
      ) : tab === "ai-ml-training" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ padding: 14, border: "1px solid #333", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Workspace</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              AI/ML Training capture persists in <code>localStorage</code> (client-side). Workspace is:{" "}
              <b>{workspace}</b>
            </div>
          </div>

          <AIMLTrainingApp />
        </div>
      ) : tab === "omniverse" ? (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ padding: 14, border: "1px solid #333", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Workspace</div>
            <div style={{ opacity: 0.8, fontSize: 13 }}>
              Omniverse sizing currently persists its catalog in <code>localStorage</code> (client-side). Workspace is:{" "}
              <b>{workspace}</b>
            </div>
          </div>

          <OmniverseSizingPage />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {InputsPanel}
          {tab === "gpu-aas" ? ResultsGpuAas : ResultsTokenFactor}
        </div>
      )}
    </div>
  );
}