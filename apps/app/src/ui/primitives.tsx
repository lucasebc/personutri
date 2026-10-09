import { type ReactNode, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text as RNText, type TextProps, type TextStyle, View, type ViewStyle } from 'react-native';
import { useTheme } from './theme';

type Variant = 'title' | 'h2' | 'body' | 'bodyBold' | 'small' | 'label' | 'big';

const SIZES: Record<Variant, TextStyle> = {
  title: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 14 },
  bodyBold: { fontSize: 14, fontWeight: '600' },
  small: { fontSize: 12 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  big: { fontSize: 26, fontWeight: '700' },
};

export interface AppTextProps extends TextProps {
  v?: Variant;
  muted?: boolean;
  color?: string;
  num?: boolean;
}

export function Text({ v = 'body', muted, color, num, style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[{ color: color ?? (muted || v === 'label' || v === 'small' ? colors.muted : colors.text) }, SIZES[v], num && { fontVariant: ['tabular-nums'] }, style]}
    />
  );
}

export function Card({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 }, style]}>
      {(title || action) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {title ? <Text v="label">{title}</Text> : <View />}
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export function Button({ title, onPress, variant = 'default', size = 'md', disabled, loading, style, testID, accessibilityLabel }: ButtonProps) {
  const { colors } = useTheme();
  const primary = variant === 'primary';
  const bg = primary ? colors.accent : variant === 'ghost' ? 'transparent' : colors.surface;
  const fg = primary ? colors.accentText : variant === 'danger' ? colors.bad : colors.text;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off }}
      testID={testID}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: primary ? colors.accent : colors.border,
          borderWidth: variant === 'ghost' ? 0 : 1,
          borderRadius: 10,
          paddingVertical: size === 'sm' ? 6 : 11,
          paddingHorizontal: size === 'sm' ? 11 : 16,
          minHeight: size === 'sm' ? 32 : 44,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: off ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={fg} />}
      <RNText style={{ color: fg, fontWeight: '600', fontSize: size === 'sm' ? 13 : 14 }}>{title}</RNText>
    </Pressable>
  );
}

export function Badge({ label, tone = 'muted' }: { label: string; tone?: 'muted' | 'good' | 'warn' | 'bad' }) {
  const { colors } = useTheme();
  const map = {
    muted: [colors.surface2, colors.muted],
    good: [colors.accentSoft, colors.good],
    warn: [colors.warnSoft, colors.warn],
    bad: [colors.badSoft, colors.bad],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <RNText style={{ color: fg, fontSize: 11, fontWeight: '600' }}>{label}</RNText>
    </View>
  );
}

export function Banner({ tone = 'warn', children, action }: { tone?: 'warn' | 'bad' | 'good' | 'info'; children: ReactNode; action?: ReactNode }) {
  const { colors } = useTheme();
  const map = {
    warn: [colors.warnSoft, colors.warn],
    bad: [colors.badSoft, colors.bad],
    good: [colors.accentSoft, colors.good],
    info: [colors.surface2, colors.muted],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, borderRadius: 12, padding: 12, gap: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <Text v="small" color={fg}>{children}</Text> : children}</View>
      {action}
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

export function Loading({ label = 'Carregando…' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={colors.accent} />
      <Text v="small">{label}</Text>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 12, padding: 20, alignItems: 'center' }}>
      <Text v="small" style={{ textAlign: 'center' }}>{children}</Text>
    </View>
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: ViewStyle; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function useStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: ReturnType<typeof useTheme>['colors']) => T): T {
  const { colors } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}

/** Barra de progresso (mesma regra do site: vermelha acima de 105% da meta). */
export function Bar({ value, max, color, over }: { value: number; max: number; color?: string; over?: string }) {
  const { colors } = useTheme();
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}
      style={{ height: 8, borderRadius: 999, backgroundColor: colors.surface2, overflow: 'hidden' }}
    >
      <View style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 999, backgroundColor: pct > 105 ? (over ?? colors.bad) : (color ?? colors.accent) }} />
    </View>
  );
}
