import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type {
  EventPublisherPort,
  PublishableEvent,
} from '../../domain/ports/event-publisher.port';
import { awsClientOptions } from './aws-client.factory';

/**
 * Em lab com 1 LocalStack por domínio, publica no SNS de cada endpoint
 * (`SNS_FANOUT_ENDPOINTS`). Cada broker só tem a fila do próprio domínio.
 */
@Injectable()
export class SnsEventPublisher implements EventPublisherPort {
  private readonly logger = new Logger(SnsEventPublisher.name);
  private readonly clients: SNSClient[];
  private readonly topicArn: string;

  constructor(config: ConfigService) {
    this.topicArn = config.get<string>('SNS_TOPIC_ARN') || '';
    const base = awsClientOptions(config);
    const fanout = (config.get<string>('SNS_FANOUT_ENDPOINTS') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const own = config.get<string>('AWS_ENDPOINT_URL')?.trim();
    const endpoints = fanout.length > 0 ? fanout : own ? [own] : [];

    this.clients =
      endpoints.length > 0
        ? endpoints.map(
            (endpoint) => new SNSClient({ ...base, endpoint }),
          )
        : [new SNSClient(base)];
  }

  async publish(event: PublishableEvent): Promise<void> {
    if (!this.topicArn) {
      this.logger.warn(
        `SNS_TOPIC_ARN ausente; evento não publicado type=${event.type}`,
      );
      return;
    }

    const input = {
      TopicArn: this.topicArn,
      Message: JSON.stringify(event),
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: event.type,
        },
        correlationId: {
          DataType: 'String',
          StringValue: event.correlationId,
        },
      },
    };

    const results = await Promise.allSettled(
      this.clients.map((client) => client.send(new PublishCommand(input))),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const fail = results.length - ok;

    if (ok === 0) {
      const reason =
        results.find((r) => r.status === 'rejected')?.reason ?? 'unknown';
      throw new Error(
        `SNS publish falhou em todos os endpoints type=${event.type}: ${String(reason)}`,
      );
    }

    if (fail > 0) {
      this.logger.warn(
        `published parcial ${ok}/${results.length} type=${event.type} correlationId=${event.correlationId}`,
      );
      return;
    }

    this.logger.log(
      `published type=${event.type} correlationId=${event.correlationId} eventId=${event.eventId} endpoints=${ok}`,
    );
  }
}
