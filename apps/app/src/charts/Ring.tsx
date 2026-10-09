import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { fmt } from '@personutri/shared';
import { useTheme } from '@/ui/theme';

/** Anel de progresso das calorias (vermelho acima de 105% da meta). */
export function Ring({ value, max, size = 140, caption }: { value: number; max: number; size?: number; caption?: string }) {
  const { colors } = useTheme();
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const over = max > 0 && value > max * 1.05;
  return (
    <Svg width={size} height={size} viewBox="0 0 130 130" accessibilityLabel={`${fmt(value)} de ${fmt(max)} kcal`}>
      <Circle cx="65" cy="65" r={r} fill="none" stroke={colors.surface2} strokeWidth={12} />
      <Circle
        cx="65"
        cy="65"
        r={r}
        fill="none"
        stroke={over ? colors.bad : colors.accent}
        strokeWidth={12}
        strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`}
        transform="rotate(-90 65 65)"
      />
      <SvgText x="65" y="64" textAnchor="middle" fontSize="24" fontWeight="700" fill={colors.text}>{fmt(value)}</SvgText>
      <SvgText x="65" y="81" textAnchor="middle" fontSize="10" fill={colors.muted}>{caption ?? `de ${fmt(max)} kcal`}</SvgText>
    </Svg>
  );
}
