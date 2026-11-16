import type { ConfigService } from '@nestjs/config';

/** Credenciais/endpoint para LocalStack (lab) ou AWS real. */
export function awsClientOptions(config: ConfigService) {
  const region = config.get<string>('AWS_REGION') || 'us-east-1';
  const endpoint = config.get<string>('AWS_ENDPOINT_URL')?.trim() || undefined;
  const accessKeyId =
    config.get<string>('AWS_ACCESS_KEY_ID')?.trim() ||
    (endpoint ? 'test' : undefined);
  const secretAccessKey =
    config.get<string>('AWS_SECRET_ACCESS_KEY')?.trim() ||
    (endpoint ? 'test' : undefined);

  return {
    region,
    ...(endpoint ? { endpoint } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  };
}
