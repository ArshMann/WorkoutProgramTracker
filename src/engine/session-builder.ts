import { getCoreStage } from '@/program/core';
import { DELOAD_LOAD_FACTOR } from '@/program/decisions';
import { getExercise, isCalibrationEligible } from '@/program/exercises';
import { getFullBody } from '@/program/fullbody';
import type { Block, BlockEmphasis, Prescription, RestCategory, RirTarget } from '@/program/types';
import { incrementFor } from './increments';
import type { LayoffEffect } from './layoff';
import { prefill } from './progression';
import { restSeconds, roleRest, type RestSettings } from './rest';
import { JOINT_FALLBACK_LOAD_FACTOR, jointFallbackPrescription } from './substitution';
import { interleave } from './supersets';
import type { Appearance, PlannedCard, PlannedExercise, PlannedSession, PlannedSetRow, SessionKind, SetPrefill } from './types';
import { deloadCorePrescriptions, deloadPrescriptions, minimumPrescriptions } from './variants';
import { onRampRir, strengthEntryRir, weekInfo } from './week';
import { toIso } from './dates';

export type Variant = 'queue' | 'minimum' | 'deload' | 'FBA' | 'FBB';

/** A layoff effect that persists across the sessions of one loop (Part 5, 2–3 weeks / 4+ weeks). */
export interface ActiveLayoff {
  resumedAt: string; // ISO
  loadFactor: number;
  rirOverride: RirTarget | null;
  sessionsRemaining: number;
  copy: string | null;
}

export interface BuildContext {
  now: Date;
  startDayKey: string;
  historyByExercise: Record<string, Appearance[]>;
  customIncrements: Record<string, number>;
  restSettings: RestSettings;
  /** Layoff classification for *this* start (from days since the last session). */
  layoff: LayoffEffect;
  /** A still-running effect from an earlier session in the loop. */
  activeLayoff: ActiveLayoff | null;
  manualDeload: boolean;
  /** `${block}:${sessionType}:${slotIndex}` → exerciseId, for substitutions that persist through the block. */
  slotOverrides: Record<string, string>;
}

export const CORE_SLOT_BASE = 100;

export function slotOverrideKey(block: number, sessionType: string, slotIndex: number): string {
  return `${block}:${sessionType}:${slotIndex}`;
}

interface PlanArgs {
  prescription: Prescription;
  slotIndex: number;
  cardIndex: number;
  emphasis: BlockEmphasis;
  loadFactor: number;
  loadFactorBefore?: string;
  rirOverride: RirTarget | null;
  allowProgression: boolean;
  countsForProgression: boolean;
  calibrationAllowed: boolean;
  isCore?: boolean;
  substitutedFrom?: string;
  jointFallback?: boolean;
  rangeShiftMode?: 'auto' | 'ignore';
}

interface PlannedLane {
  exercise: PlannedExercise;
  sets: SetPrefill[];
  rest: RestCategory;
}

export function planExercise(ctx: BuildContext, args: PlanArgs): PlannedLane {
  const p = args.prescription;
  const def = getExercise(p.exerciseId);
  const inc = incrementFor(def, ctx.customIncrements[p.exerciseId]);
  const result = prefill({
    exercise: def,
    prescription: p,
    history: ctx.historyByExercise[p.exerciseId] ?? [],
    incrementLb: inc,
    loadFactor: args.loadFactor,
    loadFactorBefore: args.loadFactorBefore,
    rirOverride: args.rirOverride,
    allowProgression: args.allowProgression && p.progression !== 'log-only',
    rangeShiftMode: args.rangeShiftMode ?? 'auto',
  });
  const exercise: PlannedExercise = {
    slotIndex: args.slotIndex,
    exerciseId: p.exerciseId,
    name: def.name,
    prescription: p,
    suggestion: p.progression === 'log-only' ? { kind: 'hold', note: 'Log what you did.' } : result.suggestion,
    substitutedFrom: args.substitutedFrom,
    jointFallback: args.jointFallback,
    isCore: args.isCore,
  };
  const rest: RestCategory = p.rest === 'superset' ? roleRest(def, args.emphasis) : p.rest;
  return { exercise, sets: result.sets, rest };
}

function rowsForCard(
  ctx: BuildContext,
  cardIndex: number,
  lanes: PlannedLane[][],
  kind: SessionKind,
  calibrationAllowed: boolean,
): PlannedSetRow[] {
  // Each lane is a list of PlannedLane (usually one exercise; the core block is several drills in sequence).
  const flat: Array<Array<{ lane: PlannedLane; setIndex: number }>> = lanes.map((laneExercises) =>
    laneExercises.flatMap((lane) => lane.sets.map((_, setIndex) => ({ lane, setIndex }))),
  );
  const order = interleave(flat.map((l) => l.length));
  const countsForProgression = kind === 'queue' || kind === 'fullbody';
  const rows: PlannedSetRow[] = [];
  order.forEach((ref, i) => {
    const { lane, setIndex } = flat[ref.lane][ref.index];
    const next = order[i + 1];
    const nextIsPartner = next !== undefined && next.lane !== ref.lane;
    const restCategory: RestCategory = nextIsPartner ? 'superset' : lane.rest;
    const def = getExercise(lane.exercise.exerciseId);
    const set = lane.sets[setIndex];
    const isLastSet = setIndex === lane.sets.length - 1;
    rows.push({
      key: `${cardIndex}:${lane.exercise.slotIndex}:${setIndex}`,
      cardIndex,
      slotIndex: lane.exercise.slotIndex,
      exerciseId: lane.exercise.exerciseId,
      setIndex,
      load: set.load,
      reps: set.reps,
      rir: set.rir,
      repRange: set.repRange,
      rirTarget: set.rirTarget,
      restSeconds: restSeconds(restCategory, ctx.restSettings),
      restCategory,
      loadable: def.loadable !== false,
      repUnit: def.repUnit ?? 'reps',
      perSide: !!def.perSide,
      isLastSet,
      calibrationEligible: calibrationAllowed && isLastSet && isCalibrationEligible(lane.exercise.exerciseId),
      countsForProgression,
    });
  });
  return rows;
}

function cardTitle(lanes: PlannedLane[][], isCoreBlock: boolean, coreLabel: string | null): string {
  const names = lanes.map((l) => (l[0]?.exercise.isCore ? (coreLabel ?? 'Core block') : l[0].exercise.name));
  void isCoreBlock;
  return names.join('  +  ');
}

export function buildSession(ctx: BuildContext, queueIndex: number, variant: Variant): PlannedSession {
  const info = weekInfo(ctx.startDayKey, ctx.now);
  const block: Block = info.block;
  const isFullBody = variant === 'FBA' || variant === 'FBB';
  const isDeload = variant === 'deload' || (variant === 'queue' && (info.isDeload || ctx.manualDeload));
  const kind: SessionKind = isFullBody ? 'fullbody' : variant === 'minimum' ? 'minimum' : isDeload ? 'deload' : 'queue';

  const QUEUE = ['PUSH', 'PULL', 'LEGS'] as const;
  const sessionType = isFullBody ? variant : QUEUE[((queueIndex % 3) + 3) % 3];

  // ── Prescriptions for today ──
  let prescriptions: Prescription[];
  let corePrescriptions: Prescription[] = [];
  const coreStage = getCoreStage(block.coreStage);
  if (isFullBody) {
    const fb = getFullBody(variant as 'FBA' | 'FBB');
    prescriptions = [...fb.exercises];
    if (fb.includeCore) corePrescriptions = [...coreStage.drills];
  } else {
    const base = block.sessions[sessionType as 'PUSH' | 'PULL' | 'LEGS'].map((p, slotIndex) => {
      const override = ctx.slotOverrides[slotOverrideKey(block.number, sessionType, slotIndex)];
      return override && override !== p.exerciseId ? { ...p, exerciseId: override, alternatives: p.alternatives } : p;
    });
    if (kind === 'minimum') {
      prescriptions = minimumPrescriptions(base);
    } else if (kind === 'deload') {
      prescriptions = deloadPrescriptions(base);
      if (sessionType === 'LEGS') corePrescriptions = deloadCorePrescriptions(coreStage.drills);
    } else {
      prescriptions = [...base];
      if (sessionType === 'LEGS') corePrescriptions = [...coreStage.drills];
    }
  }

  // ── Layoff / deload / on-ramp modifiers ──
  const newLayoff = ctx.layoff.kind !== 'none' ? ctx.layoff : null;
  const running = !newLayoff && ctx.activeLayoff && ctx.activeLayoff.sessionsRemaining > 0 ? ctx.activeLayoff : null;

  let loadFactor = 1;
  let loadFactorBefore: string | undefined;
  let rirOverride: RirTarget | null = null;
  let allowProgression = kind === 'queue' || kind === 'fullbody';
  const bannerParts: string[] = [];

  if (newLayoff) {
    loadFactor = newLayoff.loadFactor;
    loadFactorBefore = toIso(ctx.now);
    rirOverride = newLayoff.rirOverride;
    if (newLayoff.suppressProgression) allowProgression = false;
    if (newLayoff.copy) bannerParts.push(newLayoff.copy);
  } else if (running) {
    loadFactor = running.loadFactor;
    loadFactorBefore = running.resumedAt;
    rirOverride = running.rirOverride;
    allowProgression = false;
    bannerParts.push(
      running.rirOverride
        ? `Return loop: RIR ${running.rirOverride.min}–${running.rirOverride.max}, no progression (${running.sessionsRemaining} session${running.sessionsRemaining === 1 ? '' : 's'} left).`
        : 'Return loop: no progression this session.',
    );
  }

  if (kind === 'deload') {
    loadFactor = DELOAD_LOAD_FACTOR;
    loadFactorBefore = undefined;
    rirOverride = null; // prescriptions already carry RIR 4–5
    allowProgression = false;
    bannerParts.push(
      variant === 'deload' && !info.isDeload
        ? 'Unscheduled deload: half the sets, ~60 % loads, RIR 4–5. Nothing near failure.'
        : `Deload week ${info.week}: half the sets, ~60 % loads, RIR 4–5. Nothing near failure.`,
    );
  } else if (kind === 'minimum') {
    bannerParts.push('Minimum session: first 3 exercises, 2 sets each, RIR 3. Counts as the queued session.');
  } else if (!rirOverride) {
    const ramp = onRampRir(info.week);
    if (ramp && block.number === 1) {
      rirOverride = ramp;
      bannerParts.push(`On-ramp week ${info.week}: RIR ${ramp.min === ramp.max ? ramp.min : `${ramp.min}–${ramp.max}`} on everything.`);
    }
  }

  const entryRir = kind === 'queue' && !rirOverride ? strengthEntryRir(block, info.week) : null;
  if (entryRir) bannerParts.push(`First week of a strength block: main lifts at RIR ${entryRir.min}.`);

  const calibrationAllowed = kind === 'queue';
  const emphasis = block.emphasis;

  // ── Plan each slot ──
  const planFor = (p: Prescription, slotIndex: number, cardIndex: number, isCore = false, original?: Prescription): PlannedLane => {
    const def = getExercise(p.exerciseId);
    const useEntry = entryRir && def.role === 'main' && !isCore ? entryRir : null;
    return planExercise(ctx, {
      prescription: p,
      slotIndex,
      cardIndex,
      emphasis,
      loadFactor,
      loadFactorBefore,
      rirOverride: useEntry ?? rirOverride,
      allowProgression,
      countsForProgression: allowProgression,
      calibrationAllowed,
      isCore,
      substitutedFrom: original && original.exerciseId !== p.exerciseId ? original.exerciseId : undefined,
    });
  };

  const cards: PlannedCard[] = [];
  const consumed = new Set<number>();
  let coreConsumed = corePrescriptions.length === 0;
  const originals = isFullBody
    ? prescriptions
    : block.sessions[(sessionType as 'PUSH' | 'PULL' | 'LEGS')] ?? prescriptions;

  const coreLanes = (cardIndex: number): PlannedLane[] =>
    corePrescriptions.map((cp, i) => planFor(cp, CORE_SLOT_BASE + i, cardIndex, true));

  prescriptions.forEach((p, slotIndex) => {
    if (consumed.has(slotIndex)) return;
    consumed.add(slotIndex);
    const cardIndex = cards.length;
    const lanes: PlannedLane[][] = [[planFor(p, slotIndex, cardIndex, false, originals[slotIndex])]];
    let isSuperset = false;
    let isCoreBlock = false;

    if (p.superset === 'CORE' && !coreConsumed) {
      lanes.push(coreLanes(cardIndex));
      coreConsumed = true;
      isSuperset = true;
      isCoreBlock = true;
    } else if (p.superset) {
      const partnerIndex = prescriptions.findIndex((q, j) => j > slotIndex && !consumed.has(j) && q.superset === p.superset);
      if (partnerIndex >= 0) {
        consumed.add(partnerIndex);
        lanes.push([planFor(prescriptions[partnerIndex], partnerIndex, cardIndex, false, originals[partnerIndex])]);
        isSuperset = true;
      }
    }

    const exercises = lanes.flat().map((l) => l.exercise);
    cards.push({
      index: cardIndex,
      title: cardTitle(lanes, isCoreBlock, coreStage.label),
      exercises,
      rows: rowsForCard(ctx, cardIndex, lanes, kind, calibrationAllowed),
      isSuperset,
      isCoreBlock,
    });
  });

  if (!coreConsumed) {
    const cardIndex = cards.length;
    const lanes = [coreLanes(cardIndex)];
    cards.push({
      index: cardIndex,
      title: coreStage.label,
      exercises: lanes.flat().map((l) => l.exercise),
      rows: rowsForCard(ctx, cardIndex, lanes, kind, calibrationAllowed),
      isSuperset: false,
      isCoreBlock: true,
    });
  }

  return {
    kind,
    sessionType,
    block: block.number,
    week: info.week,
    cards,
    banner: bannerParts.length ? bannerParts.join(' ') : null,
    advancesQueue: !isFullBody,
    countsForProgression: allowProgression,
    loadFactor,
    rirOverride,
  };
}

/**
 * Swap one exercise in a planned session for a substitute (Part 3). The
 * substitute is planned from its own history; the original lift's history is
 * untouched. `joint` applies the "joint bothering you" rule.
 */
export function replaceExercise(
  session: PlannedSession,
  ctx: BuildContext,
  cardIndex: number,
  slotIndex: number,
  newExerciseId: string,
  joint: boolean,
): PlannedSession {
  const card = session.cards[cardIndex];
  if (!card) return session;
  const block = weekInfo(ctx.startDayKey, ctx.now).block;
  const rebuiltLanes: PlannedLane[][] = [];

  // Reconstruct lanes from the card's exercises: core drills form one lane, everything else its own lane.
  const coreExercises = card.exercises.filter((e) => e.isCore);
  const mainExercises = card.exercises.filter((e) => !e.isCore);

  const rePlan = (e: PlannedExercise): PlannedLane => {
    const isTarget = e.slotIndex === slotIndex;
    const original = e.substitutedFrom ?? e.exerciseId;
    const basePrescription: Prescription = isTarget
      ? joint
        ? jointFallbackPrescription(e.prescription, newExerciseId)
        : { ...e.prescription, exerciseId: newExerciseId }
      : e.prescription;
    const lane = planExercise(ctx, {
      prescription: basePrescription,
      slotIndex: e.slotIndex,
      cardIndex,
      emphasis: block.emphasis,
      loadFactor: isTarget && joint ? JOINT_FALLBACK_LOAD_FACTOR : session.loadFactor,
      loadFactorBefore: undefined,
      rirOverride: isTarget && joint ? null : session.rirOverride,
      allowProgression: session.countsForProgression && !(isTarget && joint),
      countsForProgression: session.countsForProgression,
      calibrationAllowed: session.kind === 'queue',
      isCore: e.isCore,
      substitutedFrom: isTarget ? original : e.substitutedFrom,
      jointFallback: isTarget ? joint : e.jointFallback,
      rangeShiftMode: isTarget && joint ? 'ignore' : 'auto',
    });
    if (!isTarget) {
      // Keep the previously planned numbers for untouched exercises.
      const prevRows = card.rows.filter((r) => r.slotIndex === e.slotIndex).sort((a, b) => a.setIndex - b.setIndex);
      lane.sets = lane.sets.map((s, i) => (prevRows[i] ? { ...s, load: prevRows[i].load, reps: prevRows[i].reps, rir: prevRows[i].rir } : s));
      lane.exercise = e;
    }
    return lane;
  };

  mainExercises.forEach((e) => rebuiltLanes.push([rePlan(e)]));
  if (coreExercises.length) rebuiltLanes.push(coreExercises.map(rePlan));

  const exercises = rebuiltLanes.flat().map((l) => l.exercise);
  const newCard: PlannedCard = {
    ...card,
    exercises,
    title: cardTitle(rebuiltLanes, card.isCoreBlock, card.isCoreBlock ? getCoreStage(block.coreStage).label : null),
    rows: rowsForCard(ctx, cardIndex, rebuiltLanes, session.kind, session.kind === 'queue'),
  };
  const cards = session.cards.map((c, i) => (i === cardIndex ? newCard : c));
  return { ...session, cards };
}
