import { Module } from '@nestjs/common';

import {
  CreateProductBatchUseCase,
  DecreaseProductStockUseCase,
  GetProductBatchUseCase,
  GetProductStockUseCase,
} from '../../application/use-case/product-batch';
import { STOCK_SERVICE } from '../../../shared/domain/ports/stock-service.port';
import { ProductBatchController } from '../../interfaces/http/product-batch/product-batch.controller';
import { StockController } from '../../interfaces/http/stock/stock.controller';
import { StockDatabaseModule } from '../database/database.module';
import { ProductBatchStockService } from '../stock/product-batch-stock.service';
import { ProductModule } from './product.module';

@Module({
  imports: [StockDatabaseModule, ProductModule],
  providers: [
    CreateProductBatchUseCase,
    GetProductBatchUseCase,
    GetProductStockUseCase,
    DecreaseProductStockUseCase,
    ProductBatchStockService,
    { provide: STOCK_SERVICE, useExisting: ProductBatchStockService },
  ],
  controllers: [ProductBatchController, StockController],
  exports: [
    GetProductStockUseCase,
    DecreaseProductStockUseCase,
    STOCK_SERVICE,
  ],
})
export class ProductBatchModule {}
