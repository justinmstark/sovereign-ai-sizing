-- ============================================================
-- 003_reference_arch_templates.sql
-- Reference Architecture Templates
-- ============================================================

-- =========================
-- Policy Profile
-- Defines utilization + resilience governance
-- =========================
CREATE TABLE IF NOT EXISTS policy_profile (
  policy_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL UNIQUE,
  target_utilization   NUMERIC(5,4) NOT NULL,   -- e.g., 0.70
  resilience_factor    NUMERIC(5,4) NOT NULL,   -- e.g., 1.20 (N+1)
  overprovision_factor NUMERIC(5,4) DEFAULT 1.00,
  description          TEXT,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Node Profile
-- Defines physical server characteristics
-- =========================
CREATE TABLE IF NOT EXISTS reference_arch_node_profile (
  node_profile_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL UNIQUE,
  cpu_model           TEXT,
  cpu_cores           INT,
  system_memory_gb    INT,
  local_nvme_tb       NUMERIC(6,2),
  network_bandwidth_gbps INT,
  notes               TEXT
);

-- =========================
-- Reference Architecture Template
-- =========================
CREATE TABLE IF NOT EXISTS reference_arch_template (
  template_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL UNIQUE,
  service_class        TEXT NOT NULL, -- llm_inference, training, etc.
  description          TEXT,

  node_profile_id      UUID NOT NULL REFERENCES reference_arch_node_profile(node_profile_id),
  policy_id            UUID NOT NULL REFERENCES policy_profile(policy_id),

  rack_units_per_node  INT,
  max_nodes_per_rack   INT,

  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- GPU Mapping per Template
-- Defines GPU layout within a node
-- =========================
CREATE TABLE IF NOT EXISTS reference_arch_template_gpu_map (
  map_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      UUID NOT NULL REFERENCES reference_arch_template(template_id),
  chip_id          UUID NOT NULL REFERENCES chip(chip_id),
  gpus_per_node    INT NOT NULL,
  interconnect     TEXT, -- e.g., NVLink4, PCIe Gen5
  UNIQUE (template_id, chip_id)
);

-- =========================
-- Indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_template_service
ON reference_arch_template (service_class);

CREATE INDEX IF NOT EXISTS idx_template_gpu_lookup
ON reference_arch_template_gpu_map (chip_id);
