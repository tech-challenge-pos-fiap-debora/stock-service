import { Module } from '@nestjs/common';
import { MessagingModule } from '../../../shared/infrastructure/messaging/messaging.module';
import { PrepareReservationFromBudgetUseCase } from '../../application/use-case/reservation/prepare-reservation-from-budget';
import { ReserveStockOnApprovalUseCase } from '../../application/use-case/reservation/reserve-stock-on-approval';
import { ConfirmReservationUseCase } from '../../application/use-case/reservation/confirm-reservation';
import { ReleaseReservationUseCase } from '../../application/use-case/reservation/release-reservation';
import { SagaEventsConsumer } from '../../interfaces/messaging/saga-events.consumer';
import { ProductBatchModule } from './product-batch.module';
import { StockDatabaseModule } from '../database/database.module';

@Module({
  imports: [MessagingModule, StockDatabaseModule, ProductBatchModule],
  providers: [
    PrepareReservationFromBudgetUseCase,
    ReserveStockOnApprovalUseCase,
    ConfirmReservationUseCase,
    ReleaseReservationUseCase,
    SagaEventsConsumer,
  ],
})
export class MessagingConsumerModule {}
