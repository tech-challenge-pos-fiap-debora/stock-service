import { Injectable, Logger } from '@nestjs/common';
import type {
  EventPublisherPort,
  PublishableEvent,
} from '../../domain/ports/event-publisher.port';

@Injectable()
export class NoopEventPublisher implements EventPublisherPort {
  private readonly logger = new Logger(NoopEventPublisher.name);

  async publish(event: PublishableEvent): Promise<void> {
    this.logger.log(
      `noop publish type=${event.type} correlationId=${event.correlationId} eventId=${event.eventId}`,
    );
  }
}
