// File: src/apps/methodology/MethodologyHome.jsx
import React, { useMemo, useState } from "react";

// Import your methodology pages
import LLMTrainingMethodology from "./LLMTrainingMethodology.jsx";
import DigitalTwinMethodology from "./DigitalTwinMethodology.jsx";
import OmniverseMethodology from "./OmniverseMethodology.jsx";

// ✅ Add newly created methodology pages
import GPUaaSMethodology from "./GPUaaSMethodology.jsx";
import TokenFactorMethodology from "./TokenFactorMethodology.jsx";
import GenAIInferencingMethodology from "./GenAIInferencingMethodology.jsx";
import AIMLTrainingMethodology from "./AIMLTrainingMethodology.jsx";
import LLMServicesMethodology from "./LLMServicesMethodology.jsx";

/**
 * MethodologyHome.jsx
 * - Single entry point for all methodology/reference pages
 * - No Tailwind
 * - Uses tabs + search + quick links + “what changed” notes
 * - Designed to be audit-friendly and easy to navigate
 */

function Pill({ children }) {
  return <span style={styles.pill}>{children}</span>;
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

function TabButton({ active, onClick, children, badge }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.tabBtn,
        ...(active ? styles.tabBtnActive : styles.tabBtnIdle),
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {children}
        {badge ? <span style={styles.badge}>{badge}</span> : null}
      </span>
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div style={styles.searchWrap}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.searchInput}
      />
    </div>
  );
}

function LinkRow({ title, desc, onClick, tag }) {
  return (
    <button type="button" onClick={onClick} style={styles.linkRow}>
      <div style={{ minWidth: 0 }}>
        <div style={styles.linkTitle}>
          {title} {tag ? <span style={styles.linkTag}>{tag}</span> : null}
        </div>
        <div style={styles.linkDesc}>{desc}</div>
      </div>
      <div style={styles.linkChevron}>›</div>
    </button>
  );
}

function Divider() {
  return <div style={styles.divider} />;
}

function InfoBox({ title, children }) {
  return (
    <div style={styles.infoBox}>
      <div style={styles.infoTitle}>{title}</div>
      <div style={styles.infoBody}>{children}</div>
    </div>
  );
}

export default function MethodologyHome() {
  const tabs = useMemo(
    () => [
      {
        key: "overview",
        label: "Overview",
        badge: "Reference",
        render: ({ go }) => <OverviewPanel go={go} />,
        keywords:
          "overview introduction assumptions governance audit transparency formulas rounding utilization growth scenarios what changed",
      },

      // ✅ NEW: GPUaaS
      {
        key: "gpu-aas",
        label: "GPUaaS",
        badge: "Compute",
        render: () => <GPUaaSMethodology />,
        keywords:
          "gpu-aas gpuaas tokens per second tps benchmark utilization resilience factor headroom rounding",
      },

      // ✅ NEW: Token Factor
      {
        key: "token-factor",
        label: "LLM Token Factor",
        badge: "Capacity",
        render: () => <TokenFactorMethodology />,
        keywords:
          "token factor headroom installed gpus capacity tokens per second required demand benchmark tps",
      },

      // ✅ NEW: LLM Services
      {
        key: "llm-services",
        label: "LLM Services",
        badge: "Factory",
        render: () => <LLMServicesMethodology />,
        keywords:
          "llm services factory service classes governance compliance routing workloads policy tiers latency",
      },

      // ✅ NEW: GenAI Inferencing
      {
        key: "genai-inferencing",
        label: "GenAI Inferencing",
        badge: "KV + VRAM",
        render: () => <GenAIInferencingMethodology />,
        keywords:
          "genai inferencing engine kv cache vram weights tensor parallel throughput tokens per second latency",
      },

      // Existing
      {
        key: "llmtraining",
        label: "LLM Training",
        badge: "Compute",
        render: () => <LLMTrainingMethodology />,
        keywords:
          "llm training gpu-hours runs epochs utilization nodes storage checkpoints cagr activity complexity",
      },

      // ✅ NEW: AI/ML Training
      {
        key: "ai-ml-training",
        label: "AI/ML Training",
        badge: "Training",
        render: () => <AIMLTrainingMethodology />,
        keywords:
          "ai ml training steps gpu-hours dataset tokens epochs checkpoints retention throughput batch size",
      },

      // Existing
      {
        key: "digitaltwins",
        label: "Digital Twins",
        badge: "RT + Sim",
        render: () => <DigitalTwinMethodology />,
        keywords:
          "digital twins realtime simulation visualization users concurrency gpu-hours packing utilization storage logs network",
      },
      {
        key: "omniverse",
        label: "Omniverse",
        badge: "Platform",
        render: () => <OmniverseMethodology />,
        keywords:
          "omniverse nucleus kit streaming creators reviewers sessions gpu-hours utilization storage versioning cache network",
      },
    ],
    []
  );

  const [activeKey, setActiveKey] = useState("overview");
  const [q, setQ] = useState("");

  const filteredTabs = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return tabs;

    return tabs.filter((t) => {
      const hay = `${t.label} ${t.badge || ""} ${t.keywords || ""}`.toLowerCase();
      return hay.includes(query);
    });
  }, [tabs, q]);

  const activeTab = useMemo(() => {
    const exists = filteredTabs.find((t) => t.key === activeKey);
    return exists || filteredTabs[0] || tabs[0];
  }, [filteredTabs, activeKey, tabs]);

  const go = (key) => setActiveKey(key);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hTitle}>Sizing Model – Methodology</div>
          <div style={styles.hSubtitle}>
            These pages exist so others can <Pill>reference</Pill>, <Pill>audit</Pill>, and{" "}
            <Pill>reproduce</Pill> the calculations used in the sizing calculators.
          </div>
        </div>

        <div style={styles.headerRight}>
          <SearchBox
            value={q}
            onChange={setQ}
            placeholder="Search methodology… (e.g. utilization, checkpoints, nucleus, kv cache)"
          />
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.sidebar}>
          <div style={styles.sidebarTitle}>Sections</div>

          <div style={styles.tabsList}>
            {filteredTabs.map((t) => (
              <TabButton
                key={t.key}
                active={activeTab?.key === t.key}
                onClick={() => setActiveKey(t.key)}
                badge={t.badge}
              >
                {t.label}
              </TabButton>
            ))}
          </div>

          {filteredTabs.length === 0 ? (
            <div style={styles.emptyState}>
              No matches for <b>{q}</b>.
            </div>
          ) : null}

          <Divider />

          <div style={styles.sidebarHint}>
            <div style={styles.sidebarHintTitle}>How to use</div>
            <div style={styles.sidebarHintText}>
              Link from each calculator as <b>“View methodology”</b>. Reviewers should be able to
              reproduce results using the formulas and trace tables.
            </div>
          </div>
        </div>

        <div style={styles.content}>{activeTab?.render ? activeTab.render({ go }) : null}</div>
      </div>
    </div>
  );
}

function OverviewPanel({ go }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Card title="Quick links" subtitle="Jump straight to a workload methodology" right={<Pill>Navigation</Pill>}>
        <div style={styles.linksGrid}>
          <LinkRow
            title="GPUaaS"
            tag="Compute"
            desc="User demand → tokens/sec → GPU count using benchmark TPS/GPU + utilization + resilience."
            onClick={() => go("gpu-aas")}
          />
          <LinkRow
            title="LLM Token Factor"
            tag="Capacity"
            desc="Installed GPUs × TPS/GPU vs required tokens/sec → token factor + headroom %."
            onClick={() => go("token-factor")}
          />
          <LinkRow
            title="LLM Services"
            tag="Factory"
            desc="Service-class sizing and governance-friendly assumptions for LLM services delivery."
            onClick={() => go("llm-services")}
          />
          <LinkRow
            title="GenAI Inferencing"
            tag="KV + VRAM"
            desc="Two constraints: throughput + VRAM (weights + KV cache), then translate to host + ops."
            onClick={() => go("genai-inferencing")}
          />
          <LinkRow
            title="LLM Training"
            tag="Compute"
            desc="GPU-hours → GPUs/Nodes + checkpoints/storage + growth/scenarios."
            onClick={() => go("llmtraining")}
          />
          <LinkRow
            title="AI/ML Training"
            tag="Training"
            desc="Dataset/tokens → steps → GPU-hours + checkpoint retention + basic infra translations."
            onClick={() => go("ai-ml-training")}
          />
          <LinkRow
            title="Digital Twins"
            tag="RT + Sim"
            desc="Users/sessions → GPU capacity + host resources + storage + network."
            onClick={() => go("digitaltwins")}
          />
          <LinkRow
            title="Omniverse"
            tag="Platform"
            desc="Creators/reviewers → GPU streaming + Nucleus sizing + storage + egress."
            onClick={() => go("omniverse")}
          />
        </div>

        <Divider />

        <InfoBox title="Audit principle">
          Keep <b>pure math</b> and <b>output policies</b> separate:
          <ul style={styles.ulNested}>
            <li>Pure math: formulas that produce fractional GPUs/nodes/storage.</li>
            <li>Output policy: rounding up, minimum cluster sizes, N+1, tier tables.</li>
          </ul>
        </InfoBox>
      </Card>

      <Card title="What these pages are for" subtitle="A shared reference for reviewers and implementers" right={<Pill>Purpose</Pill>}>
        <ul style={styles.ul}>
          <li>Provide an auditable, human-readable explanation of key sizing formulas.</li>
          <li>Make assumptions explicit (utilization, headroom, retention, concurrency, growth).</li>
          <li>Enable independent reproduction of sizing outputs for governance and review.</li>
        </ul>
      </Card>

      <Card title="What changed recently" subtitle="Use this section to note methodology additions/updates" right={<Pill>Change log</Pill>}>
        <ul style={styles.ul}>
          <li>
            Added methodology tabs for <b>GPUaaS</b>, <b>LLM Token Factor</b>, <b>LLM Services</b>,{" "}
            <b>GenAI Inferencing</b>, and <b>AI/ML Training</b>.
          </li>
          <li>
            Updated quick links + search keywords so reviewers can locate concepts like <Pill>kv cache</Pill>,{" "}
            <Pill>vram</Pill>, <Pill>headroom</Pill>, and <Pill>benchmark tps</Pill>.
          </li>
        </ul>
        <div style={{ opacity: 0.7, fontSize: 12, marginTop: 8, lineHeight: 1.35 }}>
          Tip: keep this list short and date-stamp entries if you want a full audit trail.
        </div>
      </Card>

      <Card title="Recommended review checklist" subtitle="The items people usually challenge" right={<Pill>Checklist</Pill>}>
        <div style={styles.checkGrid}>
          <InfoBox title="Inputs & units">Are inputs defined clearly? Are units consistent (TB vs GB, hours vs days)?</InfoBox>
          <InfoBox title="Utilization & headroom">What does utilization include? Is there explicit headroom for peaks / failures?</InfoBox>
          <InfoBox title="Peak constraints">Are we taking max(throughput-based, memory-based) where appropriate?</InfoBox>
          <InfoBox title="Storage retention">Do checkpoints/logs/snapshots have clear retention and replication assumptions?</InfoBox>
          <InfoBox title="Growth & scenarios">Is CAGR applied to activity, complexity, or both? Are overrides documented?</InfoBox>
          <InfoBox title="Rounding policy">Do outputs ceil GPUs/nodes? Are minimums stated (e.g., minimum cluster size)?</InfoBox>
        </div>
      </Card>

      <Card
        title="Keeping calculators and methodology aligned"
        subtitle="Practical workflow so they don’t drift"
        right={<Pill>Process</Pill>}
      >
        <ul style={styles.ul}>
          <li>
            Use the <b>same field names</b> in calculator UI and methodology (example: <Pill>target_utilization</Pill>,{" "}
            <Pill>gpu_per_node</Pill>, <Pill>checkpointRetentionMonths</Pill>).
          </li>
          <li>
            If you introduce a multiplier/tier, add it in three places:
            <ul style={styles.ulNested}>
              <li>Calculator logic</li>
              <li>Methodology formula section</li>
              <li>Methodology notes (“why it exists”)</li>
            </ul>
          </li>
          <li>
            If someone questions a number, add a <b>trace table</b> that shows step-by-step arithmetic in the methodology
            page (most audit issues disappear immediately).
          </li>
        </ul>
      </Card>
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
  headerRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: 12,
    alignItems: "start",
  },
  sidebar: {
    position: "sticky",
    top: 12,
    alignSelf: "start",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 14,
    boxShadow: "0 12px 40px rgba(0,0,0,0.30)",
    padding: 12,
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "rgba(255,255,255,0.80)",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  tabsList: {
    display: "grid",
    gap: 8,
  },
  tabBtn: {
    width: "100%",
    textAlign: "left",
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    cursor: "pointer",
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    background: "rgba(0,0,0,0.20)",
  },
  tabBtnActive: {
    background: "rgba(70,130,200,0.18)",
    border: "1px solid rgba(120,200,255,0.26)",
    boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
  },
  tabBtnIdle: {
    background: "rgba(0,0,0,0.18)",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,0.10)",
    margin: "12px 0",
  },
  sidebarHint: {
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px dashed rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.70)",
    fontSize: 12,
    lineHeight: 1.35,
  },
  sidebarHintTitle: {
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 6,
    color: "rgba(255,255,255,0.82)",
  },
  sidebarHintText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.35,
  },
  emptyState: {
    marginTop: 10,
    padding: "10px 10px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.20)",
    color: "rgba(255,255,255,0.75)",
    fontSize: 12.5,
    lineHeight: 1.35,
  },
  content: {
    minWidth: 0,
  },

  // Reusable UI atoms
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

  // Card styles (also used by overview panel)
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

  // Overview links
  linksGrid: {
    display: "grid",
    gap: 10,
  },
  linkRow: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    cursor: "pointer",
    textAlign: "left",
  },
  linkTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "rgba(255,255,255,0.90)",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  linkTag: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    whiteSpace: "nowrap",
  },
  linkDesc: {
    marginTop: 5,
    fontSize: 12.5,
    color: "rgba(255,255,255,0.70)",
    lineHeight: 1.3,
  },
  linkChevron: {
    fontSize: 22,
    color: "rgba(255,255,255,0.55)",
    paddingLeft: 8,
  },

  // Info boxes / checklist tiles
  checkGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  infoBox: {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.18)",
    padding: 12,
  },
  infoTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    marginBottom: 6,
    color: "rgba(255,255,255,0.86)",
  },
  infoBody: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.35,
  },

  ul: {
    margin: 0,
    paddingLeft: 18,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.45,
    fontSize: 13,
  },
  ulNested: {
    marginTop: 8,
    paddingLeft: 18,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 1.45,
    fontSize: 12.5,
  },

  // Search
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 280,
    maxWidth: 420,
    width: "min(420px, 90vw)",
  },
  searchInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.92)",
    outline: "none",
    fontSize: 13,
    boxSizing: "border-box",
  },
};