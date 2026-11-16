import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ProductBatchEntity,
  ProductEntity,
  StockReservationEntity,
} from '../../../shared/infrastructure/database/postgres/entities';
import { TypeormProductBatchRepository } from '../../../shared/infrastructure/database/postgres/repositories/typeorm-product-batch.repository';
import { TypeormProductRepository } from '../../../shared/infrastructure/database/postgres/repositories/typeorm-product.repository';
import { TypeormStockReservationRepository } from '../../../shared/infrastructure/database/postgres/repositories/typeorm-stock-reservation.repository';
import {
  PRODUCT_BATCH_REPOSITORY,
  PRODUCT_REPOSITORY,
  STOCK_RESERVATION_REPOSITORY,
} from '../../domain/repositories/tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      ProductBatchEntity,
      StockReservationEntity,
    ]),
  ],
  providers: [
    {
      provide: PRODUCT_REPOSITORY,
      useClass: TypeormProductRepository,
    },
    {
      provide: PRODUCT_BATCH_REPOSITORY,
      useClass: TypeormProductBatchRepository,
    },
    {
      provide: STOCK_RESERVATION_REPOSITORY,
      useClass: TypeormStockReservationRepository,
    },
  ],
  exports: [
    PRODUCT_REPOSITORY,
    PRODUCT_BATCH_REPOSITORY,
    STOCK_RESERVATION_REPOSITORY,
  ],
})
export class StockDatabaseModule {}
