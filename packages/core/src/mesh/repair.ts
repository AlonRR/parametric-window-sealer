// A read mesh made sound, or refused (mesh-import, #42). What can be repaired without guessing the
// shape is, and said: corners at the same place welded into one, faces of no area dropped, faces
// turned to face the same way as their neighbours, and each part turned to face outward. What
// cannot be repaired without guessing is refused, saying what to do: a hole (an edge with one face),
// an edge shared by more than two faces, a part that cannot face one way.
import type { RawMesh } from './formats.js';

export interface ImportedMesh {
  format: RawMesh['format'];
  positions: Float32Array; // x, y, z of each corner, in mm
  triangles: Uint32Array; // three corner indices a face, counter-clockwise seen from outside
  sizeMm: [number, number, number]; // its box: across, deep, high
  repairs: string[]; // what was repaired, in the plan's words
  notes: string[]; // what may be wrong but was not changed: its size
}

export type MeshRead = { ok: true; mesh: ImportedMesh } | { ok: false; message: string };

const WELD_MM = 1e-5; // corners closer than this, a hundredth of a micron, are one corner
const REPAIR_HINT = 'with your modelling program or your slicer’s repair.';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const significant = (v: number) => String(Number(v.toPrecision(3)));
const refuse = (message: string): MeshRead => ({ ok: false, message });
// An edge's name, the same whichever way it runs.
const edgeKey = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`);

export function repairMesh(raw: RawMesh): MeshRead {
  if (!raw.positions.every(Number.isFinite)) return refuse('The mesh has a corner that is not a number.');

  // Corners at the same place, one corner.
  const index = new Map<string, number>();
  const positions: number[] = [];
  const welded: number[] = [];
  for (let v = 0; v < raw.positions.length; v += 3) {
    const [x, y, z] = [raw.positions[v] ?? 0, raw.positions[v + 1] ?? 0, raw.positions[v + 2] ?? 0];
    const place = `${Math.round(x / WELD_MM)},${Math.round(y / WELD_MM)},${Math.round(z / WELD_MM)}`;
    let at = index.get(place);
    if (at === undefined) {
      at = positions.length / 3;
      index.set(place, at);
      positions.push(x, y, z);
    }
    welded.push(at);
  }
  const corner = (i: number): [number, number, number] => [
    positions[3 * i] ?? 0,
    positions[3 * i + 1] ?? 0,
    positions[3 * i + 2] ?? 0,
  ];

  // Faces of no area, dropped.
  const faces: [number, number, number][] = [];
  let flat = 0;
  for (let t = 0; t + 2 < raw.triangles.length; t += 3) {
    const at = (k: number) => welded[raw.triangles[t + k] ?? 0] ?? 0;
    const [a, b, c] = [at(0), at(1), at(2)];
    const [p, q, r] = [corner(a), corner(b), corner(c)];
    const [ux, uy, uz] = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const [vx, vy, vz] = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    const area2 = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    if (a === b || b === c || a === c || area2 <= 1e-12) flat++;
    else faces.push([a, b, c]);
  }
  if (faces.length === 0) return refuse('The mesh has no faces with any area.');

  // Each edge's faces. A closed, sound surface has every edge in exactly two faces.
  const edges = new Map<string, number[]>();
  for (const [f, [a, b, c]] of faces.entries()) {
    for (const [u, v] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const list = edges.get(edgeKey(u, v)) ?? [];
      list.push(f);
      edges.set(edgeKey(u, v), list);
    }
  }
  const counts = [...edges.values()].map((list) => list.length);
  const shared = counts.filter((n) => n > 2).length;
  if (shared > 0) {
    return refuse(
      `The mesh has ${plural(shared, 'edge', 'edges')} shared by more than two faces, so it has no clear inside: ` +
        `repair it first, ${REPAIR_HINT}`,
    );
  }
  const open = counts.filter((n) => n === 1).length;
  if (open > 0) {
    return refuse(
      `The mesh is not closed: ${plural(open, 'edge belongs', 'edges belong')} to one face only. Close its holes ` +
        `first, ${REPAIR_HINT}`,
    );
  }

  // Faces turned to agree with their neighbours, part by part: two faces sharing an edge run along
  // it in opposite directions.
  const turned = faces.map(() => false);
  const part = faces.map(() => -1);
  const runs = (f: number, u: number, v: number) => {
    const [a, b, c] = faces[f] ?? [0, 0, 0];
    const forward = (a === u && b === v) || (b === u && c === v) || (c === u && a === v);
    return forward !== (turned[f] ?? false); // as it now stands
  };
  let parts = 0;
  for (const [seed] of faces.entries()) {
    if ((part[seed] ?? -1) >= 0) continue;
    part[seed] = parts;
    const queue = [seed];
    while (queue.length > 0) {
      const f = queue.pop() ?? 0;
      const [a, b, c] = faces[f] ?? [0, 0, 0];
      for (const [u, v] of [
        [a, b],
        [b, c],
        [c, a],
      ] as const) {
        const forward = runs(f, u, v) ? [u, v] : [v, u];
        for (const g of edges.get(edgeKey(u, v)) ?? []) {
          if (g === f) continue;
          const agrees = !runs(g, forward[0] ?? 0, forward[1] ?? 0);
          if ((part[g] ?? -1) < 0) {
            part[g] = parts;
            if (!agrees) turned[g] = true;
            queue.push(g);
          } else if (!agrees) {
            return refuse(
              `The mesh cannot be made to face one way, so it has no clear inside: repair it first, ${REPAIR_HINT}`,
            );
          }
        }
      }
    }
    parts++;
  }

  // Each part facing outward: its volume, by its faces as they now stand, positive.
  const volumes = Array.from({ length: parts }, () => 0);
  for (const [f, [a, b, c]] of faces.entries()) {
    const [p, q, r] = turned[f] ? [corner(a), corner(c), corner(b)] : [corner(a), corner(b), corner(c)];
    const v =
      (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) /
      6;
    volumes[part[f] ?? 0] = (volumes[part[f] ?? 0] ?? 0) + v;
  }
  for (const f of faces.keys()) if ((volumes[part[f] ?? 0] ?? 0) < 0) turned[f] = !turned[f];

  // What changed, against the file: a part all of whose faces turned was inside out; otherwise
  // the faces that turned were turned the wrong way.
  const sizes = Array.from({ length: parts }, () => 0);
  const flipped = Array.from({ length: parts }, () => 0);
  for (const f of faces.keys()) {
    sizes[part[f] ?? 0] = (sizes[part[f] ?? 0] ?? 0) + 1;
    if (turned[f]) flipped[part[f] ?? 0] = (flipped[part[f] ?? 0] ?? 0) + 1;
  }
  const insideOut = flipped.filter((n, p) => n > 0 && n === sizes[p]).length;
  const faceTurns = flipped.reduce((sum, n, p) => (n > 0 && n !== sizes[p] ? sum + n : sum), 0);
  const repairs: string[] = [];
  if (flat > 0) repairs.push(`${plural(flat, 'face', 'faces')} with no area dropped`);
  if (faceTurns > 0) {
    repairs.push(
      `${plural(faceTurns, 'face turned to face the same way as its', 'faces turned to face the same way as their')} neighbours`,
    );
  }
  if (insideOut > 0) {
    repairs.push(
      parts === 1
        ? 'the mesh turned inside out, so it faces outward'
        : `${plural(insideOut, 'part turned inside out, so it faces', 'parts turned inside out, so they face')} outward`,
    );
  }

  const triangles = new Uint32Array(3 * faces.length);
  for (const [f, [a, b, c]] of faces.entries()) triangles.set(turned[f] ? [a, c, b] : [a, b, c], 3 * f);
  const lows = [Infinity, Infinity, Infinity];
  const highs = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < positions.length; v++) {
    const axis = v % 3;
    lows[axis] = Math.min(lows[axis] ?? 0, positions[v] ?? 0);
    highs[axis] = Math.max(highs[axis] ?? 0, positions[v] ?? 0);
  }
  const side = (a: number) => Math.round(((highs[a] ?? 0) - (lows[a] ?? 0)) * 1e6) / 1e6;
  const sizeMm: [number, number, number] = [side(0), side(1), side(2)];
  const largest = Math.max(...sizeMm);
  const box = sizeMm.map(significant).join(' × ');
  const notes =
    largest < 1
      ? [`It is ${box} mm: if it was drawn in metres or inches, scale it to mm before importing.`]
      : largest > 10_000
        ? [`It is ${box} mm, over 10 m: if it was drawn in a smaller unit, scale it to mm before importing.`]
        : [];
  return {
    ok: true,
    mesh: { format: raw.format, positions: new Float32Array(positions), triangles, sizeMm, repairs, notes },
  };
}
