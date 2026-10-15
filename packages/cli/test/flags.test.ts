// Every setting on the page has a flag (Q90). The page's form is the list: if the library
// grows a field, the command must grow a flag, or this fails.
import { describe, expect, it } from 'vitest';
import { EXAMPLE_PARAMS, readParams, toFormValues } from 'parametric-window-sealer';
import type { Params } from 'parametric-window-sealer';
import { SETTING_FLAGS, settingAt } from '../src/flags.js';

const LISTED_PRINTER: Params = { ...EXAMPLE_PARAMS, printer: { kind: 'model', id: 'prusa-mk4s' } };
const CUSTOM_PRINTER: Params = { ...EXAMPLE_PARAMS, printer: { kind: 'custom', widthMm: 250, heightMm: 210 } };

// A model of the appliance, for the settings read only with one: a binary STL box 120 × 50 × 80 mm,
// in base64 as the setting holds it.
function boxFile(): string {
  const corners = [0, 0, 0, 120, 0, 0, 120, 50, 0, 0, 50, 0, 0, 0, 80, 120, 0, 80, 120, 50, 80, 0, 50, 80];
  const faces = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
  ];
  const bytes = Buffer.alloc(84 + 50 * 12);
  bytes.writeUInt32LE(12, 80);
  faces.forEach((c, i) => {
    for (let a = 0; a < 3; a++) {
      bytes.writeFloatLE(corners[3 * c + a] ?? 0, 84 + 50 * Math.floor(i / 3) + 12 + 12 * (i % 3) + 4 * a);
    }
  });
  return bytes.toString('base64');
}

describe('the setting flags (Q90)', () => {
  it('one flag for each field of the page, and none without one', () => {
    const fields = Object.keys(toFormValues(EXAMPLE_PARAMS)).sort();
    expect(SETTING_FLAGS.map((f) => f.field).sort()).toEqual(fields);
  });

  it('no two flags share a name', () => {
    const names = SETTING_FLAGS.map((f) => f.flag);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(SETTING_FLAGS.map((f) => [f.flag, f] as const))(
    '--%s: its place in a --params file holds the value the page shows',
    (_flag, f) => {
      const params = f.field.startsWith('custom')
        ? CUSTOM_PRINTER
        : f.field === 'printerModel'
          ? LISTED_PRINTER
          : EXAMPLE_PARAMS;
      const value = settingAt(params, f.path);
      // A place for the tape is true or false in the file, yes or no as a flag.
      expect(f.onOff ? (value === true ? 'yes' : 'no') : String(value)).toBe(toFormValues(params)[f.field]);
    },
  );

  const choices = SETTING_FLAGS.filter((f) => f.values !== undefined);
  it('the choices are the ones the page offers', () => {
    expect(choices.map((f) => f.flag)).toEqual([
      'printer',
      'printer-model',
      'width-mode',
      'width-filler',
      'width-leftover',
      'height-mode',
      'height-filler',
      'height-leftover',
      'wall',
      'pieces',
      'material',
      'colour',
      'sun',
      'rain',
      'stiffen',
      'joint-style', // puzzle dovetails (#29)
      'pins',
      'coupon',
      'window',
      'top-edge',
      'bottom-edge',
      'left-edge',
      'right-edge',
      'port-lock',
      'port-cap',
      'port-screen',
      'seal',
      'tape-sides',
      'tape-port',
      'tpu-joints',
      'fill',
      'fill-style',
      'mesh-tile-view', // the side of a 3D tile facing the room (#40)
      'model-view', // the side of a model facing the room (#35)
    ]);
  });

  it.each(choices.map((f) => [f.flag, f] as const))('--%s: every listed value is accepted', (_flag, f) => {
    // A listed printer's id is read only for a listed printer: the starting values hold one,
    // and --printer-model's own test picks the list.
    const base = {
      ...toFormValues(CUSTOM_PRINTER),
      printerModel: 'prusa-mk4s',
      ...(f.field === 'printerModel' ? { printer: 'model' } : {}),
      // read only with tape; joints in TPU, with the TPU seal (C38)
      ...(f.path.startsWith('seal.tape.') ? { seal: f.field === 'tpuJoints' ? 'tpu' : 'tape' } : {}),
      ...(f.path.startsWith('fill.') && f.path !== 'fill.kind' ? { fill: 'grid' } : {}), // and with a pattern
      ...(f.field === 'wall' ? { thicknessMm: '10' } : {}), // a double wall needs panels thick enough
      ...(f.path.startsWith('edges.roles.') ? { seal: 'tpu' } : {}), // an edge in a frame, a TPU gasket
      ...(f.path.startsWith('model.') ? { modelFile: boxFile() } : {}), // read only with a model
      ...(f.path.startsWith('fill.') ? { fillMeshFile: boxFile() } : {}), // a 3D tile's, read only with it
      ...(f.path.startsWith('fill.mesh.') ? { fill: 'mesh' } : {}),
    };
    for (const value of f.values ?? []) {
      expect(readParams({ ...base, [f.field]: value })).toMatchObject({ ok: true });
    }
    const wrong = readParams({ ...base, [f.field]: 'not-a-choice' });
    expect(wrong.ok).toBe(false);
  });
});
