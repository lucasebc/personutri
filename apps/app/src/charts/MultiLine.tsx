import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { fmt } from '@personutri/shared';
import { useTheme } from '@/ui/theme';
import { linear, niceTicks } from './scale';

export interface LineSeries {
  name: string;
  color: string;
  values: Array<number | null>;
  dashed?: boolean;
  dotted?: boolean;
  points?: boolean;
}

/** Linhas com eixo de peso: medido, previsto, projeção e trajetória da meta. */
export function MultiLine({
  xLabels,
  series,
  refLine,
  width = 340,
  height = 230,
}: {
  xLabels: string[];
  series: LineSeries[];
  refLine?: { value: number; label: string; color: string };
  width?: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const m = { l: 38, r: 12, t: 12, b: 26 };
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;
  const all = [...series.flatMap((s) => s.values.filter((v): v is number => v != null)), ...(refLine ? [refLine.value] : [])];
  const lo = all.length ? Math.min(...all) - 1 : 0;
  const hi = all.length ? Math.max(...all) + 1 : 1;
  const ticks = niceTicks(lo, hi, 4);
  const y = linear(ticks[0], ticks[ticks.length - 1] === ticks[0] ? ticks[0] + 1 : ticks[ticks.length - 1], m.t + ih, m.t);
  const n = Math.max(xLabels.length - 1, 1);
  const x = (i: number) => m.l + (iw * i) / n;
  const every = Math.ceil(xLabels.length / 6);
  const pathOf = (vals: Array<number | null>) =>
    vals.map((v, i) => (v == null ? null : `${i === 0 || vals[i - 1] == null ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).filter(Boolean).join(' ');
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel="Previsão de peso">
      {ticks.map((t) => (
        <Line key={t} x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} stroke={colors.border} strokeWidth={1} />
      ))}
      {ticks.map((t) => (
        <SvgText fontFamily="sans-serif" key={`l${t}`} x={m.l - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill={colors.muted}>{fmt(t, 1)}</SvgText>
      ))}
      {refLine ? (
        <>
          <Line x1={m.l} x2={width - m.r} y1={y(refLine.value)} y2={y(refLine.value)} stroke={refLine.color} strokeWidth={1.5} strokeDasharray="2 4" />
          <SvgText fontFamily="sans-serif" x={width - m.r} y={y(refLine.value) - 4} textAnchor="end" fontSize="9" fill={refLine.color}>{refLine.label}</SvgText>
        </>
      ) : null}
      {series.map((s) => {
        const d = pathOf(s.values);
        return d ? <Path key={s.name} d={d} stroke={s.color} strokeWidth={s.points ? 2.5 : 2} fill="none" strokeDasharray={s.dotted ? '2 4' : s.dashed ? '6 4' : undefined} /> : null;
      })}
      {series.flatMap((s) => (s.points ? s.values.map((v, i) => (v == null ? null : <Circle key={`${s.name}${i}`} cx={x(i)} cy={y(v)} r={3.5} fill={colors.surface} stroke={s.color} strokeWidth={2} />)) : []))}
      {xLabels.map((l, i) => (i % every === 0 ? <SvgText fontFamily="sans-serif" key={`x${i}`} x={x(i)} y={height - 8} textAnchor="middle" fontSize="9" fill={colors.muted}>{l}</SvgText> : null))}
    </Svg>
  );
}
