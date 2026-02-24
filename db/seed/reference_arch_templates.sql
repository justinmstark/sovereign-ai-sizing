-- ============================================================
-- Seed: Policy Profiles
-- ============================================================

INSERT INTO policy_profile (
  name,
  target_utilization,
  resilience_factor,
  overprovision_factor,
  description
) VALUES
  ('standard_inference_policy', 0.70, 1.20, 1.00, '70% target util, N+1 redundancy'),
  ('high_resilience_policy', 0.65, 1.30, 1.05, 'Higher HA enterprise deployment'),
  ('training_policy', 0.80, 1.10, 1.00, 'Higher utilization acceptable for training')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: Node Profiles
-- ============================================================

INSERT INTO reference_arch_node_profile (
  name,
  cpu_model,
  cpu_cores,
  system_memory_gb,
  local_nvme_tb,
  network_bandwidth_gbps,
  notes
) VALUES
  ('8xH100_SXM_Node', 'AMD EPYC 9654', 96, 1024, 8, 400, 'High-performance AI node'),
  ('4xL40S_Inference_Node', 'Intel Xeon 8480+', 64, 512, 4, 200, 'Inference optimized node'),
  ('8xMI300X_Node', 'AMD EPYC 9654', 96, 2048, 8, 400, 'High-memory accelerator node')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: Reference Architecture Templates
-- ============================================================

INSERT INTO reference_arch_template (
  name,
  service_class,
  description,
  node_profile_id,
  policy_id,
  rack_units_per_node,
  max_nodes_per_rack
)
SELECT
  'H100_Enterprise_Inference',
  'llm_inference',
  'Enterprise LLM inference cluster using 8x H100 SXM nodes',
  np.node_profile_id,
  p.policy_id,
  6,
  8
FROM reference_arch_node_profile np, policy_profile p
WHERE np.name = '8xH100_SXM_Node'
  AND p.name = 'standard_inference_policy'
ON CONFLICT DO NOTHING;

INSERT INTO reference_arch_template (
  name,
  service_class,
  description,
  node_profile_id,
  policy_id,
  rack_units_per_node,
  max_nodes_per_rack
)
SELECT
  'L40S_Inference_Cluster',
  'llm_inference',
  'Cost-optimized inference cluster using 4x L40S PCIe nodes',
  np.node_profile_id,
  p.policy_id,
  4,
  10
FROM reference_arch_node_profile np, policy_profile p
WHERE np.name = '4xL40S_Inference_Node'
  AND p.name = 'standard_inference_policy'
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: GPU Mapping per Template
-- ============================================================

INSERT INTO reference_arch_template_gpu_map (
  template_id,
  chip_id,
  gpus_per_node,
  interconnect
)
SELECT
  t.template_id,
  c.chip_id,
  8,
  'NVLink4'
FROM reference_arch_template t
JOIN chip c ON c.model_name = 'H100' AND c.variant = 'SXM'
WHERE t.name = 'H100_Enterprise_Inference'
ON CONFLICT DO NOTHING;

INSERT INTO reference_arch_template_gpu_map (
  template_id,
  chip_id,
  gpus_per_node,
  interconnect
)
SELECT
  t.template_id,
  c.chip_id,
  4,
  'PCIe Gen4'
FROM reference_arch_template t
JOIN chip c ON c.model_name = 'L40S' AND c.variant = 'PCIe'
WHERE t.name = 'L40S_Inference_Cluster'
ON CONFLICT DO NOTHING;
