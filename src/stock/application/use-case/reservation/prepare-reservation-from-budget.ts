import { Inject, Injectable, Logger } from '@nestjs/common';
import { StockReservation } from '../../../domain/entities/stock-reservation';
import { StockReservationStatus } from '../../../domain/entities/stock-reservation-status';
import type { StockReservationRepositoryInterface } from '../../../domain/repositories/stock-reservation.repository';
import { STOCK_RESERVATION_REPOSITORY } from '../../../domain/repositories/tokens';

export type BudgetItemLike = {
  type: string;
  referenceId: string;
  description?: string;
  quantity: number;
};

@Injectable()
export class PrepareReservationFromBudgetUseCase {
  private readonly logger = new Logger(PrepareReservationFromBudgetUseCase.name);

  constructor(
    @Inject(STOCK_RESERVATION_REPOSITORY)
    private readonly reservations: StockReservationRepositoryInterface,
  ) {}

  async execute(input: {
    serviceOrderId: string;
    items: BudgetItemLike[];
  }): Promise<StockReservation | null> {
    const parts = input.items
      .filter((i) => i.type === 'PART' && i.quantity > 0)
      .map((i) => ({
        productCode: String(i.referenceId).toUpperCase(),
        quantity: Number(i.quantity),
      }));

    // Sem peças: cria PENDING vazio para a aprovação no-op reservar com sucesso.
    const aggregated = new Map<string, number>();
    for (const p of parts) {
      aggregated.set(p.productCode, (aggregated.get(p.productCode) ?? 0) + p.quantity);
    }
    const items = Array.from(aggregated.entries()).map(([productCode, quantity]) => ({
      productCode,
      quantity,
    }));

    const existing = await this.reservations.findActiveByServiceOrderId(
      input.serviceOrderId,
    );
    if (existing) {
      if (existing.status === StockReservationStatus.PENDING) {
        existing.replaceItems(items);
        return this.reservations.save(existing);
      }
      this.logger.log(
        `reserva ativa já existe status=${existing.status} serviceOrderId=${input.serviceOrderId}`,
      );
      return existing;
    }

    const created = StockReservation.create({
      serviceOrderId: input.serviceOrderId,
      items,
    });
    return this.reservations.create(created);
  }
}
