import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SWAGGER_JWT_AUTH } from '../../../../stock/interfaces/http/auth/decorators/auth-roles.decorator';
import { SERVICE_NAME } from '../../../infrastructure/observability/service-identity';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';

export function configureHttpApp(app: INestApplication): void {
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
