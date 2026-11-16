import { ProductBatchEntity } from './product-batch.entity';
import { ProductEntity } from './product.entity';
import { StockReservationEntity } from './stock-reservation.entity';

export const POSTGRES_ENTITIES = [
  ProductEntity,
  ProductBatchEntity,
  StockReservationEntity,
];

export { ProductBatchEntity, ProductEntity, StockReservationEntity };
