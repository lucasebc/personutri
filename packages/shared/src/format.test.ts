import { addDays, fmt, fmtSigned, formatDateLong, normalizeTime, parseDateBr, parseNumber, today } from './format';

describe('format', () => {
  it('fmt usa o padrão pt-BR e corta zeros', () => {
    expect(fmt(1234.5, 1)).toBe('1.234,5');
    expect(fmt(2000)).toBe('2.000');
    expect(fmt(7, 2)).toBe('7');
    expect(fmt(0.05, 2)).toBe('0,05');
    expect(fmt(-12.34, 1)).toBe('-12,3');
    expect(fmt(null)).toBe('—');
    expect(fmt(-0.001, 1)).toBe('0');
  });

  it('fmtSigned', () => {
    expect(fmtSigned(120)).toBe('+120');
    expect(fmtSigned(-0.46, 2)).toBe('−0,46');
    expect(fmtSigned(0)).toBe('0');
  });

  it('datas', () => {
    expect(today(new Date(2026, 9, 6, 23, 59))).toBe('2026-10-06');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(formatDateLong('2026-10-06')).toBe('terça-feira, 6 de outubro');
    expect(parseDateBr('25/12/1990')).toBe('1990-12-25');
    expect(parseDateBr('5/3/2000')).toBe('2000-03-05');
    expect(parseDateBr('31/02/2000')).toBeNull();
    expect(parseDateBr('abc')).toBeNull();
  });

  it('horas e números digitados', () => {
    expect(normalizeTime('7:5')).toBe('07:05');
    expect(normalizeTime('0705')).toBe('07:05');
    expect(normalizeTime('25:00')).toBeNull();
    expect(parseNumber('82,5')).toBe(82.5);
    expect(parseNumber('82.5')).toBe(82.5);
    expect(parseNumber('')).toBeNaN();
  });
});
