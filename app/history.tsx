import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { SectionList, View } from 'react-native';
import * as repo from '@/db/repo';
import { useUiStore } from '@/store/ui';
import { Button } from '@/ui/components/Button';
import { Row } from '@/ui/components/Row';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { space, useColors } from '@/ui/theme';

const KIND: Record<string, string> = { queue: 'full', minimum: 'minimum', deload: 'deload', fullbody: 'full-body' };

/** Long-range navigation: every logged session, newest first, grouped by program week. Tap to land on it in the Home strip. */
export default function History() {
  const router = useRouter();
  const c = useColors();
  const setJumpTo = useUiStore((s) => s.setHomeJumpTo);
  const sections = useMemo(() => {
    const all = repo.getSessionSummaries().slice().reverse();
    const byWeek = new Map<string, repo.SessionSummary[]>();
    for (const s of all) {
      const key = `Week ${s.week} · Block ${s.block}`;
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key)!.push(s);
    }
    return [...byWeek.entries()].map(([title, data]) => ({ title, data }));
  }, []);

  const jump = (id: string) => {
    setJumpTo(id);
    router.back();
  };

  return (
    <Screen scroll={false}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm }}>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button title="Now" variant="secondary" style={{ flex: 1 }} onPress={() => jump('live')} />
          <Button title="Log a past session" variant="secondary" style={{ flex: 2 }} onPress={() => router.replace('/edit/new')} />
        </View>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Txt variant="caption" style={{ marginTop: space.lg, marginBottom: space.xs }}>
            {section.title}
          </Txt>
        )}
        renderItem={({ item }) => (
          <Row
            label={`${new Date(item.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${item.sessionType}`}
            sub={`${KIND[item.kind] ?? item.kind} · ${item.exerciseCount} exercises · ${item.setCount} sets${item.editedAt ? ' · edited' : ''}`}
            onPress={() => jump(item.id)}
          />
        )}
        ListEmptyComponent={
          <Txt variant="small" faint style={{ marginTop: space.lg, color: c.textFaint }}>
            No sessions logged yet.
          </Txt>
        }
      />
    </Screen>
  );
}
