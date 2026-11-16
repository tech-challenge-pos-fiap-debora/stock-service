import type { StockReservation } from '../entities/stock-reservation';
import type { StockReservationStatus } from '../entities/stock-reservation-status';

export interface StockReservationRepositoryInterface {
  create(data: StockReservation): Promise<StockReservation>;
  save(data: StockReservation): Promise<StockReservation>;
  findById(id: string): Promise<StockReservation | null>;
  findActiveByServiceOrderId(
    serviceOrderId: string,
  ): Promise<StockReservation | null>;
  findByServiceOrderId(
    serviceOrderId: string,
  ): Promise<StockReservation | null>;
  findLatestByServiceOrderId(
    serviceOrderId: string,
  ): Promise<StockReservation | null>;
}

export type { StockReservationStatus };
