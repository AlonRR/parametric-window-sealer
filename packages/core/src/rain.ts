// Rain on the outside face (rain-face, #117). Water running down the wall's outside gets into the
// strips' slots, the joints between rows and the bottom edge most, where the slots open upward. As
// in a window frame, the joints drain rather than seal: every strip and edge strip has weep holes
// through its outside flange at the floor of its slots, so water that gets in runs out again on the
// outside. They are on both sides of a joint strip's web, so it goes either way up; only the face
// matters. A groove under each edge strip with no seal there breaks the path of water creeping
// under it. A window AC is tilted outward to drain, and the wall must not level it.
import type { JointParams } from './joint.js';
import { RIB_PITCH_MM } from './joint.js';
import type { EdgeParams } from './edge.js';
import { EDGES } from './edge.js';
import type { SealParams } from './tape.js';

export const WEEP_MM = 1.5; // tall, from the slot's floor: the room under a piece in the middle of its slide
export const WEEP_LENGTH_MM = 5; // along the strip
export const DRIP_GROOVE_MM = { widthMm: 1.5, depthMm: 1, inMm: 1.5 }; // in from the outside face
export const DRIP_LEAST_WALL_MM = 4; // the outside wall a drip groove needs, with 1 mm to spare

// Midway between the ribs, every other gap: about every 50 mm, none at a rib.
export function weepPlacesMm(lengthMm: number): number[] {
  const count = Math.max(1, Math.round(lengthMm / (2 * RIB_PITCH_MM)));
  return Array.from({ length: count }, (_, i) => ((i + 0.5) * lengthMm) / count);
}

export function describeRain(p: { rain: boolean; seal: SealParams; edges: EdgeParams; joint: JointParams }): string[] {
  const lines: string[] = [];
  if (p.rain) {
    const drip =
      p.seal.kind === 'none' ? ' A groove under each edge strip stops water creeping under it to the room.' : '';
    // Puzzle dovetails (#29) have no strips, only the edge strips.
    const which =
      p.joint.style === 'dovetails'
        ? 'every edge strip has weep holes in one flange to let water out of its slot'
        : 'every strip and edge strip has weep holes in one flange to let water out of its slots';
    lines.push(`Rain: ${which}; fit each with that flange outside.${drip}`);
  }
  if (EDGES.some((e) => p.edges.roles[e] === 'unit')) {
    lines.push(
      'Window AC: keep the unit tilted outward as its manual says, about 3°, and its drain clear; the wall stands ' +
        'on it and does not level it.',
    );
  }
  return lines;
}
