-- ============================================================
-- 002_views.sql
-- Query helper views
-- ============================================================

CREATE OR REPLACE VIEW v_best_tps_match AS
SELECT
  pb.bench_id,
  pb.chip_id,
  pb.workload_id,
  pb.context_len,
  pb.output_len,
  pb.batch_size,
  pb.concurrency,
  pb.kv_cache_mode,
  pb.tps_per_gpu,
  pb.p50_latency_ms,
  pb.p95_latency_ms,
  pb.confidence_score,
  pb.last_validated_date,
  c.model_name AS chip_model,
  c.variant,
  v.name AS vendor,
  mw.model_name AS workload_model,
  mw.service_class,
  mw.precision,
  mw.serving_stack
FROM perf_benchmark pb
JOIN chip c ON c.chip_id = pb.chip_id
JOIN chip_vendor v ON v.vendor_id = c.vendor_id
JOIN model_workload mw ON mw.workload_id = pb.workload_id
WHERE pb.effective_from <= CURRENT_DATE
  AND (pb.effective_to IS NULL OR pb.effective_to > CURRENT_DATE);
