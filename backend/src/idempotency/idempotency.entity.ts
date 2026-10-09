import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** Resposta guardada de uma requisição com `Idempotency-Key` (permite reenviar a fila offline sem duplicar). */
@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar' })
  method: string;

  @Column({ type: 'varchar' })
  path: string;

  /** JSON da resposta ('' quando não há corpo). */
  @Column({ type: 'text' })
  body: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
