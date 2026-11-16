import { Injectable } from '@nestjs/common';
import newrelic from 'newrelic';
import type {
  BusinessEventType,
  TelemetryAttributes,
  TelemetryPort,
} from '../../domain/ports/telemetry.port';
import { SERVICE_TELEMETRY_ATTRIBUTES } from './service-identity';

/**
 * Telemetria sobre o agente APM. Todo evento/erro leva o carimbo do
 * stock-service para isolamento no New Relic.
 */
@Injectable()
export class NewRelicTelemetryAdapter implements TelemetryPort {
  recordEvent(type: BusinessEventType, attributes: TelemetryAttributes): void {
    const { traceId } = newrelic.getTraceMetadata();

    newrelic.recordCustomEvent(type, {
      ...SERVICE_TELEMETRY_ATTRIBUTES,
      ...attributes,
      ...(traceId ? { traceId } : {}),
    });
  }

  recordError(error: Error, attributes: TelemetryAttributes = {}): void {
    newrelic.noticeError(error, {
      ...SERVICE_TELEMETRY_ATTRIBUTES,
      ...attributes,
    });
  }

  addTransactionAttribute(key: string, value: string | number | boolean): void {
    newrelic.addCustomAttribute(key, value);
  }
}
