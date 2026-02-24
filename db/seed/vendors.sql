INSERT INTO chip_vendor (name) VALUES
  ('NVIDIA'),
  ('AMD'),
  ('Intel')
ON CONFLICT (name) DO NOTHING;
