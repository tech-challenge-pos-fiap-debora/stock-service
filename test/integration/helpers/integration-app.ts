import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { UserRole } from '../../../src/stock/domain/entities/user-role';
import { configureHttpApp } from '../../../src/shared/interfaces/http/config/configure-http-app';
import { INTEGRATION_JWT_SECRET } from '../dev-credentials.fixture';
import { INTEGRATION_DATABASE_URL } from './database-url';

export async function bootstrapIntegrationApp(): Promise<INestApplication> {
  process.env.DATABASE_URL = INTEGRATION_DATABASE_URL;
  process.env.JWT_SECRET = INTEGRATION_JWT_SECRET;
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.NEW_RELIC_ENABLED = 'false';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureHttpApp(app);
  await app.init();
  return app;
}

export async function shutdownIntegrationApp(
  app: INestApplication,
): Promise<void> {
  await app.close();
}

/** Emite JWT no mesmo formato do identity-service (sem chamar /auth). */
export function signRoleToken(
  app: INestApplication,
  role: UserRole,
  overrides: { sub?: string; email?: string } = {},
): string {
  const jwt = app.get(JwtService);
  return jwt.sign({
    sub: overrides.sub ?? '00000000-0000-4000-8000-000000000001',
    email: overrides.email ?? `integration-${role}@test.dev`,
    role,
  });
}
