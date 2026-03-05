-- ============================================================
-- 004_chip_workload_permission.sql
-- Enforce/express which workloads are permitted for which chips
-- ============================================================

CREATE TABLE IF NOT EXISTS chip_workload_permission (
  chip_id        UUID NOT NULL REFERENCES chip(chip_id) ON DELETE CASCADE,
  workload_id    UUID NOT NULL REFERENCES model_workload(workload_id) ON DELETE CASCADE,
  permitted      BOOLEAN NOT NULL DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (chip_id, workload_id)
);

CREATE INDEX IF NOT EXISTS idx_cwp_workload
ON chip_workload_permission (workload_id);

CREATE INDEX IF NOT EXISTS idx_cwp_chip
ON chip_workload_permission (chip_id);