import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import type { TelemetryPort } from '../../domain/ports/telemetry.port';
import {
  SERVICE_NAME,
  SERVICE_TELEMETRY_ATTRIBUTES,
} from './service-identity';

export const CORRELATION_ID_HEADER = 'x-request-id';

/**
 * Logs em JSON com identificador de correlação e carimbo fixo do stock-service,
 * para filtrar no New Relic / Fluent Bit só o que saiu deste microsserviço.
 */
export function buildLoggerOptions(telemetry: TelemetryPort): Params {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  return {
    pinoHttp: {
      level:
        process.env.LOG_LEVEL ||
        (isTest ? 'silent' : isProduction ? 'info' : 'debug'),

      messageKey: 'message',
      formatters: {
        level: (label) => ({ level: label }),
      },

      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const received = req.headers[CORRELATION_ID_HEADER];
        const correlationId =
          typeof received === 'string' && received.trim()
            ? received.trim()
            : randomUUID();

        res.setHeader(CORRELATION_ID_HEADER, correlationId);
        telemetry.addTransactionAttribute('correlationId', correlationId);
        telemetry.addTransactionAttribute('service', SERVICE_NAME);
        telemetry.addTransactionAttribute('service.name', SERVICE_NAME);

        return correlationId;
      },

      customProps: (req) => ({
        correlationId: req.id,
        ...SERVICE_TELEMETRY_ATTRIBUTES,
      }),

      autoLogging: {
        ignore: (req: IncomingMessage) => (req.url || '').startsWith('/health'),
      },

      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },

      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'res.headers["set-cookie"]',
        ],
        remove: true,
      },

      transport:
        isProduction || isTest
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname',
              },
            },
    },
  };
}
