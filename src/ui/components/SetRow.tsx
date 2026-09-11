import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatRirChip } from '@/engine/rir';
import type { PlannedSetRow } from '@/engine/types';
import { radius, space, useColors } from '../theme';
import { RirChips } from './RirChips';
import { Stepper } from './Stepper';
import { Txt } from './Txt';

export interface RowValue {
  load: number;
  reps: number;
  rir: number | null;
  pain: boolean;
}

interface Props {
  row: PlannedSetRow;
  value: RowValue;
  label: string;
  logged: boolean;
  active: boolean;
  loadStep: number;
  onLog: () => void;
  onUnlog: () => void;
  onActivate: () => void;
  onChange: (patch: Partial<RowValue>) => void;
  onTogglePain: () => void;
  calibrating?: boolean;
}

function unitFor(row: PlannedSetRow): string {
  if (row.repUnit === 'seconds') return 's';
  if (row.repUnit === 'metres') return 'm';
  return '';
}

/**
 * One set. Compact when pending or logged; expanded (steppers + RIR chips +
 * a large ✓) when it is the next set to log. ✓ logs it exactly as shown.
 */
export function SetRow({ row, value, label, logged, active, loadStep, onLog, onUnlog, onActivate, onChange, onTogglePain, calibrating }: Props) {
  const c = useColors();
  const unit = unitFor(row);
  const repsText = `${value.reps}${unit}${row.perSide ? '/side' : ''}`;
  const summary = row.loadable ? `${value.load} lb × ${repsText}` : repsText;
  const rirText = row.rirTarget ? ` · RIR ${formatRirChip(value.rir)}` : '';

  const painButton = (
    <Pressable onPress={onTogglePain} hitSlop={8} style={styles.pain}>
      <Text style={{ fontSize: 18, color: value.pain ? c.danger : c.textFaint }}>{value.pain ? '⚑' : '⚐'}</Text>
    </Pressable>
  );

  if (!active) {
    return (
      <Pressable onPress={logged ? undefined : onActivate} style={[styles.compact, { borderColor: c.border, opacity: logged ? 0.55 : 1 }]}>
        <Txt variant="small" muted style={styles.label}>
          {label}
        </Txt>
        <Text style={[styles.compactValue, { color: c.text }]}>
          {summary}
          <Text style={{ color: c.textMuted }}>{rirText}</Text>
        </Text>
        {painButton}
        <Pressable
          onPress={logged ? onUnlog : onLog}
          hitSlop={6}
          style={({ pressed }) => [styles.checkSmall, { backgroundColor: logged ? c.accent : c.surfaceRaised, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={{ color: logged ? c.accentText : c.textMuted, fontSize: 20, fontWeight: '700' }}>✓</Text>
        </Pressable>
      </Pressable>
    );
  }

  return (
    <View style={[styles.expanded, { backgroundColor: c.surfaceRaised, borderColor: calibrating ? c.accent : 'transparent' }]}>
      <View style={styles.headerRow}>
        <Txt variant="small" muted>
          {label}
          {row.rirTarget ? `  ·  target RIR ${row.rirTarget.min === row.rirTarget.max ? row.rirTarget.min : `${row.rirTarget.min}–${row.rirTarget.max}`}` : ''}
          {`  ·  ${row.repRange.min}–${row.repRange.max}${unit}`}
        </Txt>
        {painButton}
      </View>
      <View style={styles.steppers}>
        {row.loadable ? <Stepper value={value.load} onChange={(load) => onChange({ load })} step={loadStep} unit="lb" /> : null}
        <Stepper value={value.reps} onChange={(reps) => onChange({ reps: Math.max(0, Math.round(reps)) })} step={1} min={0} unit={row.repUnit === 'reps' ? 'reps' : unit === 's' ? 'sec' : 'm'} />
      </View>
      {row.rirTarget && !calibrating ? (
        <View style={styles.rirRow}>
          <Txt variant="caption" style={{ width: 34 }}>
            RIR
          </Txt>
          <View style={{ flex: 1 }}>
            <RirChips value={value.rir} onChange={(rir) => onChange({ rir })} compact />
          </View>
        </View>
      ) : null}
      {calibrating ? (
        <Txt variant="small" accent>
          Calibration set — go to true concentric failure, then enter the reps you got.
        </Txt>
      ) : null}
      <Pressable onPress={onLog} style={({ pressed }) => [styles.checkBig, { backgroundColor: c.accent, opacity: pressed ? 0.8 : 1 }]}>
        <Text style={{ color: c.accentText, fontSize: 30, fontWeight: '700' }}>✓</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: space.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { width: 78 },
  compactValue: { flex: 1, fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  pain: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  checkSmall: { width: 52, height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  expanded: { borderRadius: radius.md, padding: space.md, gap: space.md, borderWidth: 2, marginVertical: space.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  steppers: { gap: space.sm, alignItems: 'center' },
  rirRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  checkBig: { height: 64, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
