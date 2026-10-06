import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup';

async function bootstrap() {
  const app = setupApp(await NestFactory.create(AppModule));
  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(`PersoNutri API em http://localhost:${port}/api`);
}
bootstrap();
