import React from 'react';
import { Dimensions, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { space, useColors } from '../theme';
import { Txt } from './Txt';

export interface TrendPoint {
  value: number;
  /** Short x label (shown for a few points only). */
  label?: string;
  /** Draw a vertical marker at this point (block boundary). */
  marker?: string;
}

interface Props {
  points: TrendPoint[];
  /** Faint secondary series (e.g. raw daily weigh-ins behind the 7-day average). */
  secondary?: TrendPoint[];
  height?: number;
  unit?: string;
  decimals?: number;
}

/** One quiet line chart. Block boundaries are dashed vertical lines with a small label. */
export function TrendChart({ points, secondary, height = 180, unit = '', decimals = 0 }: Props) {
  const c = useColors();
  if (points.length < 2) {
    return (
      <View style={{ height: 80, justifyContent: 'center' }}>
        <Txt variant="small" faint>
          Not enough data for a trend yet.
        </Txt>
      </View>
    );
  }
  const width = Dimensions.get('window').width - space.lg * 2 - space.lg * 2 - 40;
  const spacing = Math.max(8, Math.min(40, Math.floor(width / Math.max(1, points.length - 1))));
  const data = points.map((p) => ({
    value: p.value,
    label: p.label,
    labelTextStyle: { color: c.textFaint, fontSize: 10 },
    showVerticalLine: !!p.marker,
    verticalLineColor: c.textFaint,
    verticalLineThickness: 1,
    verticalLineDashArray: [3, 4],
    dataPointText: p.marker ?? undefined,
    textColor: c.textMuted,
    textFontSize: 10,
    textShiftY: -8,
  }));
  const all = [...points, ...(secondary ?? [])].map((p) => p.value);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = Math.max(1, (max - min) * 0.15);
  return (
    <LineChart
      data={data}
      data2={secondary?.map((p) => ({ value: p.value }))}
      height={height}
      width={width}
      spacing={spacing}
      initialSpacing={6}
      endSpacing={6}
      color={c.accent}
      color2={c.textFaint}
      thickness={2}
      thickness2={1}
      hideDataPoints={points.length > 40}
      dataPointsColor={c.accent}
      dataPointsRadius={3}
      hideDataPoints2
      yAxisOffset={Math.floor(min - pad)}
      maxValue={Math.ceil(max + pad) - Math.floor(min - pad)}
      noOfSections={4}
      yAxisColor="transparent"
      xAxisColor={c.border}
      yAxisTextStyle={{ color: c.textFaint, fontSize: 10 }}
      rulesColor={c.border}
      rulesType="solid"
      formatYLabel={(v: string) => `${Number(v).toFixed(decimals)}${unit}`}
      curved={false}
      isAnimated={false}
    />
  );
}
