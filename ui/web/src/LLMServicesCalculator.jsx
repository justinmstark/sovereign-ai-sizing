import React, { useMemo, useState } from "react";

/**
 * LLM Services (Multi-Model / Frontier) Template
 * - Sections + Fields + editable rows + computed rollups
 * - Links multiple LLMs + frontier models to endpoints via routing policies
 * - Sizes GPUs for token serving (throughput) + checks VRAM fit (weights + KV cache)
 * - Maps models to GPU pools via reservations (min/max + HA spares) and computes cost
 *
 * NOTE: This is UI-only sizing logic (no API calls yet). We'll wire to DB later.
 */

// ---------- Catalogs / Defaults ----------
const GPU_SKUS = [
  { id: "H100_80", name: "NVIDIA H100 80GB", vramGB: 80, defaultRate: 6.25 },
  { id: "H100_94", name: "NVIDIA H100 94GB", vramGB: 94, defaultRate: 6.75 },
  { id: "A100_80", name: "NVIDIA A100 80GB", vramGB: 80, defaultRate: 3.2 },
  { id: "L40S_48", name: "NVIDIA L40S 48GB", vramGB: 48, defaultRate: 1.6 },
  { id: "CUSTOM", name: "Custom", vramGB: 0, defaultRate: 0 },
];

const PRECISIONS = [
  { id: "FP16", name: "FP16 / BF16", bytesPerParam: 2.0 },
  { id: "FP8", name: "FP8", bytesPerParam: 1.0 },
  { id: "INT8", name: "INT8", bytesPerParam: 1.0 },
  { id: "INT4", name: "INT4", bytesPerParam: 0.5 },
];

const ROUTING_STRATEGIES = [
  { id: "weighted_primary_with_fallback", name: "Weighted primary + fallback" },
  { id: "single_model", name: "Single model" },
];

const fmtMoney0 = (v) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);

const fmtMoney2 = (v) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(v)) ? Number(v) : 0);

const fmtInt = (v) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(v)) ? Number(v) : 0
  );

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function uid(prefix = "ID") {
  return `${prefix}_${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

// ---------- Small UI Helpers ----------
function Section({ title, children, right }) {
  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 16,
        padding: 16,
        background: "#1b1b1b",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children, inline = false, style = {}, labelWidth = 240 }) {
  return (
    <div
      style={{
        display: inline ? "flex" : "block",
        gap: 12,
        alignItems: inline ? "center" : "stretch",
        marginBottom: 12,
        ...style,
      }}
    >
      <div style={{ minWidth: inline ? labelWidth : undefined }}>
        <div style={{ fontSize: 13, fontWeight: 750, color: "white" }}>{label}</div>
        {hint ? (
          <div style={{ fontSize: 12, color: "#b8b8b8", marginTop: 2 }}>{hint}</div>
        ) : null}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #444",
        outline: "none",
        background: "#111",
        color: "white",
      }}
    />
  );
}

function NumInput({ value, onChange, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={Number.isFinite(Number(value)) ? value : 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #444",
        outline: "none",
        background: "#111",
        color: "white",
      }}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #444",
        outline: "none",
        background: "#111",
        color: "white",
      }}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

function Button({ children, onClick, tone = "default", type = "button" }) {
  const bg =
    tone === "primary" ? "#111" : tone === "danger" ? "#b42318" : "#2a2a2a";
  const fg = tone === "primary" || tone === "danger" ? "white" : "white";
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #444",
        background: bg,
        color: fg,
        cursor: "pointer",
        fontWeight: 750,
      }}
    >
      {children}
    </button>
  );
}

function Pill({ children, tone = "neutral" }) {
  const styles = {
    neutral: { bg: "#2a2a2a", fg: "white" },
    warn: { bg: "#3a2a00", fg: "#ffd59e" },
    ok: { bg: "#0b2a16", fg: "#98f5b8" },
    bad: { bg: "#3a0c0c", fg: "#ffb3b3" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        background: styles.bg,
        color: styles.fg,
        fontSize: 12,
        fontWeight: 750,
        border: "1px solid rgba(255,255,255,0.06)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Grid({ children, cols = 2 }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gap: 16,
      }}
    >
      {children}
    </div>
  );
}

// ---------- Main Component ----------
export default function LLMServicesCalculator() {
  // Global knobs
  const [serviceName, setServiceName] = useState("Sovereign LLM Services");
  const [hoursPerMonth, setHoursPerMonth] = useState(730);
  const [utilTarget, setUtilTarget] = useState(0.7);
  const [vramOverheadPct, setVramOverheadPct] = useState(0.2);
  const [managedUpliftPct, setManagedUpliftPct] = useState(0.15);
  const [marginPct, setMarginPct] = useState(0.2);

  // Models
  const [models, setModels] = useState([
    {
      id: "MODEL_LLAMA3_70B",
      displayName: "Llama 3 70B",
      class: "LLM",
      paramsB: 70,
      precision: "FP16",
      maxContextTokens: 8192,
      kvBytesPerToken: 2048,
      tpsPerGpuEffective: 120,
      gpusPerReplica: 4,
    },
    {
      id: "MODEL_LLAMA3_8B",
      displayName: "Llama 3 8B",
      class: "LLM",
      paramsB: 8,
      precision: "FP16",
      maxContextTokens: 8192,
      kvBytesPerToken: 1024,
      tpsPerGpuEffective: 260,
      gpusPerReplica: 1,
    },
    {
      id: "MODEL_FRONTIER_X",
      displayName: "Frontier Model X (Gateway)",
      class: "FRONTIER",
      paramsB: 175,
      precision: "FP16",
      maxContextTokens: 8192,
      kvBytesPerToken: 3072,
      tpsPerGpuEffective: 70,
      gpusPerReplica: 8,
    },
  ]);

  // Endpoints
  const [endpoints] = useState([
    { id: "EP_CHAT_DEFAULT", displayName: "Chat (Default)", type: "chat" },
    { id: "EP_CHAT_SECURE", displayName: "Chat (Secure)", type: "chat" },
  ]);

  // Routing policies
  const [routingPolicies, setRoutingPolicies] = useState([
    {
      id: "ROUTE_CHAT_DEFAULT",
      endpointId: "EP_CHAT_DEFAULT",
      strategy: "weighted_primary_with_fallback",
      candidates: [
        { modelId: "MODEL_LLAMA3_70B", weight: 70 },
        { modelId: "MODEL_FRONTIER_X", weight: 30 },
      ],
      fallbackModelId: "MODEL_LLAMA3_8B",
    },
    {
      id: "ROUTE_CHAT_SECURE",
      endpointId: "EP_CHAT_SECURE",
      strategy: "single_model",
      candidates: [{ modelId: "MODEL_LLAMA3_70B", weight: 100 }],
      fallbackModelId: "MODEL_LLAMA3_8B",
    },
  ]);

  // GPU pools
  const [pools, setPools] = useState([
    {
      id: "POOL_H100_AU_EAST",
      displayName: "AU East - H100 Pool",
      skuId: "H100_80",
      customVramGB: 80,
      ratePerGpuHour: 6.25,
      gpusPerNode: 8,
      nodeCount: 10,
    },
    {
      id: "POOL_L40S_AU_EAST",
      displayName: "AU East - L40S Pool",
      skuId: "L40S_48",
      customVramGB: 48,
      ratePerGpuHour: 1.6,
      gpusPerNode: 8,
      nodeCount: 6,
    },
  ]);

  // Reservations (model -> pool)
  const [reservations, setReservations] = useState([
    {
      id: "RES_LLAMA3_70B",
      modelId: "MODEL_LLAMA3_70B",
      poolId: "POOL_H100_AU_EAST",
      minGpus: 16,
      maxGpus: 64,
      haSparePct: 0.1,
    },
    {
      id: "RES_LLAMA3_8B",
      modelId: "MODEL_LLAMA3_8B",
      poolId: "POOL_L40S_AU_EAST",
      minGpus: 8,
      maxGpus: 64,
      haSparePct: 0.1,
    },
    {
      id: "RES_FRONTIER_X",
      modelId: "MODEL_FRONTIER_X",
      poolId: "POOL_H100_AU_EAST",
      minGpus: 8,
      maxGpus: 64,
      haSparePct: 0.15,
    },
  ]);

  // Demand plans (per endpoint)
  const [demandPlans, setDemandPlans] = useState([
    {
      id: "DP_CHAT_DEFAULT",
      endpointId: "EP_CHAT_DEFAULT",
      rps: 5,
      avgInputTokens: 1200,
      avgOutputTokens: 400,
      peakFactor: 2.0,
      p95LatencyMs: 1500,
    },
    {
      id: "DP_CHAT_SECURE",
      endpointId: "EP_CHAT_SECURE",
      rps: 2,
      avgInputTokens: 1500,
      avgOutputTokens: 500,
      peakFactor: 2.0,
      p95LatencyMs: 1800,
    },
  ]);

  // Lookups
  const precisionById = useMemo(() => new Map(PRECISIONS.map((p) => [p.id, p])), []);
  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const poolById = useMemo(() => new Map(pools.map((p) => [p.id, p])), [pools]);
  const skuById = useMemo(() => new Map(GPU_SKUS.map((s) => [s.id, s])), []);
  const routingByEndpointId = useMemo(() => new Map(routingPolicies.map((rp) => [rp.endpointId, rp])), [
    routingPolicies,
  ]);
  const reservationByModelId = useMemo(() => new Map(reservations.map((r) => [r.modelId, r])), [reservations]);

  // Core sizing
  const sizing = useMemo(() => {
    // 1) Endpoint demand
    const endpointDemand = demandPlans.map((dp) => {
      const tokensPerReq = (dp.avgInputTokens || 0) + (dp.avgOutputTokens || 0);
      const tpsPeak = (dp.rps || 0) * tokensPerReq * (dp.peakFactor || 1);
      const concurrencyPeak = (dp.rps || 0) * ((dp.p95LatencyMs || 0) / 1000) * (dp.peakFactor || 1);
      return { ...dp, tokensPerReq, tpsPeak, concurrencyPeak };
    });

    // 2) Allocate to models by routing
    const modelLoad = new Map();
    const addLoad = (modelId, tps, conc) => {
      const cur = modelLoad.get(modelId) || { tpsPeak: 0, concurrencyPeak: 0 };
      modelLoad.set(modelId, {
        tpsPeak: cur.tpsPeak + (tps || 0),
        concurrencyPeak: cur.concurrencyPeak + (conc || 0),
      });
    };

    endpointDemand.forEach((ed) => {
      const rp = routingByEndpointId.get(ed.endpointId);
      if (!rp) return;

      const candidates = rp.candidates || [];
      const sumW = candidates.reduce((a, c) => a + (Number(c.weight) || 0), 0) || 1;

      if (rp.strategy === "single_model") {
        const mid = candidates[0]?.modelId;
        if (mid) addLoad(mid, ed.tpsPeak, ed.concurrencyPeak);
        return;
      }

      // weighted
      candidates.forEach((c) => {
        const w = (Number(c.weight) || 0) / sumW;
        addLoad(c.modelId, ed.tpsPeak * w, ed.concurrencyPeak * w);
      });
    });

    // 3) Per model sizing
    const modelSizing = [];
    for (const [modelId, load] of modelLoad.entries()) {
      const m = modelById.get(modelId);
      if (!m) continue;

      const prec = precisionById.get(m.precision) || PRECISIONS[0];
      const bytesPerParam = prec.bytesPerParam;

      // weights GB
      const weightsGB = ((m.paramsB || 0) * 1e9 * bytesPerParam) / 1024 ** 3;

      const tpsPerGpu = Math.max(1e-9, Number(m.tpsPerGpuEffective) || 0);
      const util = clamp(Number(utilTarget) || 0.7, 0.05, 0.95);

      const gpusForThroughput = Math.ceil((load.tpsPeak || 0) / (tpsPerGpu * util));

      const gpr = Math.max(1, Number(m.gpusPerReplica) || 1);
      const replicas = Math.max(1, Math.ceil(gpusForThroughput / gpr));

      const concPerReplica = (load.concurrencyPeak || 0) / replicas;

      const kvBytes =
        (concPerReplica || 0) * (m.maxContextTokens || 0) * (Number(m.kvBytesPerToken) || 0);
      const kvGB = kvBytes / 1024 ** 3;

      const overhead = clamp(Number(vramOverheadPct) || 0.2, 0, 1);
      const vramRequiredGB = (weightsGB + kvGB) * (1 + overhead);

      const res = reservationByModelId.get(modelId);
      const pool = res ? poolById.get(res.poolId) : null;

      let poolVramGB = 0;
      let gpuRate = 0;
      let poolCapGpus = 0;

      if (pool) {
        const sku = skuById.get(pool.skuId);
        poolVramGB = pool.skuId === "CUSTOM" ? Number(pool.customVramGB) || 0 : Number(sku?.vramGB) || 0;
        gpuRate = Number(pool.ratePerGpuHour) || Number(sku?.defaultRate) || 0;
        poolCapGpus = (Number(pool.gpusPerNode) || 0) * (Number(pool.nodeCount) || 0);
      }

      const haSparePct = clamp(Number(res?.haSparePct) || 0, 0, 1);
      const gpusWithHa = Math.ceil(gpusForThroughput * (1 + haSparePct));

      const minGpus = Math.max(0, Number(res?.minGpus) || 0);
      const maxGpus = Math.max(0, Number(res?.maxGpus) || 0) || Infinity;

      const billingGpus = clamp(Math.max(minGpus, gpusWithHa), 0, maxGpus);

      const monthlyGpuCost = billingGpus * (gpuRate || 0) * (Number(hoursPerMonth) || 0);
      const uplift = clamp(Number(managedUpliftPct) || 0, 0, 2);
      const margin = clamp(Number(marginPct) || 0, 0, 0.95);
      const monthlyServicePrice = monthlyGpuCost * (1 + uplift) / (1 - margin);

      const vramFit = poolVramGB > 0 ? vramRequiredGB <= poolVramGB : true;

      modelSizing.push({
        modelId,
        modelName: m.displayName,
        modelClass: m.class,
        tpsPeak: load.tpsPeak,
        concurrencyPeak: load.concurrencyPeak,
        tpsPerGpu,
        gpusForThroughput,
        gpusWithHa,
        replicas,
        gpusPerReplica: gpr,
        weightsGB,
        kvGB,
        vramRequiredGB,
        poolId: pool?.id,
        poolName: pool?.displayName,
        poolVramGB,
        poolCapGpus,
        billingGpus,
        gpuRate,
        monthlyGpuCost,
        monthlyServicePrice,
        vramFit,
      });
    }

    // 4) Pool rollups
    const poolRollups = new Map();
    modelSizing.forEach((ms) => {
      if (!ms.poolId) return;
      const cur = poolRollups.get(ms.poolId) || {
        poolId: ms.poolId,
        poolName: ms.poolName,
        capGpus: ms.poolCapGpus,
        billedGpus: 0,
        monthlyGpuCost: 0,
        monthlyServicePrice: 0,
      };
      cur.billedGpus += ms.billingGpus || 0;
      cur.monthlyGpuCost += ms.monthlyGpuCost || 0;
      cur.monthlyServicePrice += ms.monthlyServicePrice || 0;
      poolRollups.set(ms.poolId, cur);
    });

    const poolsOut = Array.from(poolRollups.values()).map((p) => ({
      ...p,
      capacityOk: (p.billedGpus || 0) <= (p.capGpus || 0),
    }));

    const totals = {
      monthlyGpuCost: modelSizing.reduce((a, x) => a + (x.monthlyGpuCost || 0), 0),
      monthlyServicePrice: modelSizing.reduce((a, x) => a + (x.monthlyServicePrice || 0), 0),
      billedGpus: modelSizing.reduce((a, x) => a + (x.billingGpus || 0), 0),
    };

    return { endpointDemand, modelSizing, poolsOut, totals };
  }, [
    demandPlans,
    routingByEndpointId,
    modelById,
    reservationByModelId,
    poolById,
    skuById,
    precisionById,
    utilTarget,
    vramOverheadPct,
    managedUpliftPct,
    marginPct,
    hoursPerMonth,
  ]);

  // Mutators
  const updateModel = (id, patch) => setModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const addModel = () =>
    setModels((prev) => [
      ...prev,
      {
        id: uid("MODEL"),
        displayName: "New Model",
        class: "LLM",
        paramsB: 7,
        precision: "FP16",
        maxContextTokens: 8192,
        kvBytesPerToken: 1024,
        tpsPerGpuEffective: 200,
        gpusPerReplica: 1,
      },
    ]);

  const removeModel = (id) => {
    setModels((prev) => prev.filter((m) => m.id !== id));
    setReservations((prev) => prev.filter((r) => r.modelId !== id));
    setRoutingPolicies((prev) =>
      prev.map((rp) => ({
        ...rp,
        candidates: (rp.candidates || []).filter((c) => c.modelId !== id),
        fallbackModelId: rp.fallbackModelId === id ? "" : rp.fallbackModelId,
      }))
    );
  };

  const updatePool = (id, patch) => setPools((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addPool = () =>
    setPools((prev) => [
      ...prev,
      {
        id: uid("POOL"),
        displayName: "New Pool",
        skuId: "CUSTOM",
        customVramGB: 80,
        ratePerGpuHour: 0,
        gpusPerNode: 8,
        nodeCount: 1,
      },
    ]);

  const removePool = (id) => {
    setPools((prev) => prev.filter((p) => p.id !== id));
    setReservations((prev) => prev.filter((r) => r.poolId !== id));
  };

  const updateReservation = (id, patch) =>
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addReservation = () =>
    setReservations((prev) => [
      ...prev,
      {
        id: uid("RES"),
        modelId: models[0]?.id || "",
        poolId: pools[0]?.id || "",
        minGpus: 0,
        maxGpus: 64,
        haSparePct: 0.1,
      },
    ]);

  const removeReservation = (id) => setReservations((prev) => prev.filter((r) => r.id !== id));

  const updateDemandPlan = (id, patch) =>
    setDemandPlans((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));

  const addDemandPlan = () =>
    setDemandPlans((prev) => [
      ...prev,
      {
        id: uid("DP"),
        endpointId: endpoints[0]?.id || "",
        rps: 1,
        avgInputTokens: 800,
        avgOutputTokens: 300,
        peakFactor: 2.0,
        p95LatencyMs: 1500,
      },
    ]);

  const removeDemandPlan = (id) => setDemandPlans((prev) => prev.filter((d) => d.id !== id));

  const updateRoutingPolicy = (id, patch) =>
    setRoutingPolicies((prev) => prev.map((rp) => (rp.id === id ? { ...rp, ...patch } : rp)));

  const addRoutingPolicy = () =>
    setRoutingPolicies((prev) => [
      ...prev,
      {
        id: uid("ROUTE"),
        endpointId: endpoints[0]?.id || "",
        strategy: "weighted_primary_with_fallback",
        candidates: models.slice(0, 2).map((m, i) => ({ modelId: m.id, weight: i === 0 ? 70 : 30 })),
        fallbackModelId: models[0]?.id || "",
      },
    ]);

  const removeRoutingPolicy = (id) => setRoutingPolicies((prev) => prev.filter((rp) => rp.id !== id));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Section title="LLM Factory (Multi-Model + Frontier)" right={<Pill tone="neutral">UI Template</Pill>}>
        <Grid cols={2}>
          <div>
            <Field label="Service name" hint="Packaged service (LLM Services)">
              <TextInput value={serviceName} onChange={setServiceName} />
            </Field>

            <Field label="Hours per month" hint="Used for monthly GPU-hour costing" inline>
              <NumInput value={hoursPerMonth} onChange={setHoursPerMonth} min={1} />
            </Field>

            <Field label="Utilization target" hint="Steady-state target (headroom). 0.6–0.75 typical." inline>
              <NumInput value={utilTarget} onChange={setUtilTarget} min={0.05} max={0.95} step={0.05} />
            </Field>

            <Field label="VRAM overhead %" hint="Runtime + fragmentation + safety buffer" inline>
              <NumInput value={vramOverheadPct} onChange={setVramOverheadPct} min={0} max={0.8} step={0.05} />
            </Field>
          </div>

          <div>
            <Field label="Managed uplift %" hint="Ops/SRE, monitoring, platform support" inline>
              <NumInput value={managedUpliftPct} onChange={setManagedUpliftPct} min={0} max={2} step={0.05} />
            </Field>

            <Field label="Margin %" hint="Commercial packaging margin" inline>
              <NumInput value={marginPct} onChange={setMarginPct} min={0} max={0.95} step={0.05} />
            </Field>

            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Pill tone="ok">Monthly GPU cost: {fmtMoney0(sizing.totals.monthlyGpuCost)}</Pill>
              <Pill tone="neutral">Monthly service price: {fmtMoney0(sizing.totals.monthlyServicePrice)}</Pill>
              <Pill tone="neutral">Billed GPUs: {fmtInt(sizing.totals.billedGpus)}</Pill>
            </div>
          </div>
        </Grid>
      </Section>

      <Section title="Model Catalog" right={<Button onClick={addModel} tone="primary">+ Add model</Button>}>
        <div style={{ display: "grid", gap: 10 }}>
          {models.map((m) => (
            <div key={m.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 12, background: "#151515" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 850, color: "white" }}>
                  {m.displayName} <span style={{ color: "#aaa", fontWeight: 650 }}>({m.id})</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Pill tone={m.class === "FRONTIER" ? "warn" : "neutral"}>{m.class}</Pill>
                  <Button tone="danger" onClick={() => removeModel(m.id)}>Remove</Button>
                </div>
              </div>

              <Grid cols={3}>
                <Field label="Display name" inline>
                  <TextInput value={m.displayName} onChange={(v) => updateModel(m.id, { displayName: v })} />
                </Field>

                <Field label="Class" hint="LLM or FRONTIER" inline>
                  <Select
                    value={m.class}
                    onChange={(v) => updateModel(m.id, { class: v })}
                    options={[
                      { id: "LLM", name: "LLM" },
                      { id: "FRONTIER", name: "FRONTIER" },
                    ]}
                  />
                </Field>

                <Field label="Params (B)" inline>
                  <NumInput value={m.paramsB} onChange={(v) => updateModel(m.id, { paramsB: v })} min={0} step={1} />
                </Field>

                <Field label="Precision" inline>
                  <Select
                    value={m.precision}
                    onChange={(v) => updateModel(m.id, { precision: v })}
                    options={PRECISIONS.map((p) => ({ id: p.id, name: p.name }))}
                  />
                </Field>

                <Field label="Max context tokens" inline>
                  <NumInput
                    value={m.maxContextTokens}
                    onChange={(v) => updateModel(m.id, { maxContextTokens: v })}
                    min={0}
                    step={256}
                  />
                </Field>

                <Field label="KV bytes/token" hint="Tunable assumption; varies by architecture" inline>
                  <NumInput
                    value={m.kvBytesPerToken}
                    onChange={(v) => updateModel(m.id, { kvBytesPerToken: v })}
                    min={0}
                    step={128}
                  />
                </Field>

                <Field label="TPS per GPU (effective)" hint="Replace with RA/benchmarks later" inline>
                  <NumInput
                    value={m.tpsPerGpuEffective}
                    onChange={(v) => updateModel(m.id, { tpsPerGpuEffective: v })}
                    min={0}
                    step={10}
                  />
                </Field>

                <Field label="GPUs per replica" hint="Tensor parallel degree (1,2,4,8...)" inline>
                  <NumInput
                    value={m.gpusPerReplica}
                    onChange={(v) => updateModel(m.id, { gpusPerReplica: v })}
                    min={1}
                    step={1}
                  />
                </Field>

                <div />
              </Grid>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Endpoints + Routing Policies"
        right={<Button onClick={addRoutingPolicy} tone="primary">+ Add routing</Button>}
      >
        <div style={{ display: "grid", gap: 10 }}>
          {routingPolicies.map((rp) => (
            <div key={rp.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 12, background: "#151515" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 850, color: "white" }}>
                  Routing: {rp.id}{" "}
                  <span style={{ color: "#aaa", fontWeight: 650 }}>
                    → {endpoints.find((e) => e.id === rp.endpointId)?.displayName || rp.endpointId}
                  </span>
                </div>
                <Button tone="danger" onClick={() => removeRoutingPolicy(rp.id)}>Remove</Button>
              </div>

              <Grid cols={2}>
                <Field label="Endpoint" inline>
                  <Select
                    value={rp.endpointId}
                    onChange={(v) => updateRoutingPolicy(rp.id, { endpointId: v })}
                    options={endpoints.map((e) => ({ id: e.id, name: e.displayName }))}
                  />
                </Field>

                <Field label="Strategy" inline>
                  <Select
                    value={rp.strategy}
                    onChange={(v) => updateRoutingPolicy(rp.id, { strategy: v })}
                    options={ROUTING_STRATEGIES}
                  />
                </Field>
              </Grid>

              <Field label="Candidates (weighted)" hint="Linked LLMs/frontier models for this endpoint">
                <div style={{ display: "grid", gap: 8 }}>
                  {(rp.candidates || []).map((c, idx) => (
                    <div key={`${rp.id}_${idx}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8 }}>
                      <Select
                        value={c.modelId}
                        onChange={(v) => {
                          const next = [...(rp.candidates || [])];
                          next[idx] = { ...next[idx], modelId: v };
                          updateRoutingPolicy(rp.id, { candidates: next });
                        }}
                        options={models.map((m) => ({ id: m.id, name: `${m.displayName} (${m.class})` }))}
                      />
                      <NumInput
                        value={c.weight}
                        onChange={(v) => {
                          const next = [...(rp.candidates || [])];
                          next[idx] = { ...next[idx], weight: v };
                          updateRoutingPolicy(rp.id, { candidates: next });
                        }}
                        min={0}
                        step={5}
                      />
                      <Button
                        onClick={() => {
                          const next = (rp.candidates || []).filter((_, i) => i !== idx);
                          updateRoutingPolicy(rp.id, { candidates: next });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <div>
                    <Button
                      onClick={() => {
                        const next = [...(rp.candidates || [])];
                        next.push({ modelId: models[0]?.id || "", weight: 50 });
                        updateRoutingPolicy(rp.id, { candidates: next });
                      }}
                    >
                      + Add candidate
                    </Button>
                  </div>
                </div>
              </Field>

              <Field label="Fallback model" hint="Used when degraded (not separately provisioned here)" inline>
                <Select
                  value={rp.fallbackModelId || ""}
                  onChange={(v) => updateRoutingPolicy(rp.id, { fallbackModelId: v })}
                  options={[
                    { id: "", name: "None" },
                    ...models.map((m) => ({ id: m.id, name: `${m.displayName} (${m.class})` })),
                  ]}
                />
              </Field>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Demand Plans (per endpoint)" right={<Button onClick={addDemandPlan} tone="primary">+ Add demand plan</Button>}>
        <div style={{ display: "grid", gap: 10 }}>
          {demandPlans.map((dp) => {
            const ed = sizing.endpointDemand.find((x) => x.id === dp.id);
            return (
              <div key={dp.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 12, background: "#151515" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 850, color: "white" }}>
                    {dp.id}{" "}
                    <span style={{ color: "#aaa", fontWeight: 650 }}>
                      → {endpoints.find((e) => e.id === dp.endpointId)?.displayName || dp.endpointId}
                    </span>
                  </div>
                  <Button tone="danger" onClick={() => removeDemandPlan(dp.id)}>Remove</Button>
                </div>

                <Grid cols={3}>
                  <Field label="Endpoint" inline>
                    <Select
                      value={dp.endpointId}
                      onChange={(v) => updateDemandPlan(dp.id, { endpointId: v })}
                      options={endpoints.map((e) => ({ id: e.id, name: e.displayName }))}
                    />
                  </Field>

                  <Field label="RPS" inline>
                    <NumInput value={dp.rps} onChange={(v) => updateDemandPlan(dp.id, { rps: v })} min={0} step={0.5} />
                  </Field>

                  <Field label="Peak factor" inline>
                    <NumInput
                      value={dp.peakFactor}
                      onChange={(v) => updateDemandPlan(dp.id, { peakFactor: v })}
                      min={1}
                      step={0.25}
                    />
                  </Field>

                  <Field label="Avg input tokens" inline>
                    <NumInput
                      value={dp.avgInputTokens}
                      onChange={(v) => updateDemandPlan(dp.id, { avgInputTokens: v })}
                      min={0}
                      step={50}
                    />
                  </Field>

                  <Field label="Avg output tokens" inline>
                    <NumInput
                      value={dp.avgOutputTokens}
                      onChange={(v) => updateDemandPlan(dp.id, { avgOutputTokens: v })}
                      min={0}
                      step={50}
                    />
                  </Field>

                  <Field label="p95 latency (ms)" inline>
                    <NumInput
                      value={dp.p95LatencyMs}
                      onChange={(v) => updateDemandPlan(dp.id, { p95LatencyMs: v })}
                      min={0}
                      step={50}
                    />
                  </Field>
                </Grid>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Pill tone="neutral">Tokens/req: {fmtInt(ed?.tokensPerReq || 0)}</Pill>
                  <Pill tone="neutral">TPS peak: {fmtInt(ed?.tpsPeak || 0)}</Pill>
                  <Pill tone="neutral">Concurrency peak: {fmtInt(ed?.concurrencyPeak || 0)}</Pill>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="GPU Pools" right={<Button onClick={addPool} tone="primary">+ Add pool</Button>}>
        <div style={{ display: "grid", gap: 10 }}>
          {pools.map((p) => {
            const sku = skuById.get(p.skuId);
            const vramGB = p.skuId === "CUSTOM" ? Number(p.customVramGB) || 0 : Number(sku?.vramGB) || 0;
            const capGpus = (Number(p.gpusPerNode) || 0) * (Number(p.nodeCount) || 0);
            const roll = sizing.poolsOut.find((x) => x.poolId === p.id);

            return (
              <div key={p.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 12, background: "#151515" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 850, color: "white" }}>
                    {p.displayName} <span style={{ color: "#aaa", fontWeight: 650 }}>({p.id})</span>
                  </div>
                  <Button tone="danger" onClick={() => removePool(p.id)}>Remove</Button>
                </div>

                <Grid cols={3}>
                  <Field label="Display name" inline>
                    <TextInput value={p.displayName} onChange={(v) => updatePool(p.id, { displayName: v })} />
                  </Field>

                  <Field label="SKU" inline>
                    <Select
                      value={p.skuId}
                      onChange={(v) => updatePool(p.id, { skuId: v })}
                      options={GPU_SKUS.map((s) => ({ id: s.id, name: s.name }))}
                    />
                  </Field>

                  <Field label="VRAM (GB)" hint="Derived from SKU; editable if Custom" inline>
                    {p.skuId === "CUSTOM" ? (
                      <NumInput value={p.customVramGB} onChange={(v) => updatePool(p.id, { customVramGB: v })} min={0} step={1} />
                    ) : (
                      <div style={{ padding: "10px 12px", color: "white", fontWeight: 800 }}>{fmtInt(vramGB)}</div>
                    )}
                  </Field>

                  <Field label="$ / GPU-hour" inline>
                    <NumInput value={p.ratePerGpuHour} onChange={(v) => updatePool(p.id, { ratePerGpuHour: v })} min={0} step={0.1} />
                  </Field>

                  <Field label="GPUs per node" inline>
                    <NumInput value={p.gpusPerNode} onChange={(v) => updatePool(p.id, { gpusPerNode: v })} min={1} step={1} />
                  </Field>

                  <Field label="Node count" inline>
                    <NumInput value={p.nodeCount} onChange={(v) => updatePool(p.id, { nodeCount: v })} min={0} step={1} />
                  </Field>
                </Grid>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Pill tone="neutral">Capacity GPUs: {fmtInt(capGpus)}</Pill>
                  {roll ? (
                    <Pill tone={roll.capacityOk ? "ok" : "bad"}>
                      Billed GPUs: {fmtInt(roll.billedGpus)} {roll.capacityOk ? "(OK)" : "(Over capacity)"}
                    </Pill>
                  ) : (
                    <Pill tone="neutral">Billed GPUs: 0</Pill>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Reservations (model ↔ pool)" right={<Button onClick={addReservation} tone="primary">+ Add reservation</Button>}>
        <div style={{ display: "grid", gap: 10 }}>
          {reservations.map((r) => (
            <div key={r.id} style={{ border: "1px solid #333", borderRadius: 16, padding: 12, background: "#151515" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 850, color: "white" }}>{r.id}</div>
                <Button tone="danger" onClick={() => removeReservation(r.id)}>Remove</Button>
              </div>

              <Grid cols={2}>
                <Field label="Model" inline>
                  <Select
                    value={r.modelId}
                    onChange={(v) => updateReservation(r.id, { modelId: v })}
                    options={models.map((m) => ({ id: m.id, name: `${m.displayName} (${m.class})` }))}
                  />
                </Field>

                <Field label="Pool" inline>
                  <Select
                    value={r.poolId}
                    onChange={(v) => updateReservation(r.id, { poolId: v })}
                    options={pools.map((p) => ({ id: p.id, name: p.displayName }))}
                  />
                </Field>
              </Grid>

              <Grid cols={3}>
                <Field label="Min GPUs" inline>
                  <NumInput value={r.minGpus} onChange={(v) => updateReservation(r.id, { minGpus: v })} min={0} step={1} />
                </Field>

                <Field label="Max GPUs" inline>
                  <NumInput value={r.maxGpus} onChange={(v) => updateReservation(r.id, { maxGpus: v })} min={0} step={1} />
                </Field>

                <Field label="HA spares %" hint="Adds spares on top of required GPUs" inline>
                  <NumInput value={r.haSparePct} onChange={(v) => updateReservation(r.id, { haSparePct: v })} min={0} max={1} step={0.05} />
                </Field>
              </Grid>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Computed: Model Sizing + Fit Checks">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                {[
                  "Model",
                  "Class",
                  "TPS peak",
                  "Req GPUs",
                  "Req GPUs + HA",
                  "Billing GPUs",
                  "Replicas",
                  "Weights (GB)",
                  "KV (GB)",
                  "VRAM req (GB)",
                  "Pool VRAM (GB)",
                  "VRAM fit",
                  "Monthly GPU cost",
                  "Monthly service price",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 10px",
                      borderBottom: "1px solid #333",
                      fontSize: 12,
                      color: "#b8b8b8",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizing.modelSizing.length === 0 ? (
                <tr>
                  <td style={{ padding: 12, color: "#b8b8b8" }} colSpan={14}>
                    No sizing yet — add demand plans and routing policies that reference models.
                  </td>
                </tr>
              ) : (
                sizing.modelSizing.map((ms) => (
                  <tr key={ms.modelId}>
                    <td style={{ padding: 10, borderBottom: "1px solid #222" }}>
                      <div style={{ fontWeight: 850, color: "white" }}>{ms.modelName}</div>
                      <div style={{ fontSize: 12, color: "#aaa" }}>{ms.poolName || "No pool mapped"}</div>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222" }}>
                      <Pill tone={ms.modelClass === "FRONTIER" ? "warn" : "neutral"}>{ms.modelClass}</Pill>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtInt(ms.tpsPeak)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtInt(ms.gpusForThroughput)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtInt(ms.gpusWithHa)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtInt(ms.billingGpus)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>
                      {fmtInt(ms.replicas)} <span style={{ color: "#aaa", fontSize: 12 }}>(x{fmtInt(ms.gpusPerReplica)} GPU)</span>
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtInt(ms.weightsGB)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtInt(ms.kvGB)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtInt(ms.vramRequiredGB)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtInt(ms.poolVramGB)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222" }}>
                      {ms.poolVramGB > 0 ? (ms.vramFit ? <Pill tone="ok">Fit</Pill> : <Pill tone="bad">No fit</Pill>) : <Pill tone="warn">No pool</Pill>}
                    </td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtMoney0(ms.monthlyGpuCost)}</td>
                    <td style={{ padding: 10, borderBottom: "1px solid #222", color: "white" }}>{fmtMoney0(ms.monthlyServicePrice)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Pill tone="neutral">Total billed GPUs: {fmtInt(sizing.totals.billedGpus)}</Pill>
          <Pill tone="neutral">Total monthly GPU cost: {fmtMoney0(sizing.totals.monthlyGpuCost)}</Pill>
          <Pill tone="ok">Total monthly service price: {fmtMoney0(sizing.totals.monthlyServicePrice)}</Pill>
        </div>

        <div style={{ marginTop: 10, color: "#b8b8b8", fontSize: 12, lineHeight: 1.4 }}>
          Notes: VRAM fit uses <b>weights + KV cache</b> with global overhead %. KV is approximated as{" "}
          <b>concurrency × maxContext × KV bytes/token</b> (per replica). Replace TPS/GPU + KV assumptions with vendor RA data later.
        </div>
      </Section>
    </div>
  );
}