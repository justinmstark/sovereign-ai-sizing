-- NVIDIA Chips
INSERT INTO chip (vendor_id, model_name, variant, generation, form_factor, notes)
SELECT vendor_id, 'H100', 'SXM', 'Hopper', 'SXM5', 'High-end data center GPU'
FROM chip_vendor WHERE name = 'NVIDIA'
ON CONFLICT DO NOTHING;

INSERT INTO chip (vendor_id, model_name, variant, generation, form_factor, notes)
SELECT vendor_id, 'H100', 'PCIe', 'Hopper', 'PCIe', 'PCIe variant'
FROM chip_vendor WHERE name = 'NVIDIA'
ON CONFLICT DO NOTHING;

INSERT INTO chip (vendor_id, model_name, variant, generation, form_factor, notes)
SELECT vendor_id, 'L40S', 'PCIe', 'Ada', 'PCIe', 'Inference-optimized GPU'
FROM chip_vendor WHERE name = 'NVIDIA'
ON CONFLICT DO NOTHING;

-- AMD Chips
INSERT INTO chip (vendor_id, model_name, variant, generation, form_factor, notes)
SELECT vendor_id, 'MI300X', 'OAM', 'CDNA3', 'OAM', 'High memory accelerator'
FROM chip_vendor WHERE name = 'AMD'
ON CONFLICT DO NOTHING;

-- Intel Chips
INSERT INTO chip (vendor_id, model_name, variant, generation, form_factor, notes)
SELECT vendor_id, 'Gaudi2', 'HL-225', 'Gaudi2', 'OAM', 'AI training accelerator'
FROM chip_vendor WHERE name = 'Intel'
ON CONFLICT DO NOTHING;
