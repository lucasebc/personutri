import { Controller, Get } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { Public } from './public.decorator';

@Controller()
export class AuthController {
  constructor(private readonly guard: AuthGuard) {}

  /** Sem autenticação: usado por monitoramento e pelos apps para saber se precisam de token. */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', time: new Date().toISOString(), authRequired: this.guard.required };
  }

  /** Valida o token informado (o guard já recusou se estiver errado). */
  @Get('auth/check')
  check() {
    return { ok: true };
  }
}
