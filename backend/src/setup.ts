import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/** Configuração compartilhada entre main.ts e os testes e2e. */
export function setupApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
  app.enableCors({
    origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(','),
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });
  // Atrás de um proxy reverso (Caddy), o IP real vem do X-Forwarded-For.
  if (process.env.TRUST_PROXY) (app as NestExpressApplication).set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
  return app;
}
