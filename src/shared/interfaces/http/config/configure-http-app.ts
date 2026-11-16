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
      `${SERVICE_NAME}: produtos e lotes (estoque) da oficina.`,
    )
    .setVersion('1.0.0')
    .addBearerAuth(undefined, SWAGGER_JWT_AUTH)
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
