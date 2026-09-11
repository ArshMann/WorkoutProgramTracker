import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { Directory, Paths } from 'expo-file-system';
import { resetDatabase } from '@/db/client';
import { exportToShareSheet } from '@/services/export';
import { cancelRestDone } from '@/services/notifications';
import { kv } from '@/storage/kv';
import { useAppStore } from '@/store/app';
import { useSessionStore } from '@/store/session';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { radius, space, useColors } from '@/ui/theme';

const DELETES = [
  'Every logged session and set',
  'Bodyweight and waist entries',
  'Progress photos (the image files too)',
  'The program start date and queue position',
  'Per-machine load increments',
  'Stall flags, calibration sets, block reviews',
  'Settings: theme, rest durations',
];

/** Reachable only from Settings. Two steps: read what goes, type ERASE. */
export default function Erase() {
  const c = useColors();
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [backedUp, setBackedUp] = useState<'no' | 'running' | 'done'>('no');
  const [busy, setBusy] = useState(false);

  const backup = async () => {
    setBackedUp('running');
    try {
      await exportToShareSheet();
      setBackedUp('done');
    } catch (e) {
      setBackedUp('no');
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    }
  };

  const erase = async () => {
    setBusy(true);
    try {
      await cancelRestDone();
      useSessionStore.setState({ active: null, timer: { endsAt: null, totalSeconds: 0, label: '' } });
      const photos = new Directory(Paths.document, 'photos');
      if (photos.exists) photos.delete();
      resetDatabase();
      kv().clearAll();
      useAppStore.getState().resetAll();
      router.replace('/onboarding');
    } catch (e) {
      setBusy(false);
      Alert.alert('Erase failed', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen>
      <Txt variant="title">Erase all data</Txt>
      <Card style={{ gap: space.xs }}>
        <Txt variant="caption">This deletes</Txt>
        {DELETES.map((d) => (
          <Txt key={d} variant="small">
            · {d}
          </Txt>
        ))}
        <Txt variant="small" muted style={{ marginTop: space.xs }}>
          The app returns to the start-date screen. There is no undo.
        </Txt>
      </Card>
      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">First</Txt>
        <Button
          title={backedUp === 'done' ? 'Backed up ✓ — back up again' : backedUp === 'running' ? 'Exporting…' : 'Back up before erasing'}
          variant="secondary"
          disabled={backedUp === 'running'}
          onPress={backup}
        />
      </Card>
      <Card style={{ gap: space.sm }}>
        <Txt variant="caption">Then type ERASE</Txt>
        <TextInput
          id="erase-confirm"
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ERASE"
          placeholderTextColor={c.textFaint}
          style={{ minHeight: 52, color: c.text, backgroundColor: c.surfaceRaised, borderRadius: radius.sm, paddingHorizontal: space.md, fontSize: 18, letterSpacing: 2 }}
        />
        <Button title={busy ? 'Erasing…' : 'Erase everything'} variant="danger" disabled={typed.trim() !== 'ERASE' || busy} onPress={erase} />
      </Card>
      <View style={{ height: space.xl }} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
