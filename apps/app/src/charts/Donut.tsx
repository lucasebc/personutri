import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/ui/theme';

export interface Slice {
  value: number;
  color: string;
}

/** Rosca de distribuição (fatias em % do total). */
export function Donut({ slices, size = 130, thickness = 18 }: { slices: Slice[]; size?: number; thickness?: number }) {
  const { colors } = useTheme();
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let offset = 0;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.surface2} strokeWidth={thickness} />
      {total > 0 &&
        slices.map((s, i) => {
          const len = (s.value / total) * c;
          const el = (
            <Circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return el;
        })}
    </Svg>
  );
}
