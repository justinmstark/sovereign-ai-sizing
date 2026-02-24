-- LLM Inference Workloads
INSERT INTO model_workload (
  service_class,
  model_name,
  params_b,
  precision,
  serving_stack,
  notes
) VALUES
  ('llm_inference', 'Llama-3.1-8B', 8, 'bf16', 'vLLM', 'General chatbot profile'),
  ('llm_inference', 'Llama-3.1-70B', 70, 'bf16', 'vLLM', 'Large-scale enterprise chatbot'),
  ('llm_inference', 'Mixtral-8x7B', 46.7, 'bf16', 'vLLM', 'MoE inference workload'),
  ('llm_inference', 'Llama-3.1-70B', 70, 'fp8', 'TensorRT-LLM', 'Optimized inference stack')
ON CONFLICT DO NOTHING;

-- Embeddings
INSERT INTO model_workload (
  service_class,
  model_name,
  params_b,
  precision,
  serving_stack,
  notes
) VALUES
  ('embeddings', 'BGE-Large', 0.3, 'fp16', 'vLLM', 'Vector embedding workload')
ON CONFLICT DO NOTHING;

-- Training Example
INSERT INTO model_workload (
  service_class,
  model_name,
  params_b,
  precision,
  serving_stack,
  notes
) VALUES
  ('llm_training', 'Llama-3.1-70B', 70, 'bf16', 'DeepSpeed', 'Pre-training or fine-tuning workload')
ON CONFLICT DO NOTHING;
