import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { jointFallbackExercise, substituteOptions } from '@/engine/substitution';
import { getExercise } from '@/program/exercises';
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
  const { card, slot } = useLocalSearchParams<{ card: string; slot: string }>();
  const active = useSessionStore((s) => s.active);
  const substitute = useSessionStore((s) => s.substitute);
  const [keep, setKeep] = useState(false);

  const cardIndex = Number(card);
  const slotIndex = Number(slot);
  const ex = active?.session.cards[cardIndex]?.exercises.find((e) => e.slotIndex === slotIndex);
  if (!active || !ex) {
    return (
      <Screen>
        <Txt muted>Nothing to substitute.</Txt>
      </Screen>
    );
  }

  const originalId = ex.substitutedFrom ?? ex.exerciseId;
  const basePrescription = { ...ex.prescription, exerciseId: originalId };
  const options = substituteOptions(basePrescription, ex.exerciseId);
  const joint = jointFallbackExercise(basePrescription, ex.exerciseId);
  const canPersist = active.session.kind !== 'fullbody';

  const pick = (id: string, isJoint: boolean) => {
    substitute(cardIndex, slotIndex, id, isJoint, keep && !isJoint);
    router.back();
  };

  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Txt variant="caption">Replacing</Txt>
        <Txt variant="title">{ex.name}</Txt>
        <Txt variant="small" muted>
          {getExercise(ex.exerciseId).pattern.replace('-', ' ')} · logs against its own history
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
