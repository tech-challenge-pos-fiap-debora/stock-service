import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  StockReservation,
  type ReservationConsumption,
  type ReservationItem,
} from '../../../../../stock/domain/entities/stock-reservation';
import { StockReservationStatus } from '../../../../../stock/domain/entities/stock-reservation-status';
import type { StockReservationRepositoryInterface } from '../../../../../stock/domain/repositories/stock-reservation.repository';
import { StockReservationEntity } from '../entities/stock-reservation.entity';

@Injectable()
export class TypeormStockReservationRepository
  implements StockReservationRepositoryInterface
{
  constructor(
    @InjectRepository(StockReservationEntity)
    private readonly repo: Repository<StockReservationEntity>,
  ) {}

  private toDomain(row: StockReservationEntity): StockReservation {
    return StockReservation.restore(
      {
        serviceOrderId: row.serviceOrderId,
        status: row.status as StockReservationStatus,
        items: (row.items as ReservationItem[]) ?? [],
        consumptions: (row.consumptions as ReservationConsumption[]) ?? [],
        failureReason: row.failureReason ?? undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.id,
    );
  }

  private toRow(data: StockReservation): Partial<StockReservationEntity> {
    return {
      id: data.id,
      serviceOrderId: data.serviceOrderId,
      status: data.status,
      items: data.items,
      consumptions: data.consumptions,
      failureReason: data.failureReason ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async create(data: StockReservation): Promise<StockReservation> {
    const saved = await this.repo.save(this.repo.create(this.toRow(data)));
    return this.toDomain(saved);
  }

  async save(data: StockReservation): Promise<StockReservation> {
    const saved = await this.repo.save(this.toRow(data));
    return this.toDomain(saved as StockReservationEntity);
  }

  async findById(id: string): Promise<StockReservation | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findActiveByServiceOrderId(
    serviceOrderId: string,
  ): Promise<StockReservation | null> {
    const row = await this.repo.findOne({
      where: {
        serviceOrderId,
        status: In([
          StockReservationStatus.PENDING,
          StockReservationStatus.RESERVED,
          StockReservationStatus.CONFIRMED,
        ]),
      },
      order: { createdAt: 'DESC' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByServiceOrderId(
    serviceOrderId: string,
  ): Promise<StockReservation | null> {
    return this.findLatestByServiceOrderId(serviceOrderId);
  }

  async findLatestByServiceOrderId(
    serviceOrderId: string,
  ): Promise<StockReservation | null> {
    const row = await this.repo.findOne({
      where: { serviceOrderId },
      order: { createdAt: 'DESC' },
    });
    return row ? this.toDomain(row) : null;
  }
}
