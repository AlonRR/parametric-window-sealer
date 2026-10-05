// Every setting on the page as a flag (Q90), named after the page's field and described in
// the page's words. `path` is where the same setting sits in a --params file, which has the
// library's own shape (Q85).
import type { FieldName, Params } from 'parametric-window-sealer';

export interface SettingFlag {
  flag: string; // without the leading dashes
  field: FieldName; // the page's field, and the library's name for it in errors
  path: string; // in a --params file
  help: string;
  values?: readonly string[]; // a choice; otherwise a length in mm
}

const DIVISION = ['equal', 'full-plus-filler'] as const;
const FILLER = ['start', 'end', 'middle', 'split'] as const;
const LEFTOVER = ['spread', 'equal', 'shorten'] as const;
const ROLE = ['track', 'sash', 'sill'] as const;

const axis = (name: 'width' | 'height'): SettingFlag[] => [
  {
    flag: `${name}-mode`,
    field: `${name}Mode`,
    path: `${name}.mode`,
    help: `Dividing the ${name}: equal pieces, or full pieces plus one filler.`,
    values: DIVISION,
  },
  {
    flag: `${name}-filler`,
    field: `${name}Filler`,
    path: `${name}.filler`,
    help: `With full-plus-filler: where the ${name}'s filler goes.`,
    values: FILLER,
  },
  {
    flag: `${name}-leftover`,
    field: `${name}Leftover`,
    path: `${name}.leftover`,
    help: `When full pieces leave too little for a joint: what to do instead.`,
    values: LEFTOVER,
  },
];

const edge = (name: 'top' | 'bottom' | 'left' | 'right'): SettingFlag => ({
  flag: `${name}-edge`,
  field: `${name}Edge`,
  path: `edges.roles.${name}`,
  help: `The ${name} edge: in a track, pressed by the sash, or on a flat sill.`,
  values: ROLE,
});

const depth = (name: 'top' | 'bottom' | 'left' | 'right'): SettingFlag => ({
  flag: `${name}-depth`,
  field: `${name}DepthMm`,
  path: `edges.track.depthMm.${name}`,
  help: `How deep the ${name} track is; used when that edge is in a track.`,
});

export const SETTING_FLAGS: readonly SettingFlag[] = [
  { flag: 'width', field: 'openingWidthMm', path: 'openingWidthMm', help: 'The opening you can see: its width. Required.' },
  { flag: 'height', field: 'openingHeightMm', path: 'openingHeightMm', help: 'The opening you can see: its height. Required.' },
  {
    flag: 'printer',
    field: 'printer',
    path: 'printer.kind',
    help: 'The largest piece to print: default (200 × 200 mm) or custom.',
    values: ['default', 'custom'],
  },
  { flag: 'printer-width', field: 'customWidthMm', path: 'printer.widthMm', help: "A custom printer's largest piece: its width." },
  { flag: 'printer-height', field: 'customHeightMm', path: 'printer.heightMm', help: "A custom printer's largest piece: its height." },
  ...axis('width'),
  ...axis('height'),
  { flag: 'thickness', field: 'thicknessMm', path: 'thicknessMm', help: 'Panel thickness.' },
  { flag: 'slot', field: 'slotMm', path: 'joint.slotMm', help: 'How deep a piece can go into a strip.' },
  { flag: 'slide', field: 'slideMm', path: 'joint.slideMm', help: 'How far a piece can move in its slot.' },
  { flag: 'web', field: 'webMm', path: 'joint.webMm', help: "The wall between the strip's two slots." },
  { flag: 'flange', field: 'flangeMm', path: 'joint.flangeMm', help: 'Each face of the strip, over the panel.' },
  { flag: 'fit', field: 'fitMm', path: 'joint.fitMm', help: 'Clearance between each panel face and the strip.' },
  {
    flag: 'window',
    field: 'window',
    path: 'edges.window',
    help: 'Window type; sets the four edges as the page does.',
    values: ['slider', 'hung'],
  },
  edge('top'),
  edge('bottom'),
  edge('left'),
  edge('right'),
  { flag: 'track-width', field: 'trackWidthMm', path: 'edges.track.widthMm', help: 'Track width; every edge strip is this wide.' },
  depth('top'),
  depth('bottom'),
  depth('left'),
  depth('right'),
  {
    flag: 'track-clearance',
    field: 'trackClearanceMm',
    path: 'edges.track.clearanceMm',
    help: 'Clearance in the track, per side.',
  },
];

// The value at a dotted path, such as `edges.track.widthMm`; undefined if it is not there.
export function settingAt(params: Params | Record<string, unknown>, path: string): unknown {
  let value: unknown = params;
  for (const key of path.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}
