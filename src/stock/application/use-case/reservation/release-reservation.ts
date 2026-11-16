import { randomUUID } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { StockReservationStatus } from '../../../domain/entities/stock-reservation-status';
import type { StockReservationRepositoryInterface } from '../../../domain/repositories/stock-reservation.repository';
import { STOCK_RESERVATION_REPOSITORY } from '../../../domain/repositories/tokens';
import { DecreaseProductStockUseCase } from '../product-batch/decrease-product-stock';
import {
  EVENT_PUBLISHER,
  type EventPublisherPort,
} from '../../../../shared/domain/ports/event-publisher.port';

@Injectable()
export class ReleaseReservationUseCase {
  private readonly logger = new Logger(ReleaseReservationUseCase.name);

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
    reason?: string;
  }): Promise<void> {
    const reservation =
      (await this.reservations.findActiveByServiceOrderId(
        input.serviceOrderId,
      )) ??
      (await this.reservations.findLatestByServiceOrderId(input.serviceOrderId));

    if (!reservation) {
      this.logger.warn(
        `nada a liberar serviceOrderId=${input.serviceOrderId}`,
      );
      return;
    }

    if (
      reservation.status === StockReservationStatus.RELEASED ||
      reservation.status === StockReservationStatus.CANCELLED
    ) {
      return;
    }

    if (
      reservation.status === StockReservationStatus.RESERVED ||
      reservation.status === StockReservationStatus.CONFIRMED
    ) {
      for (const c of reservation.consumptions) {
        try {
          await this.decreaseStock.restore(c.batchId, c.quantityConsumed);
        } catch (error) {
          this.logger.error(
            `falha ao restaurar lote ${c.batchId}: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
      }
      reservation.markReleased();
      await this.reservations.save(reservation);
      await this.events.publish({
        eventId: randomUUID(),
        type: 'stock.released',
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        producer: 'stock-service',
        payload: {
          serviceOrderId: reservation.serviceOrderId,
          reservationId: reservation.id,
          reason: input.reason,
        },
      });
      return;
    }

    if (reservation.status === StockReservationStatus.PENDING) {
      reservation.markCancelled();
      await this.reservations.save(reservation);
    }
  }
}
