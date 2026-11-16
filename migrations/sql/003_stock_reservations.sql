-- Reserva de estoque para a saga coreografada
CREATE TABLE IF NOT EXISTS stock_reservation (
  id UUID PRIMARY KEY,
  service_order_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  consumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_reservation_active_os
  ON stock_reservation (service_order_id)
  WHERE status IN ('PENDING', 'RESERVED', 'CONFIRMED');

CREATE INDEX IF NOT EXISTS idx_stock_reservation_os
  ON stock_reservation (service_order_id);
