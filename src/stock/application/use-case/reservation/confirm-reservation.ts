import { Inject, Injectable, Logger } from '@nestjs/common';
import { StockReservationStatus } from '../../../domain/entities/stock-reservation-status';
import type { StockReservationRepositoryInterface } from '../../../domain/repositories/stock-reservation.repository';
import { STOCK_RESERVATION_REPOSITORY } from '../../../domain/repositories/tokens';

@Injectable()
export class ConfirmReservationUseCase {
  private readonly logger = new Logger(ConfirmReservationUseCase.name);

  constructor(
    @Inject(STOCK_RESERVATION_REPOSITORY)
    private readonly reservations: StockReservationRepositoryInterface,
  ) {}

  async execute(serviceOrderId: string): Promise<void> {
    const reservation = await this.reservations.findActiveByServiceOrderId(
      serviceOrderId,
    );
    if (!reservation) {
      this.logger.warn(`reserva não encontrada serviceOrderId=${serviceOrderId}`);
      return;
    }
    if (reservation.status === StockReservationStatus.CONFIRMED) return;
    if (reservation.status !== StockReservationStatus.RESERVED) {
      this.logger.warn(
        `ignore confirm status=${reservation.status} serviceOrderId=${serviceOrderId}`,
      );
      return;
    }
    reservation.markConfirmed();
    await this.reservations.save(reservation);
  }
}
