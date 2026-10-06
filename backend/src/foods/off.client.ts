import { Injectable, Logger } from '@nestjs/common';
import { MappedOffFood, mapOffProduct, OFF_FIELDS, OffProduct } from './off.mapper';

const BASE_URL = process.env.OFF_BASE_URL || 'https://world.openfoodfacts.org';
const TIMEOUT_MS = Number(process.env.OFF_TIMEOUT_MS || 10_000);
const CACHE_TTL_MS = 10 * 60 * 1000;

/** O Open Food Facts exige um User-Agent identificando o app. */
const USER_AGENT = process.env.OFF_USER_AGENT || 'PersoNutri/0.1 (https://github.com/lucasebc/personutri)';

export class OffUnavailableError extends Error {}

/**
 * Cliente da API pública do Open Food Facts (https://world.openfoodfacts.org).
 * - Busca por texto restrita a produtos vendidos no Brasil (`countries=brazil`).
 * - Busca por código de barras (EAN/GTIN) via API v2.
 * Limites do serviço: ~10 buscas/min e ~100 consultas de produto/min por IP, por isso
 * as respostas ficam em cache em memória por 10 minutos.
 */
@Injectable()
export class OffClient {
  private readonly logger = new Logger(OffClient.name);
  private readonly cache = new Map<string, { at: number; value: unknown }>();

  async search(query: string, pageSize = 20): Promise<MappedOffFood[]> {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: String(pageSize),
      fields: OFF_FIELDS,
      sort_by: 'unique_scans_n', // mais populares primeiro
      tagtype_0: 'countries',
      tag_contains_0: 'contains',
      tag_0: 'brazil',
    });
    const body = await this.get<{ products?: OffProduct[] }>(`/cgi/search.pl?${params}`);
    return (body.products ?? []).map(mapOffProduct).filter((f): f is MappedOffFood => f !== null);
  }

  async byBarcode(barcode: string): Promise<MappedOffFood | null> {
    const code = barcode.replace(/\D/g, '');
    const body = await this.get<{ status?: number; product?: OffProduct }>(
      `/api/v2/product/${code}.json?fields=${OFF_FIELDS}`,
    );
    if (body.status === 0 || !body.product) return null;
    return mapOffProduct({ ...body.product, code: body.product.code ?? code });
  }

  private async get<T>(path: string): Promise<T> {
    const hit = this.cache.get(path);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      this.logger.warn(`Open Food Facts inacessível: ${(err as Error).message}`);
      throw new OffUnavailableError('Não foi possível consultar o Open Food Facts agora.');
    }
    if (res.status === 404) return { status: 0 } as T; // produto inexistente
    if (!res.ok) {
      this.logger.warn(`Open Food Facts respondeu HTTP ${res.status} para ${path}`);
      throw new OffUnavailableError(`Open Food Facts respondeu HTTP ${res.status}.`);
    }
    const value = (await res.json()) as T;
    if (this.cache.size > 200) this.cache.clear();
    this.cache.set(path, { at: Date.now(), value });
    return value;
  }
}
