import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ReservationConsumption } from '../../../domain/entities/stock-reservation';
import { StockReservationStatus } from '../../../domain/entities/stock-reservation-status';
import type { StockReservationRepositoryInterface } from '../../../domain/repositories/stock-reservation.repository';
import { STOCK_RESERVATION_REPOSITORY } from '../../../domain/repositories/tokens';
import { DecreaseProductStockUseCase } from '../product-batch/decrease-product-stock';
import {
  EVENT_PUBLISHER,
  type EventPublisherPort,
} from '../../../../shared/domain/ports/event-publisher.port';

@Injectable()
export class ReserveStockOnApprovalUseCase {
  private readonly logger = new Logger(ReserveStockOnApprovalUseCase.name);

  constructor(
    @Inject(STOCK_RESERVATION_REPOSITORY)
    private readonly reservations: StockReservationRepositoryInterface,
    private readonly decreaseStock: DecreaseProductStockUseCase,
    @Inject(EVENT_PUBLISHER)
    private readonly events: EventPublisherPort,
  ) {}

  async execute(input: {
    serviceOrderId: string;
    correlationId: string;
    causationId?: string;
  }): Promise<void> {
    const reservation = await this.reservations.findActiveByServiceOrderId(
      input.serviceOrderId,
    );

    if (!reservation) {
      // Sem demanda preparada: trata como reserva vazia bem-sucedida.
      await this.events.publish({
        eventId: randomUUID(),
        type: 'stock.reserved',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        producer: 'stock-service',
        payload: {
          serviceOrderId: input.serviceOrderId,
          reservationId: randomUUID(),
          items: [],
        },
      });
      return;
    }

    if (reservation.status === StockReservationStatus.RESERVED ||
        reservation.status === StockReservationStatus.CONFIRMED) {
      await this.events.publish({
        eventId: randomUUID(),
        type: 'stock.reserved',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        producer: 'stock-service',
        payload: {
          serviceOrderId: reservation.serviceOrderId,
          reservationId: reservation.id,
          items: reservation.items,
        },
      });
      return;
    }

    if (reservation.status !== StockReservationStatus.PENDING) {
      this.logger.warn(
        `ignore reserve status=${reservation.status} serviceOrderId=${input.serviceOrderId}`,
      );
      return;
    }

    const consumptions: ReservationConsumption[] = [];
    try {
      for (const item of reservation.items) {
        const result = await this.decreaseStock.execute(
          item.productCode,
          item.quantity,
        );
        for (const c of result.consumptions) {
          consumptions.push({
            productCode: item.productCode,
            batchId: c.batchId,
            quantityConsumed: c.quantityConsumed,
            salePrice: c.salePrice,
          });
        }
      }
      reservation.markReserved(consumptions);
      await this.reservations.save(reservation);

      await this.events.publish({
        eventId: randomUUID(),
        type: 'stock.reserved',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        producer: 'stock-service',
        payload: {
          serviceOrderId: reservation.serviceOrderId,
          reservationId: reservation.id,
          items: reservation.items,
        },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'Falha ao reservar estoque';
      // best-effort rollback of partial decreases
      for (const c of consumptions) {
        try {
          await this.decreaseStock.restore(c.batchId, c.quantityConsumed);
        } catch (restoreErr) {
          this.logger.error(
            `falha ao restaurar lote ${c.batchId}: ${
              restoreErr instanceof Error ? restoreErr.message : restoreErr
            }`,
          );
        }
      }
      reservation.markFailed(reason);
      await this.reservations.save(reservation);
      await this.events.publish({
        eventId: randomUUID(),
        type: 'stock.reservation.failed',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        producer: 'stock-service',
        payload: {
          serviceOrderId: input.serviceOrderId,
          reason,
        },
      });
    }
  }
}
