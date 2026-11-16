export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export type PublishableEvent = {
  eventId: string;
  type: string;
  correlationId: string;
  [key: string]: unknown;
};

export interface EventPublisherPort {
  publish(event: PublishableEvent): Promise<void>;
}
