-- ============================================================
-- Seed: perf_benchmark baseline rows (demo-ready)
-- Idempotent via WHERE NOT EXISTS guards
-- ============================================================

-- Helper: insert a benchmark if an exact row doesn't already exist
-- (chip_id, workload_id, context_len, output_len, batch_size, concurrency)

-- ------------------------------------------------------------
-- H100 SXM + Llama-3.1-70B bf16 vLLM (your known-good row)
-- ------------------------------------------------------------
WITH c AS (
  SELECT c.chip_id
  FROM chip c
  JOIN chip_vendor v ON v.vendor_id = c.vendor_id
  WHERE v.name='NVIDIA' AND c.model_name='H100' AND c.variant='SXM'
  LIMIT 1
),
w AS (
  SELECT workload_id
  FROM model_workload
  WHERE service_class='llm_inference'
    AND model_name='Llama-3.1-70B'
    AND precision='bf16'
    AND serving_stack='vLLM'
  LIMIT 1
)
INSERT INTO perf_benchmark (
  chip_id, workload_id,
  context_len, output_len, batch_size, concurrency,
  tps_per_gpu, p50_latency_ms, p95_latency_ms,
  source, confidence_score, last_validated_date
)
SELECT
  c.chip_id, w.workload_id,
  8192, 256, 1, 10,
  250.0, 45.0, 90.0,
  'seed_baseline', 2, CURRENT_DATE
FROM c, w
WHERE NOT EXISTS (
  SELECT 1 FROM perf_benchmark pb
  WHERE pb.chip_id = (SELECT chip_id FROM c)
    AND pb.workload_id = (SELECT workload_id FROM w)
    AND pb.context_len=8192 AND pb.output_len=256 AND pb.batch_size=1 AND pb.concurrency=10
);

-- ------------------------------------------------------------
-- H100 PCIe + Llama-3.1-70B bf16 vLLM
-- ------------------------------------------------------------
WITH c AS (
  SELECT c.chip_id
  FROM chip c
  JOIN chip_vendor v ON v.vendor_id = c.vendor_id
  WHERE v.name='NVIDIA' AND c.model_name='H100' AND c.variant='PCIe'
  LIMIT 1
),
w AS (
  SELECT workload_id
  FROM model_workload
  WHERE service_class='llm_inference'
    AND model_name='Llama-3.1-70B'
    AND precision='bf16'
    AND serving_stack='vLLM'
  LIMIT 1
)
INSERT INTO perf_benchmark (
  chip_id, workload_id,
  context_len, output_len, batch_size, concurrency,
  tps_per_gpu, p50_latency_ms, p95_latency_ms,
  source, confidence_score, last_validated_date
)
SELECT
  c.chip_id, w.workload_id,
  8192, 256, 1, 10,
  180.0, 60.0, 120.0,
  'seed_baseline', 2, CURRENT_DATE
FROM c, w
WHERE NOT EXISTS (
  SELECT 1 FROM perf_benchmark pb
  WHERE pb.chip_id = (SELECT chip_id FROM c)
    AND pb.workload_id = (SELECT workload_id FROM w)
    AND pb.context_len=8192 AND pb.output_len=256 AND pb.batch_size=1 AND pb.concurrency=10
);

-- ------------------------------------------------------------
-- L40S PCIe + Llama-3.1-8B bf16 vLLM
-- ------------------------------------------------------------
WITH c AS (
  SELECT c.chip_id
  FROM chip c
  JOIN chip_vendor v ON v.vendor_id = c.vendor_id
  WHERE v.name='NVIDIA' AND c.model_name='L40S' AND c.variant='PCIe'
  LIMIT 1
),
w AS (
  SELECT workload_id
  FROM model_workload
  WHERE service_class='llm_inference'
    AND model_name='Llama-3.1-8B'
    AND precision='bf16'
    AND serving_stack='vLLM'
  LIMIT 1
)
INSERT INTO perf_benchmark (
  chip_id, workload_id,
  context_len, output_len, batch_size, concurrency,
  tps_per_gpu, p50_latency_ms, p95_latency_ms,
  source, confidence_score, last_validated_date
)
SELECT
  c.chip_id, w.workload_id,
  8192, 256, 1, 10,
  600.0, 25.0, 55.0,
  'seed_baseline', 2, CURRENT_DATE
FROM c, w
WHERE NOT EXISTS (
  SELECT 1 FROM perf_benchmark pb
  WHERE pb.chip_id = (SELECT chip_id FROM c)
    AND pb.workload_id = (SELECT workload_id FROM w)
    AND pb.context_len=8192 AND pb.output_len=256 AND pb.batch_size=1 AND pb.concurrency=10
);

-- ------------------------------------------------------------
-- MI300X OAM + Llama-3.1-70B bf16 vLLM
-- ------------------------------------------------------------
WITH c AS (
  SELECT c.chip_id
  FROM chip c
  JOIN chip_vendor v ON v.vendor_id = c.vendor_id
  WHERE v.name='AMD' AND c.model_name='MI300X' AND c.variant='OAM'
  LIMIT 1
),
w AS (
  SELECT workload_id
  FROM model_workload
  WHERE service_class='llm_inference'
    AND model_name='Llama-3.1-70B'
    AND precision='bf16'
    AND serving_stack='vLLM'
  LIMIT 1
)
INSERT INTO perf_benchmark (
  chip_id, workload_id,
  context_len, output_len, batch_size, concurrency,
  tps_per_gpu, p50_latency_ms, p95_latency_ms,
  source, confidence_score, last_validated_date
)
SELECT
  c.chip_id, w.workload_id,
  8192, 256, 1, 10,
  200.0, 55.0, 110.0,
  'seed_baseline', 2, CURRENT_DATE
FROM c, w
WHERE NOT EXISTS (
  SELECT 1 FROM perf_benchmark pb
  WHERE pb.chip_id = (SELECT chip_id FROM c)
    AND pb.workload_id = (SELECT workload_id FROM w)
    AND pb.context_len=8192 AND pb.output_len=256 AND pb.batch_size=1 AND pb.concurrency=10
);

-- ------------------------------------------------------------
-- Gaudi2 HL-225 + Llama-3.1-70B bf16 vLLM (placeholder demo row)
-- ------------------------------------------------------------
WITH c AS (
  SELECT c.chip_id
  FROM chip c
  JOIN chip_vendor v ON v.vendor_id = c.vendor_id
  WHERE v.name='Intel' AND c.model_name='Gaudi2' AND c.variant='HL-225'
  LIMIT 1
),
w AS (
  SELECT workload_id
  FROM model_workload
  WHERE service_class='llm_inference'
    AND model_name='Llama-3.1-70B'
    AND precision='bf16'
    AND serving_stack='vLLM'
  LIMIT 1
)
INSERT INTO perf_benchmark (
  chip_id, workload_id,
  context_len, output_len, batch_size, concurrency,
  tps_per_gpu, p50_latency_ms, p95_latency_ms,
  source, confidence_score, last_validated_date
)
SELECT
  c.chip_id, w.workload_id,
  8192, 256, 1, 10,
  140.0, 75.0, 150.0,
  'seed_baseline', 1, CURRENT_DATE
FROM c, w
WHERE NOT EXISTS (
  SELECT 1 FROM perf_benchmark pb
  WHERE pb.chip_id = (SELECT chip_id FROM c)
    AND pb.workload_id = (SELECT workload_id FROM w)
    AND pb.context_len=8192 AND pb.output_len=256 AND pb.batch_size=1 AND pb.concurrency=10
);
