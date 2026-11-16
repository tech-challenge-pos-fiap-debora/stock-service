import { ConfigService } from '@nestjs/config';
import { SNSClient } from '@aws-sdk/client-sns';
import { SnsEventPublisher } from './sns-event.publisher';

function configWith(values: Record<string, string | undefined>): ConfigService {
  return { get: (key: string) => values[key] } as ConfigService;
}

const event = {
  eventId: 'evt-1',
  type: 'stock.reserved',
  correlationId: 'os-1',
  occurredAt: new Date().toISOString(),
  payload: { serviceOrderId: 'os-1', reservationId: 'r-1' },
};

describe('SnsEventPublisher', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('não publica sem SNS_TOPIC_ARN', async () => {
    const send = jest.spyOn(SNSClient.prototype, 'send').mockResolvedValue({} as never);
    const publisher = new SnsEventPublisher(configWith({}));
    await publisher.publish(event);
    expect(send).not.toHaveBeenCalled();
  });

  it('publica em todos os endpoints do fan-out', async () => {
    const send = jest.spyOn(SNSClient.prototype, 'send').mockResolvedValue({} as never);
    const publisher = new SnsEventPublisher(
      configWith({
        SNS_TOPIC_ARN: 'arn:aws:sns:us-east-1:000000000000:oficina-domain-events',
        SNS_FANOUT_ENDPOINTS:
          'http://order-localstack:4566,http://stock-localstack:4566,http://billing-localstack:4566',
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test',
        AWS_SECRET_ACCESS_KEY: 'test',
      }),
    );
    await publisher.publish(event);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('falha se todos os endpoints rejeitam', async () => {
    jest
      .spyOn(SNSClient.prototype, 'send')
      .mockRejectedValue(new Error('boom'));
    const publisher = new SnsEventPublisher(
      configWith({
        SNS_TOPIC_ARN: 'arn:aws:sns:us-east-1:000000000000:oficina-domain-events',
        AWS_ENDPOINT_URL: 'http://localhost:4566',
      }),
    );
    await expect(publisher.publish(event)).rejects.toThrow(/falhou em todos/);
  });
});
