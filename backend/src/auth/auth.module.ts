import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';

@Module({
  imports: [
    // Limite geral por IP; folgado para o uso normal e para a fila offline do app.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: Number(process.env.RATE_LIMIT_PER_MIN || 600) }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // useExisting: o AuthGuard singleton é o mesmo usado pelo controller (`required`).
    { provide: APP_GUARD, useExisting: AuthGuard },
  ],
})
export class AuthModule {}
