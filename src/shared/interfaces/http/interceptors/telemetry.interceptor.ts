import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DomainError } from '../../../domain/errors';
import {
  TELEMETRY,
  type TelemetryPort,
} from '../../../domain/ports/telemetry.port';
import { SERVICE_NAME } from '../../../infrastructure/observability/service-identity';

/**
 * Falhas inesperadas (infra, timeout, bug) viram IntegrationFailureEvent
 * carimbadas com service=stock-service.
 */
@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  constructor(
    @Inject(TELEMETRY)
    private readonly telemetry: TelemetryPort,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const operation = `${context.getClass().name}.${context.getHandler().name}`;

    return next.handle().pipe(
      catchError((error: unknown) => {
        if (this.isUnexpected(error)) {
          const failure =
            error instanceof Error ? error : new Error(String(error));

          this.telemetry.recordEvent('IntegrationFailureEvent', {
            service: SERVICE_NAME,
            operation,
            errorType: failure.name,
            message: failure.message,
          });
          this.telemetry.recordError(failure, {
            service: SERVICE_NAME,
            operation,
          });
        }

        return throwError(() => error);
      }),
    );
  }

  private isUnexpected(error: unknown): boolean {
    return !(error instanceof DomainError) && !(error instanceof HttpException);
  }
}
