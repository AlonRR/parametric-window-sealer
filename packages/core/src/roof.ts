// A wall in a roof window (sloped-frame, #160; docs/roof.md). A top-hung roof window opened out
// leaves its frame clear from inside, so the wall goes in as in a frame with no track, its gaskets
// squeezed against the frame all round. On a slope, though, the share of its weight across the
// window, the cosine of the roof's pitch, pulls it out of the frame into the room, and only the
// gaskets' grip holds it. That grip is not measured yet, so the plan gives the share and asks for
// the hold to be tested at twice it, against the wall's own weight, weighed before it goes in.
import type { Params } from './params.js';

export interface RoofParams {
  pitchDeg: number; // the roof's slope, from level: 90 for an upright window
}

// The middle of the 15 to 55° a top-hung roof window is made for (docs/research/window-types.md).
export const EXAMPLE_ROOF: RoofParams = { pitchDeg: 35 };

export const ROOF_PITCH_DEG = { least: 15, most: 90 } as const;
export const ROOF_PITCH_MESSAGE = 'A roof window lies at 15 to 90° from level: give its pitch in degrees.';

// The share of the wall's weight that pulls it out of the frame, across the window.
export const pullShare = (pitchDeg: number): number => Math.cos((pitchDeg * Math.PI) / 180);

// The plan's lines for a roof window: the share of the weight that pulls, the test, the hose and the
// rain.
export function describeRoof(p: Params): string[] {
  if (p.edges.window !== 'roof') return [];
  const pitch = p.roof.pitchDeg;
  const share = pullShare(pitch);
  const lines =
    Math.round(share * 100) === 0
      ? [`At ${pitch}°, the wall stands upright: its weight rests on its bottom edge.`]
      : [
          `On a roof at ${pitch}°, ${Math.round(share * 100)}% of the wall’s weight pulls it out of the frame ` +
            'into the room, held only by its gaskets’ grip. Weigh its parts before you fit it; then push its ' +
            `middle from the room side with a scale held flat, up to ${(Math.round(20 * share) / 10).toFixed(1)} ` +
            'times their weight: it must not move. Until it has, and over a bed or a seat, hold it up with a ' +
            'strap across its room face.',
        ];
  if (p.ports.length > 0) {
    lines.push('Hang the hose from a hook above the window, so its weight does not pull on the wall.');
  }
  lines.push(
    'Rain on the wall runs down its slope to its bottom edge, and the frame’s lower face slopes down to it ' +
      'too: water gathers against the bottom gasket. The open sash shelters it from rain falling straight ' +
      'down; close the window when rain is blown under it.',
  );
  return lines;
}
