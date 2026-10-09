import { CallHandler, ExecutionContext, Injectable, NestInterceptor, OnModuleInit, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { from, Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { LessThan, Repository } from 'typeorm';
import { IdempotencyKey } from './idempotency.entity';

const RETENTION_MS = 14 * 24 * 3600 * 1000;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Se a requisição traz `Idempotency-Key` e já foi atendida, devolve a mesma resposta sem executar de novo.
 * Só respostas de sucesso são guardadas: um erro pode ser corrigido e reenviado com a mesma chave.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor, OnModuleInit {
  constructor(@InjectRepository(IdempotencyKey) private readonly repo: Repository<IdempotencyKey>) {}

  async onModuleInit() {
    await this.repo.delete({ createdAt: LessThan(new Date(Date.now() - RETENTION_MS)) });
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<Request>();
    const key = req.header('idempotency-key')?.trim();
    if (!key || key.length > 100 || !MUTATING.has(req.method)) return next.handle();

    const path = req.originalUrl.split('?')[0];
    const hit = await this.repo.findOneBy({ key });
    if (hit) {
      if (hit.method !== req.method || hit.path !== path) {
        throw new UnprocessableEntityException('Idempotency-Key já usada em outra requisição.');
      }
      return of(hit.body ? JSON.parse(hit.body) : undefined);
    }

    return next.handle().pipe(
      mergeMap((body) =>
        from(
          this.repo
            .save({ key, method: req.method, path, body: body === undefined ? '' : JSON.stringify(body) })
            .catch(() => undefined) // corrida com a mesma chave: a outra requisição já gravou
            .then(() => body),
        ),
      ),
    );
  }
}
