import seedrandom from 'seedrandom';

/**
 * Seedable RNG used by the engine for deterministic game playthroughs.
 * The same seed always produces the same role assignments, tie-breaks, etc.
 */
export class RNG {
  private rng: seedrandom.PRNG;

  constructor(seed: string) {
    this.rng = seedrandom(seed);
  }

  next(): number {
    return this.rng();
  }

  int(min: number, max: number): number {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('RNG.pick: empty array');
    const idx = this.int(0, arr.length - 1);
    return arr[idx] as T;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const r = [...arr];
    for (let i = r.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = r[i] as T;
      r[i] = r[j] as T;
      r[j] = tmp;
    }
    return r;
  }
}
