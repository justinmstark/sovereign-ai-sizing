TRUNCATE chip_workload_permission;

-- Baseline: everyone can do embeddings + llm_inference on vLLM (bf16/fp16)
INSERT INTO chip_workload_permission (chip_id, workload_id, permitted, notes)
SELECT c.chip_id, w.workload_id, TRUE, 'baseline'
FROM chip c
CROSS JOIN model_workload w
WHERE w.service_class IN ('embeddings','llm_inference')
  AND w.serving_stack = 'vLLM'
  AND w.precision IN ('bf16','fp16')
ON CONFLICT DO NOTHING;

-- NVIDIA only: TensorRT-LLM fp8 inference
INSERT INTO chip_workload_permission (chip_id, workload_id, permitted, notes)
SELECT c.chip_id, w.workload_id, TRUE, 'nvidia fp8'
FROM chip c
JOIN chip_vendor v ON v.vendor_id = c.vendor_id
JOIN model_workload w
  ON w.service_class='llm_inference'
 AND w.serving_stack='TensorRT-LLM'
 AND w.precision='fp8'
WHERE v.name='NVIDIA'
ON CONFLICT DO NOTHING;

-- Training only on H100 (SXM + PCIe) and MI300X
INSERT INTO chip_workload_permission (chip_id, workload_id, permitted, notes)
SELECT c.chip_id, w.workload_id, TRUE, 'training enabled'
FROM chip c
JOIN chip_vendor v ON v.vendor_id = c.vendor_id
JOIN model_workload w ON w.service_class='llm_training'
WHERE (v.name='NVIDIA' AND c.model_name='H100')
   OR (v.name='AMD' AND c.model_name='MI300X')
ON CONFLICT DO NOTHING;