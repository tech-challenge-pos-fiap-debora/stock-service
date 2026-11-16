import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { awsClientOptions } from '../../../shared/infrastructure/messaging/aws-client.factory';
import { PrepareReservationFromBudgetUseCase } from '../../application/use-case/reservation/prepare-reservation-from-budget';
import { ReserveStockOnApprovalUseCase } from '../../application/use-case/reservation/reserve-stock-on-approval';
import { ConfirmReservationUseCase } from '../../application/use-case/reservation/confirm-reservation';
import { ReleaseReservationUseCase } from '../../application/use-case/reservation/release-reservation';

type IncomingEvent = {
  eventId?: string;
  type: string;
  correlationId: string;
  causationId?: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class SagaEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SagaEventsConsumer.name);
  private readonly client: SQSClient;
  private readonly queueUrl: string;
  private running = false;
  private loop?: Promise<void>;

  constructor(
    private readonly config: ConfigService,
    private readonly prepare: PrepareReservationFromBudgetUseCase,
    private readonly reserve: ReserveStockOnApprovalUseCase,
    private readonly confirm: ConfirmReservationUseCase,
    private readonly release: ReleaseReservationUseCase,
  ) {
    this.queueUrl =
      this.config.get<string>('SQS_QUEUE_URL') ||
      this.config.get<string>('SQS_STOCK_QUEUE_URL') ||
      '';
    this.client = new SQSClient(awsClientOptions(this.config));
  }

  onModuleInit(): void {
    if (!this.queueUrl) {
      this.logger.warn('SQS_QUEUE_URL ausente; consumer SNS/SQS desligado');
      return;
    }
    this.running = true;
    this.loop = this.pollLoop();
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    await this.loop;
  }

  private async pollLoop(): Promise<void> {
    while (this.running) {
      try {
        const result = await this.client.send(
          new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 5,
            WaitTimeSeconds: 10,
            MessageAttributeNames: ['All'],
          }),
        );

        for (const message of result.Messages ?? []) {
          try {
            await this.handleRaw(message.Body ?? '{}');
            if (message.ReceiptHandle) {
              await this.client.send(
                new DeleteMessageCommand({
                  QueueUrl: this.queueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                }),
              );
            }
          } catch (error) {
            this.logger.error(
              `falha ao processar mensagem: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `erro no poll SQS: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  async handleRaw(body: string): Promise<void> {
    const parsed = JSON.parse(body) as IncomingEvent | { Message?: string };
    const event: IncomingEvent =
      'Message' in parsed && parsed.Message
        ? (JSON.parse(parsed.Message) as IncomingEvent)
        : (parsed as IncomingEvent);
    await this.dispatch(event);
  }

  private async dispatch(event: IncomingEvent): Promise<void> {
    this.logger.log(
      `consume type=${event.type} correlationId=${event.correlationId} eventId=${event.eventId}`,
    );

    switch (event.type) {
      case 'billing.budget.generated': {
        const payload = event.payload as {
          serviceOrderId: string;
          items: Array<{
            type: string;
            referenceId: string;
            description?: string;
            quantity: number;
          }>;
        };
        await this.prepare.execute({
          serviceOrderId: payload.serviceOrderId,
          items: payload.items ?? [],
        });
        break;
      }
      case 'order.budget.approved': {
        const payload = event.payload as { serviceOrderId: string };
        await this.reserve.execute({
          serviceOrderId: payload.serviceOrderId,
          correlationId: event.correlationId,
          causationId: event.eventId,
        });
        break;
      }
      case 'billing.payment.confirmed': {
        const payload = event.payload as { serviceOrderId: string };
        await this.confirm.execute(payload.serviceOrderId);
        break;
      }
      case 'order.cancelled':
      case 'order.budget.rejected':
      case 'billing.payment.failed': {
        const payload = event.payload as {
          serviceOrderId: string;
          reason?: string;
        };
        await this.release.execute({
          serviceOrderId: payload.serviceOrderId,
          correlationId: event.correlationId,
          causationId: event.eventId,
          reason: payload.reason,
        });
        break;
      }
      default:
        this.logger.debug(`evento ignorado type=${event.type}`);
    }
  }
}
