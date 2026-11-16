import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EVENT_PUBLISHER } from '../../domain/ports/event-publisher.port';
import { NoopEventPublisher } from './noop-event.publisher';
import { SnsEventPublisher } from './sns-event.publisher';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    NoopEventPublisher,
    SnsEventPublisher,
    {
      provide: EVENT_PUBLISHER,
      inject: [ConfigService, SnsEventPublisher, NoopEventPublisher],
      useFactory: (
        config: ConfigService,
        sns: SnsEventPublisher,
        noop: NoopEventPublisher,
      ) => {
        const topic = config.get<string>('SNS_TOPIC_ARN')?.trim();
        return topic ? sns : noop;
      },
    },
  ],
  exports: [EVENT_PUBLISHER],
})
export class MessagingModule {}
