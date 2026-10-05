// Backlog item track-edge (#11): an edge strip on every outer edge (Q65, Q68, Q72). Each
// edge has a role, preset by window type (Q66, Q75). The opening is measured as seen, plus
// each track's depth (Q67); the strip sits inside the track (Q69), 0.5 mm narrower than it
// on each side (Q70). One strip runs through each corner, by window type (Q71); long
// strips split into equal segments (Q73); joint strips stop short of them (Q74).
import { describe, expect, it } from 'vitest';
import {
  EDGE_BASE_MM,
  EXAMPLE_TRACK,
  WINDOW_PRESETS,
  edgeProfile,
  edgeShapes,
  jointStripInsetMm,
  panelSpan,
  planEdges,
} from '../src/edge';
import type { EdgeName, EdgeParams, EdgeStripPlacement } from '../src/edge';
import { DEFAULT_JOINT } from '../src/joint';

const slider: EdgeParams = { window: 'slider', roles: WINDOW_PRESETS.slider, track: EXAMPLE_TRACK };
const hung: EdgeParams = { window: 'hung', roles: WINDOW_PRESETS.hung, track: EXAMPLE_TRACK };
const on = (strips: EdgeStripPlacement[], edge: EdgeName) => strips.filter((s) => s.edge === edge);
const total = (strips: EdgeStripPlacement[]) => strips.reduce((n, s) => n + s.lengthMm, 0);

describe('window presets (Q66, Q75)', () => {
  it('a slider: top, bottom and left in tracks, the right pressed by the sash', () => {
    expect(WINDOW_PRESETS.slider).toEqual({ top: 'track', bottom: 'track', left: 'track', right: 'sash' });
  });

  it('a hung window: the sides in tracks, the top under the sash, the bottom on the sill', () => {
    expect(WINDOW_PRESETS.hung).toEqual({ top: 'sash', bottom: 'sill', left: 'track', right: 'track' });
  });

  it('the example track is 15 mm wide and 10 mm deep, with 0.5 mm clearance a side', () => {
    expect(EXAMPLE_TRACK).toEqual({
      widthMm: 15,
      clearanceMm: 0.5,
      depthMm: { top: 10, bottom: 10, left: 10, right: 10 },
    });
    expect(EDGE_BASE_MM).toBe(2);
  });
});

describe('edgeProfile', () => {
  it('in a track: as tall as the track is deep, 0.5 mm narrower a side, the panel 6.5 mm in', () => {
    expect(edgeProfile('left', slider, DEFAULT_JOINT)).toEqual({
      widthMm: 14,
      heightMm: 10,
      reachMm: 6.5,
    });
  });

  it('pressed by the sash: as wide as the track setting, the slot plus a 2 mm base tall', () => {
    // Its outer face is the opening's edge, so the panel stops 3.5 mm short of it.
    expect(edgeProfile('right', slider, DEFAULT_JOINT)).toEqual({
      widthMm: 15,
      heightMm: 10,
      reachMm: -3.5,
    });
  });

  it('a shallow track: the strip keeps its base and stands out of the track (Q69)', () => {
    const shallow = { ...slider, track: { ...EXAMPLE_TRACK, depthMm: { ...EXAMPLE_TRACK.depthMm, left: 4 } } };
    expect(edgeProfile('left', shallow, DEFAULT_JOINT)).toEqual({
      widthMm: 14,
      heightMm: 10,
      reachMm: 0.5,
    });
  });

  it('a deep track: the strip fills it, and the panel still sits 6.5 mm into the track', () => {
    const deep = { ...slider, track: { ...EXAMPLE_TRACK, depthMm: { ...EXAMPLE_TRACK.depthMm, top: 25 } } };
    expect(edgeProfile('top', deep, DEFAULT_JOINT)).toEqual({ widthMm: 14, heightMm: 25, reachMm: 6.5 });
  });
});

describe('panelSpan (Q67)', () => {
  it('the slider example: 6.5 mm into three tracks, 3.5 mm short of the sash', () => {
    expect(panelSpan(600, 1000, slider, DEFAULT_JOINT)).toEqual({ widthMm: 603, heightMm: 1013 });
  });

  it('a hung window: into both side tracks, short of the sash and the sill', () => {
    expect(panelSpan(1000, 400, hung, DEFAULT_JOINT)).toEqual({ widthMm: 1013, heightMm: 393 });
  });
});

describe('planEdges, a slider (the top and bottom run through, Q71)', () => {
  const strips = planEdges(603, 1013, slider, DEFAULT_JOINT, 200);

  it('the bottom and top strips run from outer face to outer face, in 4 equal segments (Q73)', () => {
    for (const edge of ['bottom', 'top'] as const) {
      const segments = on(strips, edge);
      expect(segments.map((s) => s.lengthMm)).toEqual([152.5, 152.5, 152.5, 152.5]);
      expect(segments[0]?.xMm).toBe(-3.5);
      expect(total(segments)).toBeCloseTo(610, 9);
    }
    expect(on(strips, 'bottom')[0]?.yMm).toBe(-3.5); // outer face at the track bottom
    expect(on(strips, 'top')[0]?.yMm).toBe(1013 - 6.5); // the slot's mouth on the panel
  });

  it('the side strips stop on them, between their mouths', () => {
    for (const edge of ['left', 'right'] as const) {
      const segments = on(strips, edge);
      expect(segments.map((s) => s.lengthMm)).toEqual([200, 200, 200, 200, 200]);
      expect(segments[0]?.yMm).toBe(6.5);
    }
    expect(on(strips, 'left')[0]?.xMm).toBe(-3.5);
    expect(on(strips, 'right')[0]?.xMm).toBe(603 - 6.5);
  });

  it('each segment carries its edge strip’s width and height, and follows the last', () => {
    expect(on(strips, 'right')[0]).toMatchObject({ widthMm: 15, heightMm: 10 });
    expect(on(strips, 'left')[0]).toMatchObject({ widthMm: 14, heightMm: 10 });
    const left = on(strips, 'left');
    for (const [i, s] of left.slice(1).entries()) {
      expect(s.yMm).toBeCloseTo((left[i]?.yMm ?? 0) + (left[i]?.lengthMm ?? 0), 9);
    }
  });

  it('groups the segments into shapes with a count (Q58)', () => {
    expect(edgeShapes(strips)).toEqual([
      { kind: 'edge', lengthMm: 200, widthMm: 14, heightMm: 10, count: 5 },
      { kind: 'edge', lengthMm: 200, widthMm: 15, heightMm: 10, count: 5 },
      { kind: 'edge', lengthMm: 152.5, widthMm: 14, heightMm: 10, count: 8 },
    ]);
  });
});

describe('planEdges, a hung window (the sides run through, Q71)', () => {
  const strips = planEdges(1013, 393, hung, DEFAULT_JOINT, 200);

  it('the side strips run from the sill strip’s outer face to the sash strip’s', () => {
    const left = on(strips, 'left');
    expect(left[0]?.yMm).toBe(-3.5);
    expect(total(left)).toBeCloseTo(393 + 2 * 3.5, 9);
    expect(left).toHaveLength(2); // 400 mm in two 200 mm segments
  });

  it('the top and bottom strips stop between the side strips’ mouths', () => {
    const bottom = on(strips, 'bottom');
    expect(bottom[0]?.xMm).toBe(6.5);
    expect(total(bottom)).toBeCloseTo(1013 - 2 * 6.5, 9);
    expect(bottom[0]).toMatchObject({ widthMm: 15, heightMm: 10 });
  });

  it('no segment is longer than the printer can make', () => {
    for (const s of strips) expect(s.lengthMm).toBeLessThanOrEqual(200 + 1e-9);
  });
});

describe('jointStripInsetMm (Q74)', () => {
  it('a joint strip stops at the edge strip’s mouth plus half the slide: the slot depth', () => {
    expect(jointStripInsetMm(DEFAULT_JOINT)).toBe(8);
  });
});
