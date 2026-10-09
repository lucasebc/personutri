import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Libera a rota da autenticação por token. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
