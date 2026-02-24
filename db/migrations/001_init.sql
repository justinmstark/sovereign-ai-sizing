-- ============================================================
-- 001_init.sql
-- Core schema for Chip Registry (versioned + calculator-ready)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Vendors
-- =========================
CREATE TABLE IF NOT EXISTS chip_vendor (
  vendor_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE
);

-- =========================
-- Chips
-- =========================
CREATE TABLE IF NOT EXISTS chip (
  chip_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   UUID NOT NULL REFERENCES chip_vendor(vendor_id),
  model_name  TEXT NOT NULL,
  variant     TEXT NOT NULL,
  form_factor TEXT,
  generation  TEXT,
  launch_date DATE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  notes       TEXT,
  UNIQUE (vendor_id, model_name, variant)
);

-- =========================
-- Versioned Chip Specs
-- =========================
CREATE TABLE IF NOT EXISTS chip_specs (
  spec_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chip_id             UUID NOT NULL REFERENCES chip(chip_id),
  effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to        DATE,

  memory_gb           NUMERIC(6,2),
  memory_bw_gbps      NUMERIC(10,2),
  pcie_gen            TEXT,
  pcie_lanes          INT,
  nvlink_version      TEXT,
  nvlink_bw_gbps      NUMERIC(10,2),
  tdp_watts           INT,

  peak_fp16_tflops    NUMERIC(12,2),
  peak_bf16_tflops    NUMERIC(12,2),
  peak_fp8_tflops     NUMERIC(12,2),
  peak_int8_tops      NUMERIC(12,2),

  mig_supported       BOOLEAN NOT NULL DEFAULT FALSE,

  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- =========================
-- Partition Profiles (MIG / SR-IOV)
-- =========================
CREATE TABLE IF NOT EXISTS partition_profile (
  profile_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chip_id         UUID NOT NULL REFERENCES chip(chip_id),
  profile_name    TEXT NOT NULL,
  slices          INT,
  mem_gb          NUMERIC(6,2),
  max_instances   INT,
  notes           TEXT,
  UNIQUE (chip_id, profile_name)
);

-- =========================
-- Workload Definitions
-- =========================
CREATE TABLE IF NOT EXISTS model_workload (
  workload_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_class   TEXT NOT NULL,
  model_name      TEXT NOT NULL,
  params_b        NUMERIC(8,2),
  precision       TEXT,
  serving_stack   TEXT,
  notes           TEXT,
  UNIQUE (service_class, model_name, precision, serving_stack)
);

-- =========================
-- Performance Benchmarks
-- =========================
CREATE TABLE IF NOT EXISTS perf_benchmark (
  bench_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chip_id             UUID NOT NULL REFERENCES chip(chip_id),
  spec_id             UUID REFERENCES chip_specs(spec_id),
  workload_id         UUID NOT NULL REFERENCES model_workload(workload_id),

  effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to        DATE,

  context_len         INT NOT NULL,
  output_len          INT NOT NULL,
  batch_size          INT NOT NULL,
  concurrency         INT NOT NULL,
  kv_cache_mode       TEXT,

  tps_per_gpu         NUMERIC(12,3) NOT NULL,
  p50_latency_ms      NUMERIC(12,3),
  p95_latency_ms      NUMERIC(12,3),

  source              TEXT,
  confidence_score    INT NOT NULL DEFAULT 3 CHECK (confidence_score BETWEEN 1 AND 5),
  last_validated_date DATE NOT NULL DEFAULT CURRENT_DATE,

  CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- =========================
-- Cost References
-- =========================
CREATE TABLE IF NOT EXISTS cost_reference (
  cost_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chip_id         UUID NOT NULL REFERENCES chip(chip_id),
  cost_type       TEXT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  region          TEXT,
  unit            TEXT NOT NULL,
  cost_value      NUMERIC(14,4) NOT NULL,
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE,
  source          TEXT
);

-- =========================
-- Indexes
-- =========================
CREATE INDEX IF NOT EXISTS idx_chip_vendor
ON chip (vendor_id);

CREATE INDEX IF NOT EXISTS idx_perf_lookup
ON perf_benchmark (
  chip_id,
  workload_id,
  context_len,
  output_len,
  batch_size,
  concurrency
);

CREATE INDEX IF NOT EXISTS idx_perf_effective
ON perf_benchmark (effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_cost_lookup
ON cost_reference (chip_id, cost_type);
