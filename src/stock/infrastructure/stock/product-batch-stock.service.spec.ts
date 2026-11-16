import { ProductBatch } from '../../domain/entities/product-batch';
import type { ProductBatchRepositoryInterface } from '../../domain/repositories/product-batch.repository';
import { ProductBatchStockService } from './product-batch-stock.service';

describe('ProductBatchStockService', () => {
  function repoWith(
    batches: ProductBatch[],
  ): ProductBatchRepositoryInterface {
    return {
      create: jest.fn(),
      find: jest.fn(),
      findByCodeProduct: jest.fn(),
      findById: jest.fn(),
      findAvailableByCode: jest.fn(async (code: string) =>
        batches.filter((b) => b.productCode === code && b.quantity > 0),
      ),
      updateById: jest.fn(),
      remove: jest.fn(),
    };
  }

  it('calcula disponibilidade e cotação FIFO', async () => {
    const batch = ProductBatch.create({
      productCode: 'OLEO',
      quantity: 10,
      costPrice: 5,
      salePrice: 8,
    });
    const decrease = { execute: jest.fn() };
    const service = new ProductBatchStockService(
      repoWith([batch]),
      decrease as never,
    );

    const availability = await service.getAvailability([
      { productCode: 'OLEO', required: 3 },
      { productCode: 'OLEO', required: 2 },
    ]);
    expect(availability[0]).toEqual({
      productCode: 'OLEO',
      required: 5,
      available: 10,
    });

    const quote = await service.quoteFifoCost([
      { productCode: 'OLEO', required: 2 },
      { productCode: 'OLEO', required: 0 },
    ]);
    expect(quote[0].totalCost).toBe(16);
    expect(quote[1].totalCost).toBe(0);

    await service.decreaseStock('OLEO', 1);
    expect(decrease.execute).toHaveBeenCalledWith('OLEO', 1);
  });
});
