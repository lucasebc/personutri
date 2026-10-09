import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('paridade com packages/shared', () => {
  it('a calculadora de calorias do app é cópia fiel da do backend', () => {
    const original = readFileSync(join(__dirname, 'calories.ts'), 'utf8');
    const copy = readFileSync(join(__dirname, '../../../packages/shared/src/calories.ts'), 'utf8');
    // a cópia só difere pelo comentário de cabeçalho
    expect(copy.split('\n').slice(2).join('\n')).toBe(original);
  });
});
