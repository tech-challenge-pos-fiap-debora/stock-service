import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  STOCK_SERVICE,
  type StockServicePort,
} from '../../../../shared/domain/ports/stock-service.port';
import { DecreaseProductStockUseCase } from '../../../application/use-case/product-batch/decrease-product-stock';
import { GetProductUseCase } from '../../../application/use-case/product/get-product';
import {
  StockAvailabilityItemDto,
  StockDecreaseRequestDto,
  StockDemandRequestDto,
  StockQuoteItemDto,
} from './dtos/stock-integration.dto';

/**
 * Endpoints internos da saga / billing (sem JWT — rede privada / lab).
 */
@ApiTags('Estoque / Integração')
@Controller('stock')
export class StockController {
  constructor(
    @Inject(STOCK_SERVICE)
    private readonly stock: StockServicePort,
    private readonly decrease: DecreaseProductStockUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Get('product/:code')
  @ApiOperation({
    summary: 'Buscar produto por código (integração)',
    description: 'Usado pelo order-service sem JWT (rede privada).',
  })
  async productByCode(@Param('code') code: string) {
    const product = await this.getProduct.execute(code);
    return { id: product.id, code: product.code, name: product.name };
  }

  @Post('quote')
  @ApiOperation({
    summary: 'Cotar custo FIFO das peças',
    description:
      'Usado pelo billing ao gerar orçamento. Não reserva estoque.',
  })
  @ApiBody({ type: StockDemandRequestDto })
  @ApiOkResponse({ type: [StockQuoteItemDto] })
  async quote(
    @Body() body: StockDemandRequestDto,
  ): Promise<StockQuoteItemDto[]> {
    return this.stock.quoteFifoCost(body.items ?? []);
  }

  @Post('availability')
  @ApiOperation({
    summary: 'Consultar disponibilidade agregada',
    description: 'Soma quantidades disponíveis nos lotes por productCode.',
  })
  @ApiBody({ type: StockDemandRequestDto })
  @ApiOkResponse({ type: [StockAvailabilityItemDto] })
  async availability(
    @Body() body: StockDemandRequestDto,
  ): Promise<StockAvailabilityItemDto[]> {
    return this.stock.getAvailability(body.items ?? []);
  }

  @Post('decrease')
  @ApiOperation({
    summary: 'Baixar estoque (FIFO)',
    description:
      'Baixa direta por código. Na saga preferir reserva via eventos SNS/SQS.',
  })
  @ApiBody({ type: StockDecreaseRequestDto })
  async decreaseStock(@Body() body: StockDecreaseRequestDto) {
    return this.decrease.execute(body.productCode, body.quantity);
  }
}
