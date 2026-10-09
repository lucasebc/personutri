import { type ReactNode, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, type TextInputProps, View } from 'react-native';
import { Button, Row, Text } from './primitives';
import { useTheme } from './theme';

export interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  suffix?: string;
}

export function Field({ label, hint, error, suffix, ...input }: FieldProps) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
      {label ? <Text v="small">{label}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          accessibilityLabel={input.accessibilityLabel ?? label}
          placeholderTextColor={colors.muted}
          {...input}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: error ? colors.bad : colors.border,
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: input.multiline ? 10 : 0,
            fontSize: 15,
          }}
        />
        {suffix ? <Text v="small" style={{ marginLeft: 8 }}>{suffix}</Text> : null}
      </View>
      {error ? <Text v="small" color={colors.bad}>{error}</Text> : hint ? <Text v="small">{hint}</Text> : null}
    </View>
  );
}

export interface Option<T extends string | number> {
  value: T;
  label: string;
  group?: string;
  hint?: string;
}

/** Seletor em tela cheia (mesmo comportamento no Android e no web). */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Escolher…',
  searchable,
  disabled,
}: {
  label?: string;
  value: T | '' | null;
  options: Option<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const term = norm(q);
    return term ? options.filter((o) => norm(`${o.label} ${o.group ?? ''}`).includes(term)) : options;
  }, [options, q]);

  return (
    <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
      {label ? <Text v="small">{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        disabled={disabled}
        onPress={() => {
          setQ('');
          setOpen(true);
        }}
        style={{
          minHeight: 44,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 12,
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ flex: 1 }} color={current ? colors.text : colors.muted} numberOfLines={1}>{current ? current.label : placeholder}</Text>
          <Text color={colors.muted}>▾</Text>
        </Row>
      </Pressable>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 48 }}>
          <View style={{ padding: 16, gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text v="h2">{label ?? 'Escolher'}</Text>
              <Button title="Fechar" size="sm" onPress={() => setOpen(false)} />
            </Row>
            {(searchable ?? options.length > 12) && <Field value={q} onChangeText={setQ} placeholder="Buscar…" accessibilityLabel="Buscar opção" autoCorrect={false} />}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o.value)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            renderItem={({ item, index }) => {
              const header = item.group && item.group !== filtered[index - 1]?.group;
              return (
                <View>
                  {header ? <Text v="label" style={{ marginTop: 14, marginBottom: 4 }}>{item.group}</Text> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                  >
                    <Text color={item.value === value ? colors.accent : colors.text} v={item.value === value ? 'bodyBold' : 'body'}>{item.label}</Text>
                    {item.hint ? <Text v="small">{item.hint}</Text> : null}
                  </Pressable>
                </View>
              );
            }}
            ListEmptyComponent={<Text v="small" style={{ textAlign: 'center', marginTop: 30 }}>Nada encontrado.</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

/** Abas/filtros em linha. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <Row gap={6} style={{ flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            aria-selected={on}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accent : colors.surface }}
          >
            <Text v="small" color={on ? colors.accentText : colors.text} style={{ fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}

/** Caixa de seleção (toque na linha toda). */
export function Check({ checked, onChange, label, disabled, accessibilityLabel }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; disabled?: boolean; accessibilityLabel: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      aria-checked={checked}
      aria-disabled={!!disabled}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: checked ? colors.accent : colors.border, backgroundColor: checked ? colors.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <Text color={colors.accentText} style={{ fontWeight: '800', fontSize: 14 }}>✓</Text> : null}
      </View>
      {label}
    </Pressable>
  );
}

/** Seleção múltipla dos dias da semana (0 = domingo). */
export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const { colors } = useTheme();
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return (
    <Row gap={6} style={{ flexWrap: 'wrap' }}>
      {names.map((n, i) => {
        const on = value.includes(i);
        return (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={n}
            aria-pressed={on}
            onPress={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort((a, b) => a - b))}
            style={{ minWidth: 42, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accent : colors.surface }}
          >
            <Text v="small" color={on ? colors.accentText : colors.text} style={{ fontWeight: '600' }}>{n}</Text>
          </Pressable>
        );
      })}
    </Row>
  );
}
