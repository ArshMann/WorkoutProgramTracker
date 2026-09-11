/**
 * Superset interleaving. Each "lane" is one exercise's sets (or, for the
 * Block 1 "SS with core block" case, the whole core block flattened into one
 * lane). Lanes alternate round-robin: A1 → B1 → A2 → B2 → B3 → B4 …
 */
export interface LaneRef {
  lane: number;
  index: number;
}

export function interleave(laneLengths: readonly number[]): LaneRef[] {
  const out: LaneRef[] = [];
  const max = Math.max(0, ...laneLengths);
  for (let i = 0; i < max; i++) {
    laneLengths.forEach((len, lane) => {
      if (i < len) out.push({ lane, index: i });
    });
  }
  return out;
}
