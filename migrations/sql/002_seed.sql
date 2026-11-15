INSERT INTO product (id, code, name, description, created_at, updated_at)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'DEMO-OIL-01', 'Óleo motor 5W30 (demo)', 'Fixture de migration para testes locais', NOW(), NOW()),
  ('11111111-1111-4111-8111-111111111102', 'DEMO-FILTER-01', 'Filtro de óleo (demo)', 'Fixture de migration para testes locais', NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO product_batch (id, product_code, quantity, cost_price, sale_price, created_at, updated_at)
VALUES
  ('22222222-2222-4222-8222-222222222201', 'DEMO-OIL-01', 100, 25.5, 45.9, NOW(), NOW()),
  ('22222222-2222-4222-8222-222222222202', 'DEMO-FILTER-01', 50, 12, 28.5, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  cost_price = EXCLUDED.cost_price,
  sale_price = EXCLUDED.sale_price,
  updated_at = NOW();
