-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Factory (scenario root)
-- =========================
CREATE TABLE IF NOT EXISTS factory (
  factory_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  environment text NOT NULL DEFAULT 'prod',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_factory_env ON factory(environment);

-- =========================
-- Endpoints
-- =========================
CREATE TABLE IF NOT EXISTS factory_endpoint (
  endpoint_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES factory(factory_id) ON DELETE CASCADE,
  display_name text NOT NULL,
  endpoint_type text NOT NULL DEFAULT 'chat'
);

CREATE INDEX IF NOT EXISTS idx_factory_endpoint_factory ON factory_endpoint(factory_id);

-- =========================
-- Models (mapped to model_workload)
-- =========================
CREATE TABLE IF NOT EXISTS factory_model (
  model_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES factory(factory_id) ON DELETE CASCADE,

  -- Link back to your existing workload catalog
  workload_id uuid NOT NULL REFERENCES model_workload(workload_id),

  -- UI label only (LLM / FRONTIER etc.)
  label_class text NOT NULL DEFAULT 'LLM',

  -- Benchmark knobs for TPS lookup (so we stay consistent with perf_benchmark)
  context_len int NOT NULL DEFAULT 8192,
  output_len int NOT NULL DEFAULT 256,
  batch_size int NOT NULL DEFAULT 1,
  concurrency int NOT NULL DEFAULT 10,

  -- Optional service assumptions (for future VRAM checks / replica math)
  gpus_per_replica int NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_factory_model_factory ON factory_model(factory_id);
CREATE INDEX IF NOT EXISTS idx_factory_model_workload ON factory_model(workload_id);

-- =========================
-- Routing policy: endpoint -> candidates (weights) + fallback
-- =========================
CREATE TABLE IF NOT EXISTS factory_routing_policy (
  policy_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES factory(factory_id) ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES factory_endpoint(endpoint_id) ON DELETE CASCADE,

  strategy text NOT NULL DEFAULT 'weighted_primary_with_fallback', -- or 'single_model'
  fallback_model_id uuid NULL REFERENCES factory_model(model_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_factory_routing_factory ON factory_routing_policy(factory_id);
CREATE INDEX IF NOT EXISTS idx_factory_routing_endpoint ON factory_routing_policy(endpoint_id);

CREATE TABLE IF NOT EXISTS factory_routing_candidate (
  policy_id uuid NOT NULL REFERENCES factory_routing_policy(policy_id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES factory_model(model_id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 100,
  PRIMARY KEY (policy_id, model_id)
);

-- =========================
-- Demand plans per endpoint
-- =========================
CREATE TABLE IF NOT EXISTS factory_demand_plan (
  demand_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES factory(factory_id) ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES factory_endpoint(endpoint_id) ON DELETE CASCADE,

  rps numeric NOT NULL DEFAULT 0,
  avg_input_tokens int NOT NULL DEFAULT 0,
  avg_output_tokens int NOT NULL DEFAULT 0,
  peak_factor numeric NOT NULL DEFAULT 1.0,
  p95_latency_ms int NOT NULL DEFAULT 1500
);

CREATE INDEX IF NOT EXISTS idx_factory_demand_factory ON factory_demand_plan(factory_id);
CREATE INDEX IF NOT EXISTS idx_factory_demand_endpoint ON factory_demand_plan(endpoint_id);

-- =========================
-- Pools (chip-based capacity + $/GPU-hr)
-- =========================
CREATE TABLE IF NOT EXISTS factory_pool (
  pool_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES factory(factory_id) ON DELETE CASCADE,

  display_name text NOT NULL,

  chip_id uuid NOT NULL REFERENCES chip(chip_id),

  gpus_per_node int NOT NULL DEFAULT 8,
  node_count int NOT NULL DEFAULT 0,

  rate_per_gpu_hour numeric NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_factory_pool_factory ON factory_pool(factory_id);
CREATE INDEX IF NOT EXISTS idx_factory_pool_chip ON factory_pool(chip_id);

-- =========================
-- Reservations (model -> pool) + min/max + HA spares
-- =========================
CREATE TABLE IF NOT EXISTS factory_reservation (
  reservation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES factory(factory_id) ON DELETE CASCADE,

  model_id uuid NOT NULL REFERENCES factory_model(model_id) ON DELETE CASCADE,
  pool_id uuid NOT NULL REFERENCES factory_pool(pool_id) ON DELETE CASCADE,

  min_gpus int NOT NULL DEFAULT 0,
  max_gpus int NOT NULL DEFAULT 999999,
  ha_spare_pct numeric NOT NULL DEFAULT 0.1
);

CREATE INDEX IF NOT EXISTS idx_factory_res_factory ON factory_reservation(factory_id);
CREATE INDEX IF NOT EXISTS idx_factory_res_model ON factory_reservation(model_id);
CREATE INDEX IF NOT EXISTS idx_factory_res_pool ON factory_reservation(pool_id);

-- =========================
-- Touch updated_at
-- =========================
CREATE OR REPLACE FUNCTION touch_factory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE factory SET updated_at = now() WHERE factory_id = NEW.factory_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_factory_updated_at_1 ON factory_endpoint;
CREATE TRIGGER trg_touch_factory_updated_at_1
AFTER INSERT OR UPDATE OR DELETE ON factory_endpoint
FOR EACH ROW EXECUTE FUNCTION touch_factory_updated_at();

DROP TRIGGER IF EXISTS trg_touch_factory_updated_at_2 ON factory_model;
CREATE TRIGGER trg_touch_factory_updated_at_2
AFTER INSERT OR UPDATE OR DELETE ON factory_model
FOR EACH ROW EXECUTE FUNCTION touch_factory_updated_at();

DROP TRIGGER IF EXISTS trg_touch_factory_updated_at_3 ON factory_routing_policy;
CREATE TRIGGER trg_touch_factory_updated_at_3
AFTER INSERT OR UPDATE OR DELETE ON factory_routing_policy
FOR EACH ROW EXECUTE FUNCTION touch_factory_updated_at();

DROP TRIGGER IF EXISTS trg_touch_factory_updated_at_4 ON factory_routing_candidate;
CREATE TRIGGER trg_touch_factory_updated_at_4
AFTER INSERT OR UPDATE OR DELETE ON factory_routing_candidate
FOR EACH ROW EXECUTE FUNCTION touch_factory_updated_at();

DROP TRIGGER IF EXISTS trg_touch_factory_updated_at_5 ON factory_demand_plan;
CREATE TRIGGER trg_touch_factory_updated_at_5
AFTER INSERT OR UPDATE OR DELETE ON factory_demand_plan
FOR EACH ROW EXECUTE FUNCTION touch_factory_updated_at();

DROP TRIGGER IF EXISTS trg_touch_factory_updated_at_6 ON factory_pool;
CREATE TRIGGER trg_touch_factory_updated_at_6
AFTER INSERT OR UPDATE OR DELETE ON factory_pool
FOR EACH ROW EXECUTE FUNCTION touch_factory_updated_at();

DROP TRIGGER IF EXISTS trg_touch_factory_updated_at_7 ON factory_reservation;
CREATE TRIGGER trg_touch_factory_updated_at_7
AFTER INSERT OR UPDATE OR DELETE ON factory_reservation
FOR EACH ROW EXECUTE FUNCTION touch_factory_updated_at();