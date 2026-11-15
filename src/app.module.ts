import { Module } from '@nestjs/common';
import { ConfigureModule } from './shared/infrastructure/configure/configure.module';
import { ObservabilityModule } from './shared/infrastructure/observability/observability.module';
import { HealthModule } from './shared/infrastructure/ioc/health.module';
import { StockModule } from './shared/infrastructure/ioc/stock.module';

@Module({
  imports: [
    ConfigureModule,
    ObservabilityModule,
    HealthModule,
    StockModule,
  ],
})
export class AppModule {}
