import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserRole } from '../../../src/stock/domain/entities/user-role';
import {
  bootstrapIntegrationApp,
  shutdownIntegrationApp,
  signRoleToken,
} from '../helpers/integration-app';

describe('Stock — produtos e lotes (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapIntegrationApp();
  }, 120_000);

  afterAll(async () => {
    await shutdownIntegrationApp(app);
  });

  it('estoquista: POST /product e POST /product-batch', async () => {
    const token = signRoleToken(app, UserRole.ESTOQUISTA);
    const auth = { Authorization: `Bearer ${token}` };
    const json = { 'Content-Type': 'application/json' };
    const suffix = Date.now();
    const productCode = `STK-${suffix}`;

    const productRes = await request(app.getHttpServer())
      .post('/product')
      .set(auth)
      .set(json)
      .send({
        code: productCode,
        name: 'Peça teste estoquista',
        description: 'Integração',
      });
    expect([200, 201]).toContain(productRes.status);

    const batchRes = await request(app.getHttpServer())
      .post('/product-batch')
      .set(auth)
      .set(json)
      .send({
        name: 'Lote teste',
        productCode,
        quantity: 10,
        costPrice: 2,
        salePrice: 5,
      });
    expect([200, 201]).toContain(batchRes.status);
  });

  it('atendente: POST /product retorna 403', async () => {
    const token = signRoleToken(app, UserRole.ATENDENTE);
    const res = await request(app.getHttpServer())
      .post('/product')
      .set({ Authorization: `Bearer ${token}` })
      .set({ 'Content-Type': 'application/json' })
      .send({
        code: `FORBIDDEN-${Date.now()}`,
        name: 'Sem permissão',
      });
    expect(res.status).toBe(403);
  });
});
