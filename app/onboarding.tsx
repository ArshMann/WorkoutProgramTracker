import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { dayKey } from '@/engine/dates';
import { applyImport, pickImportFile } from '@/services/export';
import { useAppStore } from '@/store/app';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { space, useColors } from '@/ui/theme';

/** The only onboarding: the program start date. */
export default function Onboarding() {
  const router = useRouter();
  const c = useColors();
  const setStartDay = useAppStore((s) => s.setStartDay);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const begin = () => {
    setStartDay(dayKey(date), true);
    router.replace('/');
  };

  const restore = async () => {
    try {
      const payload = await pickImportFile();
      if (!payload) return;
      applyImport(payload);
      await useAppStore.persist.rehydrate();
      if (!useAppStore.getState().programStartDay) setStartDay(dayKey(date), true);
      router.replace('/');
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen>
      <View style={{ gap: space.sm, marginTop: space.xxl }}>
        <Txt variant="caption">Program start</Txt>
        <Txt variant="display">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Txt>
        <Txt muted>Week 1 begins on this day. The program week advances on real time from here; the queue does not care which day it is.</Txt>
      </View>
      <Card>
        {showPicker ? (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            themeVariant={c.scheme}
            onChange={(_, d) => {
              if (Platform.OS !== 'ios') setShowPicker(false);
              if (d) setDate(d);
            }}
          />
        ) : (
          <Button title="Change date" variant="secondary" onPress={() => setShowPicker(true)} />
        )}
      </Card>
      <Button title="Start program" size="lg" onPress={begin} />
      <Button title="Restore from a backup" variant="ghost" onPress={restore} />
    </Screen>
  );
}
