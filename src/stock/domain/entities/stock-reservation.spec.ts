import { StockReservation } from './stock-reservation';
import { StockReservationStatus } from './stock-reservation-status';

describe('StockReservation', () => {
  it('cria PENDING e permite reservar/confirmar/liberar', () => {
    const reservation = StockReservation.create({
      serviceOrderId: 'os-1',
      items: [{ productCode: 'OLEO', quantity: 2 }],
    });
    expect(reservation.status).toBe(StockReservationStatus.PENDING);

    reservation.markReserved([
      {
        productCode: 'OLEO',
        batchId: 'b1',
        quantityConsumed: 2,
        salePrice: 10,
      },
    ]);
    expect(reservation.status).toBe(StockReservationStatus.RESERVED);
    expect(reservation.consumptions).toHaveLength(1);

    reservation.markConfirmed();
    expect(reservation.status).toBe(StockReservationStatus.CONFIRMED);

    reservation.markReleased();
    expect(reservation.status).toBe(StockReservationStatus.RELEASED);
  });

  it('replaceItems só em PENDING/FAILED e markFailed/markCancelled', () => {
    const reservation = StockReservation.create({
      serviceOrderId: 'os-1',
      items: [{ productCode: 'A', quantity: 1 }],
    });
    reservation.replaceItems([{ productCode: 'B', quantity: 3 }]);
    expect(reservation.items[0].productCode).toBe('B');

    reservation.markFailed('sem estoque');
    expect(reservation.status).toBe(StockReservationStatus.FAILED);
    expect(reservation.failureReason).toBe('sem estoque');

    reservation.replaceItems([{ productCode: 'C', quantity: 1 }]);
    expect(reservation.status).toBe(StockReservationStatus.PENDING);

    reservation.markCancelled();
    expect(reservation.status).toBe(StockReservationStatus.CANCELLED);
    expect(() =>
      reservation.replaceItems([{ productCode: 'D', quantity: 1 }]),
    ).toThrow(/Cannot replace/);
  });

  it('restore preserva id e props', () => {
    const now = new Date();
    const restored = StockReservation.restore(
      {
        serviceOrderId: 'os-9',
        status: StockReservationStatus.RESERVED,
        items: [{ productCode: 'X', quantity: 1 }],
        consumptions: [],
        createdAt: now,
        updatedAt: now,
      },
      'fixed-id',
    );
    expect(restored.id).toBe('fixed-id');
    expect(restored.serviceOrderId).toBe('os-9');
  });
});
