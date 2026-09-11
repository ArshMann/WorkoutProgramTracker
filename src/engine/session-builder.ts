import { getCoreStage } from '@/program/core';
import { DELOAD_LOAD_FACTOR } from '@/program/decisions';
import { getExercise, isCalibrationEligible } from '@/program/exercises';
import { getFullBody } from '@/program/fullbody';
import type { Block, Prescription, RirTarget } from '@/program/types';
import { incrementFor } from './increments';
import type { LayoffEffect } from './layoff';
import { prefill } from './progression';
import { restSeconds, type RestSettings } from './rest';
import { JOINT_FALLBACK_LOAD_FACTOR, jointFallbackPrescription } from './substitution';
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
  loadFactor: number;
  loadFactorBefore?: string;
  rirOverride: RirTarget | null;
  allowProgression: boolean;
  isCore?: boolean;
  substitutedFrom?: string;
  jointFallback?: boolean;
  rangeShiftMode?: 'auto' | 'ignore';
}

interface PlannedLane {
  exercise: PlannedExercise;
  sets: SetPrefill[];
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
  return { exercise, sets: result.sets };
}

/** Straight sets, in order. A card is one exercise, or the whole core block (its drills in sequence). */
function rowsForCard(ctx: BuildContext, cardIndex: number, lanes: PlannedLane[], kind: SessionKind, calibrationAllowed: boolean): PlannedSetRow[] {
  const countsForProgression = kind === 'queue' || kind === 'fullbody';
  const rows: PlannedSetRow[] = [];
  for (const lane of lanes) {
    const def = getExercise(lane.exercise.exerciseId);
    const restCategory = lane.exercise.prescription.rest;
    lane.sets.forEach((set, setIndex) => {
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
  }
  return rows;
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
  let originals: readonly Prescription[];
  if (isFullBody) {
    const fb = getFullBody(variant as 'FBA' | 'FBB');
    prescriptions = [...fb.exercises];
    originals = prescriptions;
    if (fb.includeCore) corePrescriptions = [...coreStage.drills];
  } else {
    originals = block.sessions[sessionType as 'PUSH' | 'PULL' | 'LEGS'];
    const base = originals.map((p, slotIndex) => {
      const override = ctx.slotOverrides[slotOverrideKey(block.number, sessionType, slotIndex)];
      return override && override !== p.exerciseId ? { ...p, exerciseId: override } : p;
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

  const planFor = (p: Prescription, slotIndex: number, isCore = false, original?: Prescription): PlannedLane => {
    const def = getExercise(p.exerciseId);
    const useEntry = entryRir && def.role === 'main' && !isCore ? entryRir : null;
    return planExercise(ctx, {
      prescription: p,
      slotIndex,
      loadFactor,
      loadFactorBefore,
      rirOverride: useEntry ?? rirOverride,
      allowProgression,
      isCore,
      substitutedFrom: original && original.exerciseId !== p.exerciseId ? original.exerciseId : undefined,
    });
  };

  // ── One card per exercise, in table order; the core block last ──
  const cards: PlannedCard[] = prescriptions.map((p, slotIndex) => {
    const cardIndex = slotIndex;
    const lane = planFor(p, slotIndex, false, originals[slotIndex]);
    return {
      index: cardIndex,
      title: lane.exercise.name,
      exercises: [lane.exercise],
      rows: rowsForCard(ctx, cardIndex, [lane], kind, calibrationAllowed),
      isCoreBlock: false,
    };
  });

  if (corePrescriptions.length) {
    const cardIndex = cards.length;
    const lanes = corePrescriptions.map((cp, i) => planFor(cp, CORE_SLOT_BASE + i, true));
    cards.push({
      index: cardIndex,
      title: coreStage.label,
      exercises: lanes.map((l) => l.exercise),
      rows: rowsForCard(ctx, cardIndex, lanes, kind, calibrationAllowed),
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
  const target = card.exercises.find((e) => e.slotIndex === slotIndex);
  if (!target) return session;

  const original = target.substitutedFrom ?? target.exerciseId;
  const prescription: Prescription = joint
    ? jointFallbackPrescription(target.prescription, newExerciseId)
    : { ...target.prescription, exerciseId: newExerciseId };
  const replaced = planExercise(ctx, {
    prescription,
    slotIndex,
    loadFactor: joint ? JOINT_FALLBACK_LOAD_FACTOR : session.loadFactor,
    loadFactorBefore: undefined,
    rirOverride: joint ? null : session.rirOverride,
    allowProgression: session.countsForProgression && !joint,
    isCore: target.isCore,
    substitutedFrom: original,
    jointFallback: joint,
    rangeShiftMode: joint ? 'ignore' : 'auto',
  });

  // Untouched exercises on the card keep their previously planned numbers.
  const lanes: PlannedLane[] = card.exercises.map((e) => {
    if (e.slotIndex === slotIndex) return replaced;
    const prevRows = card.rows.filter((r) => r.slotIndex === e.slotIndex).sort((a, b) => a.setIndex - b.setIndex);
    return {
      exercise: e,
      sets: prevRows.map((r) => ({ load: r.load, reps: r.reps, rir: r.rir, repRange: r.repRange, rirTarget: r.rirTarget })),
    };
  });

  const newCard: PlannedCard = {
    ...card,
    exercises: lanes.map((l) => l.exercise),
    title: card.isCoreBlock ? card.title : replaced.exercise.name,
    rows: rowsForCard(ctx, cardIndex, lanes, session.kind, session.kind === 'queue'),
  };
  return { ...session, cards: session.cards.map((c, i) => (i === cardIndex ? newCard : c)) };
}
