import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { IS_PUBLIC } from './public.decorator';

const FAIL_WINDOW_MS = 60_000;
const FAIL_LIMIT = 20;

const digest = (s: string) => createHash('sha256').update(s).digest();

/** Lista de tokens aceitos: `API_TOKENS=token1,token2` (um por dispositivo). */
export function configuredTokens(env = process.env): string[] {
  return (env.API_TOKENS ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Autenticação por token Bearer (app de usuário único). Sem `API_TOKENS` a API fica aberta
 * (desenvolvimento local); em produção a API se recusa a subir sem tokens.
 */
@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(AuthGuard.name);
  private tokens: Buffer[] = [];
  private fails = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  onModuleInit() {
    const raw = configuredTokens();
    if (raw.some((t) => t.length < 16)) {
      throw new Error('API_TOKENS: cada token precisa ter pelo menos 16 caracteres (use `openssl rand -hex 24`).');
    }
    if (!raw.length && process.env.NODE_ENV === 'production') {
      throw new Error('API_TOKENS é obrigatório em produção.');
    }
    if (!raw.length) this.logger.warn('API_TOKENS não definido: a API está ABERTA (use só em desenvolvimento local).');
    this.tokens = raw.map(digest);
  }

  /** Há autenticação configurada? (informado em /health para o app saber se pede o token) */
  get required(): boolean {
    return this.tokens.length > 0;
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.required) return true;
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip ?? 'unknown';
    const now = Date.now();
    const entry = this.fails.get(ip);
    if (entry && entry.resetAt > now && entry.count >= FAIL_LIMIT) {
      throw new HttpException('Muitas tentativas inválidas. Aguarde um minuto.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const header = req.headers.authorization ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(header);
    if (match) {
      const given = digest(match[1].trim());
      // percorre todos para não vazar, pelo tempo, qual token acertou
      let ok = false;
      for (const t of this.tokens) ok = timingSafeEqual(t, given) || ok;
      if (ok) return true;
    }

    const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + FAIL_WINDOW_MS };
    current.count++;
    this.fails.set(ip, current);
    if (this.fails.size > 1000) this.fails.clear();
    throw new UnauthorizedException('Token inválido ou ausente.');
  }
}
