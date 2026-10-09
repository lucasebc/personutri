import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { fmt } from '@personutri/shared';
import { useTheme } from '@/ui/theme';
import { linear, niceTicks } from './scale';

export interface BarLinePoint {
  label: string;
  bar: number;
  tdee: number | null;
  target: number | null;
}

/** Consumo diário (barras) × gasto (linha) × meta (tracejada). */
export function BarsLines({ data, width = 340, height = 210 }: { data: BarLinePoint[]; width?: number; height?: number }) {
  const { colors } = useTheme();
  const m = { l: 38, r: 8, t: 10, b: 26 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const maxV = Math.max(1, ...data.flatMap((d) => [d.bar, d.tdee ?? 0, d.target ?? 0]));
  const ticks = niceTicks(0, maxV * 1.05, 4);
  const top = ticks[ticks.length - 1];
  const y = linear(0, top, m.t + ih, m.t);
  const slot = iw / Math.max(data.length, 1);
  const bw = Math.min(30, slot * 0.6);
  const cx = (i: number) => m.l + slot * i + slot / 2;
  const path = (key: 'tdee' | 'target') =>
    data
      .map((d, i) => (d[key] == null ? null : `${i === 0 || data[i - 1][key] == null ? 'M' : 'L'}${cx(i).toFixed(1)},${y(d[key] as number).toFixed(1)}`))
      .filter(Boolean)
      .join(' ');
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Consumo dos últimos 7 dias">
      {ticks.map((t) => (
        <Line key={t} x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
      ))}
      {ticks.map((t) => (
        <SvgText key={`l${t}`} x={m.l - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill={colors.muted}>{fmt(t)}</SvgText>
      ))}
      {data.map((d, i) => (
        <Rect key={d.label} x={cx(i) - bw / 2} y={y(d.bar)} width={bw} height={Math.max(m.t + ih - y(d.bar), 0)} rx={4} fill={colors.accent} />
      ))}
      {path('tdee') ? <Path d={path('tdee')} stroke={colors.fat} strokeWidth={2} fill="none" /> : null}
      {path('target') ? <Path d={path('target')} stroke={colors.muted} strokeWidth={2} strokeDasharray="5 4" fill="none" /> : null}
      {data.map((d, i) => (
        <SvgText key={`x${d.label}`} x={cx(i)} y={height - 8} textAnchor="middle" fontSize="9" fill={colors.muted}>{d.label}</SvgText>
      ))}
    </Svg>
  );
}
