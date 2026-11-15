import { Module } from '@nestjs/common';
import { AuthModule } from '../../../stock/infrastructure/ioc/auth.module';
import { ProductBatchModule } from '../../../stock/infrastructure/ioc/product-batch.module';
import { ProductModule } from '../../../stock/infrastructure/ioc/product.module';

@Module({
  imports: [AuthModule, ProductModule, ProductBatchModule],
})
export class StockModule {}
