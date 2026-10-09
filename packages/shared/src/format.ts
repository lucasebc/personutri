export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Hoje no fuso do aparelho, como YYYY-MM-DD. */
export function today(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nowTime(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const WEEKDAYS_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

/** "terça-feira, 6 de outubro" (sem depender de Intl, que varia entre motores). */
export function formatDateLong(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${WEEKDAYS_LONG[weekdayOf(date)]}, ${d} de ${MONTHS[m - 1]}`;
}

export function formatDateShort(date: string): string {
  const [, m, d] = date.split('-');
  return `${d}/${m}`;
}

export function formatDateBr(date: string): string {
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

/** "25/12/1990" → "1990-12-25" (null se inválida). */
export function parseDateBr(input: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Aceita "7:5", "0705", "07:05" e devolve "07:05" (null se inválida). */
export function normalizeTime(input: string): string | null {
  const s = input.trim();
  const m = /^(\d{1,2}):?(\d{1,2})$/.exec(s);
  if (!m) return null;
  const t = `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
  return isValidTime(t) ? t : null;
}

function group(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formato pt-BR: 1.234,5 (sem Intl). */
export function fmt(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const neg = v < 0;
  const fixed = Math.abs(v).toFixed(digits);
  const [int, frac] = fixed.split('.');
  let out = group(int);
  if (frac) {
    const trimmed = frac.replace(/0+$/, '');
    if (trimmed) out += `,${trimmed}`;
  }
  return neg && Number(fixed) !== 0 ? `-${out}` : out;
}

export function fmtSigned(v: number, digits = 0): string {
  const s = fmt(Math.abs(v), digits);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

/** "82,5" / "82.5" → 82.5 (NaN se inválido). */
export function parseNumber(input: string): number {
  const s = input.trim().replace(',', '.');
  return s === '' ? NaN : Number(s);
}
