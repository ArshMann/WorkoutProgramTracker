import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import * as repo from '@/db/repo';
import { jointFallbackExercise, substituteOptions } from '@/engine/substitution';
import { getExercise, isExerciseId } from '@/program/exercises';
import type { Prescription } from '@/program/types';
import { recomputeDerivedState } from '@/store/context';
import { useSessionStore } from '@/store/session';
import { Button } from '@/ui/components/Button';
import { Card } from '@/ui/components/Card';
import { Checkbox } from '@/ui/components/Checkbox';
import { Row } from '@/ui/components/Row';
import { Screen } from '@/ui/components/Screen';
import { Txt } from '@/ui/components/Txt';
import { space } from '@/ui/theme';

/** Part 3 — ordered substitute list for the tapped slot. One tap swaps it. */
export default function Substitute() {
  const router = useRouter();
  const { card, slot, mode, session } = useLocalSearchParams<{ card: string; slot: string; mode?: string; session?: string }>();
  const active = useSessionStore((s) => s.active);
  const substitute = useSessionStore((s) => s.substitute);
  const [keep, setKeep] = useState(false);

  const cardIndex = Number(card);
  const slotIndex = Number(slot);
  const editing = mode === 'edit' && !!session;

  // Editing a logged session: the slot is described by its stored rows, not by a planned exercise.
  const storedRows = editing ? repo.getSetsForSession(session).filter((r) => r.cardIndex === cardIndex && r.slotIndex === slotIndex) : [];
  const stored = storedRows[0];
  const ex = editing
    ? stored && isExerciseId(stored.exerciseId)
      ? {
          exerciseId: stored.exerciseId,
          name: getExercise(stored.exerciseId).name,
          substitutedFrom: stored.substitutedFrom ?? undefined,
          prescription: {
            exerciseId: stored.exerciseId,
            sets: storedRows.length,
            reps: { min: stored.repMin, max: stored.repMax },
            rir: stored.rirMin === null ? null : { min: stored.rirMin, max: stored.rirMax ?? stored.rirMin },
            rest: 'isolation',
          } as Prescription,
        }
      : null
    : active?.session.cards[cardIndex]?.exercises.find((e) => e.slotIndex === slotIndex);
  if ((!editing && !active) || !ex) {
    return (
      <Screen>
        <Txt muted>Nothing to substitute.</Txt>
      </Screen>
    );
  }

  const originalId = ex.substitutedFrom ?? ex.exerciseId;
  const basePrescription = { ...ex.prescription, exerciseId: originalId };
  const options = substituteOptions(basePrescription, ex.exerciseId);
  const joint = editing ? null : jointFallbackExercise(basePrescription, ex.exerciseId);
  const canPersist = !editing && active?.session.kind !== 'fullbody';

  const pick = (id: string, isJoint: boolean) => {
    if (editing) {
      repo.reassignSlotExercise(session!, cardIndex, slotIndex, id, id === originalId ? null : originalId);
      repo.markSessionEdited(session!, new Date().toISOString());
      recomputeDerivedState();
    } else {
      substitute(cardIndex, slotIndex, id, isJoint, keep && !isJoint);
    }
    router.back();
  };

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Txt variant="caption">Replacing</Txt>
        <Txt variant="title">{ex.name}</Txt>
        <Txt variant="small" muted>
          {getExercise(ex.exerciseId).pattern.replace('-', ' ')} · {editing ? 'the logged sets move to the chosen lift’s history' : 'logs against its own history'}
        </Txt>
      </View>
      {canPersist ? <Checkbox label="Keep for the rest of this block" checked={keep} onToggle={() => setKeep((k) => !k)} /> : null}
      <Card>
        {options.map((o) => (
          <Row key={o.exerciseId} label={o.name} sub={o.source === 'alternative' ? 'Program alternative' : o.machineGuided ? 'Machine-guided' : undefined} onPress={() => pick(o.exerciseId, false)} />
        ))}
      </Card>
      {joint ? (
        <Card style={{ gap: space.sm }}>
          <Txt variant="caption">Joint bothering you</Txt>
          <Txt variant="small" muted>
            Most machine-guided variant in the pattern, load −20 %, 10–15 reps, RIR 2. Pain that alters technique gets substituted, not pushed through. Persistent past 2 weeks: get it assessed.
          </Txt>
          <Button title={`Use ${getExercise(joint).name}`} variant="secondary" onPress={() => pick(joint, true)} />
        </Card>
      ) : null}
    </Screen>
  );
}
