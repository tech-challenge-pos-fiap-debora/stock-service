import { StockReservation } from '../../../domain/entities/stock-reservation';
import { StockReservationStatus } from '../../../domain/entities/stock-reservation-status';
import type { StockReservationRepositoryInterface } from '../../../domain/repositories/stock-reservation.repository';
import { ConfirmReservationUseCase } from './confirm-reservation';
import { PrepareReservationFromBudgetUseCase } from './prepare-reservation-from-budget';
import { ReleaseReservationUseCase } from './release-reservation';
import { ReserveStockOnApprovalUseCase } from './reserve-stock-on-approval';

function memoryReservations(
  initial: StockReservation[] = [],
): StockReservationRepositoryInterface & {
  store: Map<string, StockReservation>;
} {
  const store = new Map(initial.map((r) => [r.id, r]));
  return {
    store,
    async create(r) {
      store.set(r.id, r);
      return r;
    },
    async save(r) {
      store.set(r.id, r);
      return r;
    },
    async findById(id) {
      return store.get(id) ?? null;
    },
    async findActiveByServiceOrderId(serviceOrderId) {
      const active = [
        StockReservationStatus.PENDING,
        StockReservationStatus.RESERVED,
        StockReservationStatus.CONFIRMED,
      ];
      return (
        [...store.values()].find(
          (r) =>
            r.serviceOrderId === serviceOrderId && active.includes(r.status),
        ) ?? null
      );
    },
    async findByServiceOrderId(serviceOrderId) {
      return (
        [...store.values()].find((r) => r.serviceOrderId === serviceOrderId) ??
        null
      );
    },
    async findLatestByServiceOrderId(serviceOrderId) {
      const list = [...store.values()].filter(
        (r) => r.serviceOrderId === serviceOrderId,
      );
      return list[list.length - 1] ?? null;
    },
  };
}

describe('reservation use cases', () => {
  it('prepara reserva agregando PART e republica itens se PENDING', async () => {
    const repo = memoryReservations();
    const useCase = new PrepareReservationFromBudgetUseCase(repo);
    const created = await useCase.execute({
      serviceOrderId: 'os-1',
      items: [
        { type: 'PART', referenceId: 'oleo', quantity: 1 },
        { type: 'PART', referenceId: 'OLEO', quantity: 2 },
        { type: 'SERVICE', referenceId: 'svc', quantity: 1 },
      ],
    });
    expect(created?.items).toEqual([{ productCode: 'OLEO', quantity: 3 }]);

    const again = await useCase.execute({
      serviceOrderId: 'os-1',
      items: [{ type: 'PART', referenceId: 'FILTRO', quantity: 1 }],
    });
    expect(again?.items).toEqual([{ productCode: 'FILTRO', quantity: 1 }]);
  });

  it('reserva sem demanda publica stock.reserved vazio', async () => {
    const published: Array<{ type: string }> = [];
    const useCase = new ReserveStockOnApprovalUseCase(
      memoryReservations(),
      { execute: jest.fn(), restore: jest.fn() } as never,
      {
        async publish(e) {
          published.push(e as { type: string });
        },
      },
    );
    await useCase.execute({ serviceOrderId: 'os-1', correlationId: 'os-1' });
    expect(published[0]?.type).toBe('stock.reserved');
  });

  it('reserva PENDING consumindo estoque e publica stock.reserved', async () => {
    const reservation = StockReservation.create({
      serviceOrderId: 'os-2',
      items: [{ productCode: 'OLEO', quantity: 2 }],
    });
    const published: Array<{ type: string }> = [];
    const decrease = {
      execute: jest.fn().mockResolvedValue({
        consumptions: [
          {
            batchId: 'b1',
            quantityConsumed: 2,
            salePrice: 10,
          },
        ],
      }),
      restore: jest.fn(),
    };
    const useCase = new ReserveStockOnApprovalUseCase(
      memoryReservations([reservation]),
      decrease as never,
      {
        async publish(e) {
          published.push(e as { type: string });
        },
      },
    );
    await useCase.execute({ serviceOrderId: 'os-2', correlationId: 'os-2' });
    expect(reservation.status).toBe(StockReservationStatus.RESERVED);
    expect(published[0]?.type).toBe('stock.reserved');
    expect(decrease.execute).toHaveBeenCalledWith('OLEO', 2);
  });

  it('em falha de estoque faz rollback e publica stock.reservation.failed', async () => {
    const reservation = StockReservation.create({
      serviceOrderId: 'os-3',
      items: [{ productCode: 'OLEO', quantity: 2 }],
    });
    const published: Array<{ type: string }> = [];
    const decrease = {
      execute: jest.fn().mockRejectedValue(new Error('sem estoque')),
      restore: jest.fn(),
    };
    const useCase = new ReserveStockOnApprovalUseCase(
      memoryReservations([reservation]),
      decrease as never,
      {
        async publish(e) {
          published.push(e as { type: string });
        },
      },
    );
    await useCase.execute({ serviceOrderId: 'os-3', correlationId: 'os-3' });
    expect(reservation.status).toBe(StockReservationStatus.FAILED);
    expect(published[0]?.type).toBe('stock.reservation.failed');
  });

  it('confirma reserva RESERVED', async () => {
    const reservation = StockReservation.create({
      serviceOrderId: 'os-4',
      items: [],
    });
    reservation.markReserved([]);
    const useCase = new ConfirmReservationUseCase(
      memoryReservations([reservation]),
    );
    await useCase.execute('os-4');
    expect(reservation.status).toBe(StockReservationStatus.CONFIRMED);
    await useCase.execute('missing');
  });

  it('libera reserva RESERVED e cancela PENDING', async () => {
    const reserved = StockReservation.create({
      serviceOrderId: 'os-5',
      items: [{ productCode: 'OLEO', quantity: 1 }],
    });
    reserved.markReserved([
      {
        productCode: 'OLEO',
        batchId: 'b1',
        quantityConsumed: 1,
        salePrice: 5,
      },
    ]);
    const pending = StockReservation.create({
      serviceOrderId: 'os-6',
      items: [{ productCode: 'X', quantity: 1 }],
    });
    const published: Array<{ type: string }> = [];
    const decrease = { execute: jest.fn(), restore: jest.fn() };
    const releaseReserved = new ReleaseReservationUseCase(
      memoryReservations([reserved]),
      decrease as never,
      {
        async publish(e) {
          published.push(e as { type: string });
        },
      },
    );
    await releaseReserved.execute({
      serviceOrderId: 'os-5',
      correlationId: 'os-5',
      reason: 'cancelado',
    });
    expect(reserved.status).toBe(StockReservationStatus.RELEASED);
    expect(decrease.restore).toHaveBeenCalledWith('b1', 1);
    expect(published[0]?.type).toBe('stock.released');

    const releasePending = new ReleaseReservationUseCase(
      memoryReservations([pending]),
      decrease as never,
      { async publish() {} },
    );
    await releasePending.execute({
      serviceOrderId: 'os-6',
      correlationId: 'os-6',
    });
    expect(pending.status).toBe(StockReservationStatus.CANCELLED);
  });
});
