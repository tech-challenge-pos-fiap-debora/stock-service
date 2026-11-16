import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { SERVICE_NAME } from '../../../infrastructure/observability/service-identity';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
  ) {}

  @Get('live')
  @HealthCheck()
  @ApiOperation({
    summary: 'Liveness probe',
    description: `Indica se o processo do ${SERVICE_NAME} está em execução.`,
  })
  async live() {
    const result = await this.health.check([]);
    return { ...result, service: SERVICE_NAME };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description: `Indica se o ${SERVICE_NAME} está pronto (PostgreSQL stock acessível).`,
  })
  async ready() {
    const result = await this.health.check([
      () => this.database.pingCheck('database'),
    ]);
    return { ...result, service: SERVICE_NAME };
  }
}
