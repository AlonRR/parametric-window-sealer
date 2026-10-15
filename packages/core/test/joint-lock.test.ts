// A tighter joint that locks (joint-lock, #110), from the design review against published work.
// The strips hold the panels by crush ribs on the insides of their flanges, which reach a little
// past the panel's faces and are squeezed when it is pushed in, rather than by an exact fit. A pin
// of filament goes through each strip's middle and through a slot in the piece, so a piece cannot
// pull out of its strip but can still slide. A test coupon tries several grips side by side.
import { describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import {
  DEFAULT_JOINT,
  EXAMPLE_PARAMS,
  PIN_HOLE_MM,
  PIN_MM,
  PIN_SLOT_MM,
  buildExport,
  buildPiecesWith,
  couponGrips,
  couponShape,
  couponSolid,
  describePlan,
  partName,
  pinDepthMm,
  pinLengthMm,
  pinSlotRangeMm,
  pinSlotsIn,
  planFiles,
  planParts,
  planPins,
  planWall,
  readParams,
  ribPlacesMm,
  stripSolid,
  toFormValues,
  tpuJoint,
  loadEngine,
} from '../src/index.js';
import type { FormValues, JointParams } from '../src/index.js';

const engine = await loadEngine();
const T = 3; // panel thickness
const W = 18; // strip width: two 8 mm slots and a 2 mm web
const PLAIN: JointParams = { ...DEFAULT_JOINT, gripMm: 0, pins: false };

// How much of the solid fills a small cube centred here.
const probe = (solid: Manifold, x: number, y: number, z: number, size = 0.1) => {
  const cube = engine.Manifold.cube([size, size, size], true).translate([x, y, z]);
  const both = cube.intersect(solid);
  const v = both.volume();
  both.delete();
  cube.delete();
  return v;
};

describe('the joint’s starting values', () => {
  it('grip each panel face by 0.15 mm at the ribs, and pin each strip', () => {
    expect(DEFAULT_JOINT).toEqual({
      slotMm: 8,
      slideMm: 3,
      webMm: 2,
      flangeMm: 1.6,
      fitMm: 0.2,
      gripMm: 0.15,
      pins: true,
    });
    // A pin is 1.75 mm filament: snug in the strip, free to slide in the piece.
    expect([PIN_MM, PIN_HOLE_MM, PIN_SLOT_MM]).toEqual([1.75, 1.8, 2]);
  });

  it('in TPU, the strip grips by its narrow slot instead, so it has no ribs', () => {
    expect(tpuJoint(DEFAULT_JOINT)).toEqual({ ...DEFAULT_JOINT, fitMm: -0.1, gripMm: 0 });
  });
});

describe('the crush ribs', () => {
  it('are an even number along a strip, about one in each 25 mm, never at its middle', () => {
    expect(ribPlacesMm(18)).toEqual([4.5, 13.5]);
    expect(ribPlacesMm(60)).toEqual([15, 45]);
    expect(ribPlacesMm(100)).toEqual([12.5, 37.5, 62.5, 87.5]);
    expect(ribPlacesMm(180)).toEqual([11.25, 33.75, 56.25, 78.75, 101.25, 123.75, 146.25, 168.75]);
  });

  it('stand on the inside of both flanges, in both slots, reaching the grip past the panel’s faces', () => {
    // Lying along x, as it runs along a horizontal joint: across the strip is y, the panel lies
    // from z = 0 to 3 and the flanges' inner faces are the fit, 0.2 mm, beyond it.
    const s = stripSolid(engine, 100, DEFAULT_JOINT, T, 'wall-horizontal');
    try {
      for (const y of [4, 14]) {
        expect(probe(s, 12.5, y, 0.1), `rib under the panel at y ${y}`).toBeGreaterThan(0);
        expect(probe(s, 12.5, y, 2.9), `rib over the panel at y ${y}`).toBeGreaterThan(0);
        expect(probe(s, 25, y, 0.1), `none between the ribs at y ${y}`).toBe(0);
        // A rib is a ridge 1 mm across at its foot, coming to a point at the grip.
        expect(probe(s, 12.5 + 0.4, y, -0.15, 0.05), `its foot at y ${y}`).toBeGreaterThan(0);
        expect(probe(s, 12.5 + 0.4, y, 0.1, 0.05), `narrow at its tip at y ${y}`).toBe(0);
      }
      // Each rib reaches 0.15 mm into the panel's place, no further.
      expect(probe(s, 12.5, 4, 0.12, 0.02)).toBeGreaterThan(0);
      expect(probe(s, 12.5, 4, 0.18, 0.02)).toBe(0);
      // At the slot's mouth a rib starts flush and rises over 1 mm, so the panel finds its way in.
      expect(probe(s, 12.5, 0.2, 0.1)).toBe(0);
      expect(probe(s, 12.5, 1.5, 0.1)).toBeGreaterThan(0);
      expect(probe(s, 12.5, W - 0.2, 0.1)).toBe(0);
    } finally {
      s.delete();
    }
  });

  it('are squeezed by a panel pushed in, and a strip without grip leaves it the fit (control)', () => {
    const panel = engine.Manifold.cube([100, 20, T]).translate([0, W - 6.5, 0]);
    const ribbed = stripSolid(engine, 100, { ...DEFAULT_JOINT, pins: false }, T, 'wall-horizontal');
    const plain = stripSolid(engine, 100, PLAIN, T, 'wall-horizontal');
    try {
      const squeezed = ribbed.intersect(panel);
      const none = plain.intersect(panel);
      // Four places, a rib under and over the panel at each. A rib is a triangle 1 mm across and
      // 0.35 mm tall (the fit and the grip); the panel, 6.5 mm in, overlaps its tip, 0.15 mm tall,
      // over 5.5 mm. Over the 1 mm in from the mouth the rib is the same triangle growing from a
      // point, so the tip it puts past the panel's face shrinks to nothing there.
      const [h, f] = [0.35, 0.2];
      const tip = (0.5 * (h - f) ** 2) / h;
      const lead = (h - f) ** 3 / (6 * h * h);
      expect(squeezed.volume()).toBeCloseTo(4 * 2 * (tip * 5.5 + lead), 3);
      expect(none.volume()).toBe(0);
      squeezed.delete();
      none.delete();
      // Without grip the strip is the plain H, as before.
      expect(plain.volume()).toBeCloseTo(100 * (2 * 1.6 * W + 2 * (T + 0.4)), 6);
      expect(plain.genus()).toBe(0);
    } finally {
      for (const m of [panel, ribbed, plain]) m.delete();
    }
  });

  it('stand upright as the strip prints, so they print as ridges up its flanges', () => {
    const s = stripSolid(engine, 100, { ...DEFAULT_JOINT, pins: false }, T, 'print');
    try {
      const { min, max } = s.boundingBox();
      expect([...min, ...max].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, 0, 100, 6.6, W]);
      // Seen from above at any height in a slot, a rib stands out from each flange's inner face.
      for (const z of [4, 14]) {
        expect(probe(s, 12.5, 1.6 + 0.1, z)).toBeGreaterThan(0);
        expect(probe(s, 12.5, 6.6 - 1.6 - 0.1, z)).toBeGreaterThan(0);
      }
    } finally {
      s.delete();
    }
  });
});

describe('the pins', () => {
  it('sit halfway between a slot’s mouth and where the slide stops, as long as the strip is thick', () => {
    expect(pinDepthMm(DEFAULT_JOINT)).toBe(2.5);
    expect(pinLengthMm(DEFAULT_JOINT, T)).toBeCloseTo(6.6, 9);
    // In the piece, the pin's centre can be anywhere the slide takes it: from 2.5 mm in from its
    // edge, spread out, to 5.5 mm, pushed home.
    expect(pinSlotRangeMm(DEFAULT_JOINT)).toEqual({ fromMm: 2.5, toMm: 5.5 });
  });

  it('go through both flanges at the strip’s middle, one in each slot', () => {
    const s = stripSolid(engine, 100, DEFAULT_JOINT, T, 'wall-horizontal');
    try {
      // Each pin goes through two flanges, into the open slot between them: four holes.
      expect(s.genus()).toBe(4);
      for (const y of [2.5, W - 2.5]) {
        for (const z of [-1, 4]) expect(probe(s, 50, y, z), `hole at y ${y}, z ${z}`).toBe(0);
        expect(probe(s, 50 + 0.85, y, -1, 0.05), `hole's edge at y ${y}`).toBe(0);
        expect(probe(s, 50 + 0.95, y, -1, 0.05), `flange beyond the hole at y ${y}`).toBeGreaterThan(0);
      }
      expect(probe(s, 50, 9, -1)).toBeGreaterThan(0); // none in the web's place
    } finally {
      s.delete();
    }
  });

  it('are planned two to a strip, each in one piece', () => {
    const { plan, joints } = planParts(EXAMPLE_PARAMS);
    const pins = planPins(joints, DEFAULT_JOINT);
    expect(pins).toHaveLength(2 * joints.strips.length);
    const [strip] = joints.strips;
    if (strip === undefined) throw new Error('no strip');
    const [a, b] = pins;
    const middle = strip.lengthMm / 2;
    if (strip.axis === 'vertical') {
      expect([a, b]).toEqual([
        { axis: 'vertical', xMm: strip.xMm + 2.5, yMm: strip.yMm + middle },
        { axis: 'vertical', xMm: strip.xMm + W - 2.5, yMm: strip.yMm + middle },
      ]);
    } else throw new Error('the example’s first strip is vertical');
    for (const pin of pins) {
      const inside = plan.pieces.filter(
        (c) => pin.xMm > c.xMm && pin.xMm < c.xMm + c.widthMm && pin.yMm > c.yMm && pin.yMm < c.yMm + c.heightMm,
      );
      expect(inside, `pin at ${pin.xMm}, ${pin.yMm}`).toHaveLength(1);
    }
    expect(planPins(joints, { ...DEFAULT_JOINT, pins: false })).toEqual([]);
  });

  it('meet a slot in each piece along the edges it shares, as long as the slide', () => {
    const { plan, joints } = planParts(EXAMPLE_PARAMS);
    const pins = planPins(joints, DEFAULT_JOINT);
    const corner = plan.pieces.find((c) => c.column === 0 && c.row === 0);
    if (corner === undefined) throw new Error('no piece');
    const slots = pinSlotsIn(corner, pins);
    // The bottom-left piece shares its right and top edges; the wall's edges have no strip.
    expect(slots.map((s) => s.edge).sort()).toEqual(['right', 'top']);
    const right = slots.find((s) => s.edge === 'right');
    const strip = joints.strips.find((s) => s.axis === 'vertical' && s.xMm > corner.xMm && s.yMm < corner.heightMm);
    expect(right?.alongMm).toBeCloseTo((strip?.yMm ?? 0) + (strip?.lengthMm ?? 0) / 2 - corner.yMm, 9);
  });

  it('are cut through the piece: a slot across each shared edge, the slide long, 1.5 mm in from it', () => {
    const params = EXAMPLE_PARAMS;
    const { plan, joints } = planParts(params);
    const pins = planPins(joints, params.joint);
    const built = buildPiecesWith(engine, plan, T, [], undefined, { joint: params.joint, pins });
    try {
      const i = plan.pieces.findIndex((c) => c.column === 0 && c.row === 0);
      const cell = plan.pieces[i];
      const piece = built[i];
      if (cell === undefined || piece === undefined) throw new Error('no piece');
      expect(piece.solid.genus()).toBe(2);
      const right = pinSlotsIn(cell, pins).find((s) => s.edge === 'right');
      if (right === undefined) throw new Error('no slot');
      const x = (inFromEdge: number) => cell.widthMm - inFromEdge;
      const y = right.alongMm;
      for (const d of [2.5, 4, 5.5]) expect(probe(piece.solid, x(d), y, 1.5), `${d} mm in`).toBe(0);
      expect(probe(piece.solid, x(1.3), y, 1.5)).toBeGreaterThan(0); // what holds the pin in
      expect(probe(piece.solid, x(6.7), y, 1.5)).toBeGreaterThan(0);
      expect(probe(piece.solid, x(4), y + 1.1, 1.5)).toBeGreaterThan(0); // 2 mm wide
      expect(probe(piece.solid, x(4), y + 0.9, 1.5)).toBe(0);
    } finally {
      for (const b of built) b.solid.delete();
    }
  });
});

describe('the download', () => {
  it('has the slots in its pieces and the holes in its strips', () => {
    const { pieces, parts } = buildExport(engine, EXAMPLE_PARAMS);
    const solidOf = (mesh: { positions: Float32Array; triangles: Uint32Array }) => {
      const m = new engine.Mesh({ numProp: 3, vertProperties: mesh.positions, triVerts: mesh.triangles });
      m.merge();
      return new engine.Manifold(m);
    };
    const genus = (mesh: { positions: Float32Array; triangles: Uint32Array }) => {
      const solid = solidOf(mesh);
      const g = solid.genus();
      solid.delete();
      return g;
    };
    // A corner piece shares two edges, a piece in the middle of the 3 × 5 wall four.
    const piece = (column: number, row: number) => pieces.find((p) => p.cell.column === column && p.cell.row === row);
    expect(genus(piece(0, 0)?.mesh ?? { positions: new Float32Array(), triangles: new Uint32Array() })).toBe(2);
    expect(genus(piece(1, 2)?.mesh ?? { positions: new Float32Array(), triangles: new Uint32Array() })).toBe(4);
    const strip = parts.find((p) => p.name.startsWith('strip-'));
    // Two through each flange for the pins, and in rain (#117) a weep hole each side of the web at four places.
    expect(strip && genus(strip.mesh)).toBe(4 + 8);
  });
});

describe('the joint’s settings', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => readParams({ ...example, ...over });

  it('read the grip and the pins, and write them back', () => {
    expect([example.gripMm, example.pins, example.coupon]).toEqual(['0.15', 'yes', 'no']);
    const r = read({ gripMm: '0.25', pins: 'no', coupon: 'yes' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.params.joint).toEqual({ ...DEFAULT_JOINT, gripMm: 0.25, pins: false });
      expect(r.params.coupon).toBe(true);
      expect(readParams(toFormValues(r.params))).toEqual(r);
    }
    expect(read({ gripMm: '0' }).ok).toBe(true);
    expect(read({ gripMm: '-0.1' })).toMatchObject({ ok: false, errors: { gripMm: expect.any(String) } });
    expect(read({ pins: 'maybe' })).toMatchObject({ ok: false, errors: { pins: expect.any(String) } });
  });

  it('refuse pins with too little slot left beyond the slide to hold them', () => {
    const short = read({ slotMm: '8', slideMm: '4.5' });
    expect(short).toMatchObject({ ok: false });
    if (!short.ok) {
      expect(short.errors.pins).toBe(
        'A pin needs the slot at least 4 mm deeper than the slide; this one is 3.5 mm deeper. Make the slot ' +
          'deeper or the slide shorter, or turn the pins off.',
      );
    }
    expect(read({ slotMm: '8', slideMm: '4.5', pins: 'no' }).ok).toBe(true);
    expect(read({ slotMm: '8', slideMm: '4' }).ok).toBe(true);
  });
});

describe('the plan and the files', () => {
  const example = toFormValues(EXAMPLE_PARAMS);
  const read = (over: FormValues) => {
    const r = readParams({ ...example, ...over });
    if (!r.ok) throw new Error(JSON.stringify(r.errors));
    return r.params;
  };

  it('say how many pins to cut, and how long', () => {
    const params = read({});
    expect(describePlan(planWall(params), params).joints).toBe(
      'Joints: 22 strips in 2 lengths, and 8 cross pieces; each joint 5 mm wide. Pins: 44, each 6.6 mm of ' +
        '1.75 mm filament, two through the middle of each strip.',
    );
    const unpinned = read({ pins: 'no' });
    expect(describePlan(planWall(unpinned), unpinned).joints).toBe(
      'Joints: 22 strips in 2 lengths, and 8 cross pieces; each joint 5 mm wide.',
    );
  });

  it('add the coupon to the download only when asked, and say what each section grips', () => {
    const name = 'coupon-grip-0.05-to-0.25-print-1.stl';
    const files = (params = read({})) => planFiles(params, { format: 'stl', packaging: 'separate' }).map((f) => f.name);
    expect(files()).not.toContain(name);
    const asked = read({ coupon: 'yes' });
    expect(files(asked)).toContain(name);
    expect(describePlan(planWall(asked), asked).joints).toContain(
      'Test coupon: 5 sections, marked with 1 to 5 notches, gripping by 0.05, 0.1, 0.15, 0.2 and 0.25 mm.',
    );
  });
});

describe('the test coupon', () => {
  it('tries the grip, two steps of 0.05 mm either side, and none below nothing', () => {
    expect(couponGrips(0.15)).toEqual([0.05, 0.1, 0.15, 0.2, 0.25]);
    expect(couponGrips(0.05)).toEqual([0, 0.05, 0.1, 0.15, 0.2]);
    expect(couponGrips(0.4)).toEqual([0.3, 0.35, 0.4, 0.45, 0.5]);
    expect(partName(couponShape(DEFAULT_JOINT))).toBe('coupon-grip-0.05-to-0.25-print-1');
  });

  it('prints as five short strips in a row, standing as a strip does, notched 1 to 5, and a tab beside them', () => {
    const solid = couponSolid(engine, couponShape(DEFAULT_JOINT), DEFAULT_JOINT, T);
    try {
      const { min, max } = solid.boundingBox();
      // The strips: 5 × 24 mm long, 6.6 mm thick, 18 mm tall; the tab, 30 × 16 mm, 5 mm off.
      expect([...min, ...max].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0, 0, 0, 120, 6.6 + 5 + 16, W]);
      // On the bed: the strips' flanges and the tab (the ribs start flush at the mouth).
      expect(solid.slice(0.05).area()).toBeCloseTo(2 * 1.6 * 120 + 30 * 16, 0);
      // The notches, 1 mm deep in the top of the flanges, k of them in section k.
      const notches = (k: number) => {
        let n = 0;
        for (let x = 24 * k + 0.25; x < 24 * (k + 1); x += 0.5) {
          if (probe(solid, x, 0.8, W - 0.5) === 0 && probe(solid, x - 0.5, 0.8, W - 0.5) > 0) n += 1;
        }
        return n;
      };
      expect([0, 1, 2, 3, 4].map(notches)).toEqual([1, 2, 3, 4, 5]);
      // Each section's ribs reach its own grip past the panel's face: 0.05 mm in the first,
      // 0.25 mm in the last, so a probe 0.1 mm past it meets only the later ones'.
      const rib = (k: number) => probe(solid, 24 * k + 6, 1.6 + 0.2 + 0.1, 4, 0.02);
      expect(rib(0)).toBe(0);
      expect(rib(4)).toBeGreaterThan(0);
      // No pin holes: the coupon is for the grip.
      expect(probe(solid, 12, 0.8, 2.5)).toBeGreaterThan(0);
    } finally {
      solid.delete();
    }
  });
});
