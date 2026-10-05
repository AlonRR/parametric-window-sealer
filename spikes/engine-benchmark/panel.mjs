// The Q22 test panel, built natively by each engine from ONE set of numbers.
//
// The sizes are EXAMPLES (owner's decision Q18: no personal measurements), chosen to be
// a typical single printed piece: a 200 x 200 x 3 mm plate with a 10 mm solid border and
// a honeycomb of hexagonal through-holes, 10 mm across the flats with 2 mm walls.

export const PANEL = {
  size: 200, // mm, square plate
  thickness: 3, // mm
  border: 10, // mm of solid edge on every side
  hexAF: 10, // mm across the flats of each hole
  wall: 2, // mm between neighbouring holes
};

// The same layout loop as panel.scad, operation for operation, so both engines place the
// same holes. bench-node.mjs proves they did (hole counts and a zero-volume difference).
export function holeCentres(p) {
  const r = p.hexAF / Math.sqrt(3); // circumradius: corner-to-centre
  const pitch = p.hexAF + p.wall; // centre spacing across the flats
  const dx = (pitch * Math.sqrt(3)) / 2; // column spacing
  const lo = p.border;
  const hi = p.size - p.border;
  const fits = (x, y) =>
    x - r >= lo && x + r <= hi && y - p.hexAF / 2 >= lo && y + p.hexAF / 2 <= hi;
  const out = [];
  for (let i = 0; i <= Math.floor(p.size / dx); i++) {
    for (let j = -1; j <= Math.floor(p.size / pitch) + 1; j++) {
      const x = p.border + r + i * dx;
      const y = p.border + p.hexAF / 2 + j * pitch + ((i % 2) * pitch) / 2;
      if (fits(x, y)) out.push([x, y]);
    }
  }
  return out;
}

// OpenSCAD -D arguments carrying the same numbers into panel.scad.
export function scadDefines(p) {
  return [
    ['size', p.size],
    ['thickness', p.thickness],
    ['border', p.border],
    ['hex_af', p.hexAF],
    ['wall', p.wall],
  ].flatMap(([k, v]) => ['-D', `${k}=${v}`]);
}

// The panel in Manifold: a plate minus the union of hexagonal prisms. The prisms run
// 1 mm past both faces so no cut face is coplanar with the plate.
export function buildWithManifold(wasm, p) {
  const { Manifold } = wasm;
  const r = p.hexAF / Math.sqrt(3);
  const plate = Manifold.cube([p.size, p.size, p.thickness]);
  const prisms = holeCentres(p).map(([x, y]) =>
    Manifold.cylinder(p.thickness + 2, r, r, 6).translate([x, y, -1]),
  );
  const holes = Manifold.union(prisms);
  const panel = plate.subtract(holes);
  for (const m of [plate, holes, ...prisms]) m.delete();
  return panel;
}
