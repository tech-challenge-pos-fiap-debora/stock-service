import { Module } from '@nestjs/common';
import {
  CreateProductUseCase,
  DeleteProductUseCase,
  GetAllProductUseCase,
  GetProductUseCase,
  UpdateProductUseCase,
} from '../../application/use-case/product';
import { ProductController } from '../../interfaces/http/product/product.controller';
import { StockDatabaseModule } from '../database/database.module';

@Module({
  imports: [StockDatabaseModule],
  providers: [
    CreateProductUseCase,
    GetAllProductUseCase,
    DeleteProductUseCase,
    GetProductUseCase,
    UpdateProductUseCase,
  ],
  controllers: [ProductController],
  exports: [StockDatabaseModule, GetProductUseCase, CreateProductUseCase],
})
export class ProductModule {}
