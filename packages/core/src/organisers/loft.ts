// An opening whose outline changes through the board (openGrid's groove, the HSW ledge): convex
// outlines at depths from the room face, each two neighbours joined by their hull, the first and
// the last carried 1 mm past the faces. Every outline is convex, so each hull is the shape between
// them.
import type { Manifold } from 'manifold-3d';
import type { Engine } from '../engine.js';
import type { Point } from '../pattern.js';

export interface Level {
  depthMm: number; // from the room face
  ring: readonly Point[]; // convex, round the opening's centre
}

export function loftedCut(engine: Engine, boardMm: number, levels: readonly Level[]): Manifold {
  const [first, last] = [levels[0], levels.at(-1)];
  if (first === undefined || last === undefined) throw new RangeError('An opening needs at least one level');
  const all = [{ depthMm: -1, ring: first.ring }, ...levels, { depthMm: boardMm + 1, ring: last.ring }];
  const at = (level: Level): [number, number, number][] =>
    level.ring.map(([x, y]): [number, number, number] => [x, y, boardMm - level.depthMm]);
  const parts: Manifold[] = [];
  for (const [i, level] of all.entries()) {
    const next = all[i + 1];
    if (next !== undefined && next.depthMm > level.depthMm)
      parts.push(engine.Manifold.hull([...at(level), ...at(next)]));
  }
  const cut = engine.Manifold.union(parts);
  for (const p of parts) p.delete();
  return cut;
}
