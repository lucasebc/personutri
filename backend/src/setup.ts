import { INestApplication, ValidationPipe } from '@nestjs/common';

/** Configuração compartilhada entre main.ts e os testes e2e. */
export function setupApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
  app.enableCors({ origin: (process.env.FRONTEND_ORIGIN || 'http://localhost:3000').split(',') });
  return app;
}
