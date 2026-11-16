'use strict';

/**
 * Configuração do agente APM do stock-service.
 * Carregado antes do bootstrap por `node -r newrelic dist/main.js`.
 */
exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME || 'stock-service'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,

  // Labels para filtrar este microsserviço no New Relic (NRQL / UI).
  labels:
    process.env.NEW_RELIC_LABELS ||
    'service:stock-service;component:stock',

  agent_enabled:
    Boolean(process.env.NEW_RELIC_LICENSE_KEY) &&
    process.env.NEW_RELIC_ENABLED !== 'false',

  distributed_tracing: {
    enabled: true,
  },

  logging: {
    level: process.env.NEW_RELIC_LOG_LEVEL || 'info',
    filepath: 'stdout',
  },

  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true,
      max_samples_stored: 10000,
    },
    local_decorating: {
      enabled: false,
    },
    metrics: {
      enabled: true,
    },
  },

  transaction_tracer: {
    enabled: true,
    record_sql: 'obfuscated',
  },

  error_collector: {
    enabled: true,
    ignore_status_codes: [400, 401, 403, 404, 409],
  },

  attributes: {
    exclude: [
      'request.headers.authorization',
      'request.headers.cookie',
      'request.headers.x-api-key',
      'request.body.password',
      'request.body.cpf',
      'request.body.document',
    ],
  },
};
