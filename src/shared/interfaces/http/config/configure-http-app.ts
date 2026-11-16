import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SWAGGER_JWT_AUTH } from '../../../../stock/interfaces/http/auth/decorators/auth-roles.decorator';
import { SERVICE_NAME } from '../../../infrastructure/observability/service-identity';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';

/** ALB path /stock/... → rotas Nest sem o prefixo. Probes batem /health direto no pod. */
function applyHttpPathPrefix(app: INestApplication): void {
  const raw = (process.env.HTTP_PATH_PREFIX || '').trim();
  if (!raw) return;
  const prefix = raw.replace(/\/$/, '');
  if (!prefix.startsWith('/')) return;
  app.use((req: { url?: string }, _res: unknown, next: () => void) => {
    const url = req.url || '';
    if (url === prefix || url.startsWith(`${prefix}/`)) {
      req.url = url.slice(prefix.length) || '/';
    }
    next();
  });
}

export function configureHttpApp(app: INestApplication): void {
  applyHttpPathPrefix(app);

  const config = new DocumentBuilder()
    .setTitle('Stock Service')
    .setDescription(
      [
        `${SERVICE_NAME}: catálogo de produtos, lotes e cotação FIFO para a oficina.`,
        '',
        '## Autenticação',
        'JWT do identity-service nas rotas de produto/lote. Endpoints `/stock/*` são integração interna (billing/saga).',
        '',
        '## Saga (coreografia SNS/SQS)',
        '- Consome `billing.budget.generated` e `order.budget.approved` para reservar estoque.',
        '- Publica `stock.reserved` ou `stock.reservation.failed`.',
        '- Em cancelamento/falha de pagamento, libera lotes (`stock.released`).',
        '',
        '## Integração síncrona',
        '- `POST /stock/quote` — custo FIFO (usado pelo billing ao gerar orçamento).',
        '- `POST /stock/availability` — disponibilidade agregada.',
        '- `POST /stock/decrease` — baixa direta (lab/legado).',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(undefined, SWAGGER_JWT_AUTH)
    .addTag('Estoque / Produtos', 'CRUD de produtos')
    .addTag('Estoque / Lotes', 'Entrada e consulta de lotes')
    .addTag('Estoque / Integração', 'Quote/availability/decrease para billing e saga')
    .addTag('Health', 'Liveness e readiness')
    .build();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.useGlobalFilters(new DomainExceptionFilter());

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
}
