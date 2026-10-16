// A wall behind a roller shutter (shutter-rails, #158): its sides in the shutter's guide rails, its
// top pressed by the lowered shutter's end bar, its bottom on the sill, as a hung window's edges.
// Choosing it sets the track to a guide rail's starting sizes: 9 mm wide, so the strips are 8 mm
// thick and pass the rails' brushes or seals, and 20 mm deep, as far as a shutter's slats sit in.
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_PARAMS,
  EXAMPLE_TRACK,
  SETTINGS,
  SHUTTER_TRACK,
  WINDOW_PRESETS,
  defaultUnitPlace,
  describePlan,
  edgeProfile,
  planWall,
  readParams,
  readSettings,
  toFormValues,
  windowTrack,
} from '../src/index.js';
import type { FormValues, Params } from '../src/index.js';
import { DEFAULT_JOINT } from '../src/joint.js';

const OPENING = { openingWidthMm: 800, openingHeightMm: 600 };
const settings = (input: unknown, overrides: FormValues = {}): Params => {
  const r = readSettings(input, overrides);
  if (!r.ok) throw new Error(JSON.stringify(r.problems));
  return r.params;
};
const SHUTTER_LINE =
  'Behind a roller shutter: the side strips are 8 mm thick, to pass the guide rails’ brushes or seals, and ' +
  'sit 20 mm into the rails. Lower the shutter only until its end bar rests on the wall’s top edge, and hold ' +
  'it there by its strap or crank: the wall does not carry the shutter’s weight. Before a storm, take the wall ' +
  'out and close the shutter.';

describe('the window type', () => {
  it('its edges as a hung window’s: the sides in the guide rails, the top under the end bar, the bottom on the sill', () => {
    expect(WINDOW_PRESETS.shutter).toEqual({ top: 'sash', bottom: 'sill', left: 'track', right: 'track' });
    expect(defaultUnitPlace('shutter')).toBe('right');
  });

  it('a guide rail’s starting sizes: 9 mm wide with 0.5 mm a side, 20 mm deep', () => {
    expect(SHUTTER_TRACK).toEqual({
      widthMm: 9,
      clearanceMm: 0.5,
      depthMm: { top: 20, bottom: 20, left: 20, right: 20 },
    });
    expect(windowTrack('shutter')).toEqual(SHUTTER_TRACK);
    for (const w of ['slider', 'hung', 'frame'] as const) expect(windowTrack(w)).toEqual(EXAMPLE_TRACK);
  });

  it('a side strip in a rail: 8 mm thick, filling the 20 mm, its slot at the rail’s mouth', () => {
    const edges = { window: 'shutter' as const, roles: WINDOW_PRESETS.shutter, track: SHUTTER_TRACK };
    expect(edgeProfile('left', edges, DEFAULT_JOINT)).toEqual({ widthMm: 8, heightMm: 20, reachMm: 6.5 });
  });
});

describe('the settings', () => {
  it('the window setting offers it and says what it is', () => {
    const window = SETTINGS.find((s) => s.field === 'window');
    expect(window?.values).toEqual(['slider', 'hung', 'frame', 'shutter', 'tilt']);
    expect(window?.help).toContain('behind a roller shutter');
  });

  it('read by the page: its edges and a rail’s sizes, and a wall planned in them', () => {
    const values = { ...toFormValues(EXAMPLE_PARAMS), window: 'shutter', topEdge: 'sash', bottomEdge: 'sill' };
    const r = readParams({ ...values, trackWidthMm: '9', leftDepthMm: '20', rightDepthMm: '20' });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    expect(r.params.edges.window).toBe('shutter');
    expect(planWall(r.params).pieces.length).toBeGreaterThan(0);
  });

  it('in a settings file, the window type sets the rail’s sizes too; sizes given with it change them', () => {
    const p = settings({ ...OPENING, edges: { window: 'shutter' } });
    expect(p.edges.roles).toEqual(WINDOW_PRESETS.shutter);
    expect(p.edges.track).toEqual(SHUTTER_TRACK);
    const wider = settings({ ...OPENING, edges: { window: 'shutter', track: { widthMm: 12 } } });
    expect(wider.edges.track).toEqual({ ...SHUTTER_TRACK, widthMm: 12 });
    // Another window type keeps the example track.
    expect(settings({ ...OPENING, edges: { window: 'hung' } }).edges.track).toEqual(EXAMPLE_TRACK);
  });

  it('as the command’s override, the window type sets the rail’s sizes; a size given with it wins', () => {
    expect(settings(OPENING, { window: 'shutter' }).edges.track).toEqual(SHUTTER_TRACK);
    expect(settings(OPENING, { window: 'shutter', leftDepthMm: '25' }).edges.track.depthMm.left).toBe(25);
    expect(settings(OPENING, { window: 'shutter', trackWidthMm: '14' }).edges.track.widthMm).toBe(14);
  });
});

describe('the plan', () => {
  it('says how the strips sit in the rails, to lower the shutter only onto the wall, and what to do in a storm', () => {
    const p = settings({ ...OPENING, edges: { window: 'shutter' } });
    expect(describePlan(planWall(p), p).shutter).toEqual([SHUTTER_LINE]);
    const deeper = settings({ ...OPENING, edges: { window: 'shutter', track: { depthMm: { right: 25 } } } });
    expect(describePlan(planWall(deeper), deeper).shutter[0]).toContain('sit 20 and 25 mm into the rails');
  });

  it('has no such line for another window', () => {
    expect(describePlan(planWall(EXAMPLE_PARAMS), EXAMPLE_PARAMS).shutter).toEqual([]);
    const hung = settings({ ...OPENING, edges: { window: 'hung' } });
    expect(describePlan(planWall(hung), hung).shutter).toEqual([]);
  });
});
