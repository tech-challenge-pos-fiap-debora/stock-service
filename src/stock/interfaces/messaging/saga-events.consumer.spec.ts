import { ConfigService } from '@nestjs/config';
import { SagaEventsConsumer } from './saga-events.consumer';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

describe('SagaEventsConsumer (stock)', () => {
  const prepare = { execute: jest.fn() };
  const reserve = { execute: jest.fn() };
  const confirm = { execute: jest.fn() };
  const release = { execute: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function build() {
    return new SagaEventsConsumer(
      configWith({}),
      prepare as never,
      reserve as never,
      confirm as never,
      release as never,
    );
  }

  it('despacha order.budget.approved → reserve', async () => {
    const consumer = build();
    await consumer.handleRaw(
      JSON.stringify({
        type: 'order.budget.approved',
        correlationId: 'os-1',
        eventId: 'e1',
        payload: { serviceOrderId: 'os-1' },
      }),
    );
    expect(reserve.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceOrderId: 'os-1',
        correlationId: 'os-1',
        causationId: 'e1',
      }),
    );
  });

  it('despacha billing.payment.confirmed → confirm', async () => {
    const consumer = build();
    await consumer.handleRaw(
      JSON.stringify({
        Message: JSON.stringify({
          type: 'billing.payment.confirmed',
          correlationId: 'os-1',
          payload: { serviceOrderId: 'os-1' },
        }),
      }),
    );
    expect(confirm.execute).toHaveBeenCalledWith('os-1');
  });

  it('despacha order.cancelled → release', async () => {
    const consumer = build();
    await consumer.handleRaw(
      JSON.stringify({
        type: 'order.cancelled',
        correlationId: 'os-1',
        eventId: 'e3',
        payload: { serviceOrderId: 'os-1', reason: 'cliente desistiu' },
      }),
    );
    expect(release.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceOrderId: 'os-1',
        reason: 'cliente desistiu',
      }),
    );
  });

  it('despacha budget.generated, payment.failed e ignora desconhecido', async () => {
    const consumer = build();
    await consumer.handleRaw(
      JSON.stringify({
        type: 'billing.budget.generated',
        correlationId: 'os-1',
        payload: {
          serviceOrderId: 'os-1',
          items: [{ type: 'PART', referenceId: 'OLEO', quantity: 1 }],
        },
      }),
    );
    expect(prepare.execute).toHaveBeenCalledWith(
      expect.objectContaining({ serviceOrderId: 'os-1' }),
    );

    await consumer.handleRaw(
      JSON.stringify({
        type: 'billing.payment.failed',
        correlationId: 'os-1',
        payload: { serviceOrderId: 'os-1', reason: 'rejected' },
      }),
    );
    expect(release.execute).toHaveBeenCalledWith(
      expect.objectContaining({ serviceOrderId: 'os-1', reason: 'rejected' }),
    );

    await consumer.handleRaw(
      JSON.stringify({
        type: 'unknown.event',
        correlationId: 'os-1',
        payload: {},
      }),
    );
  });
});
