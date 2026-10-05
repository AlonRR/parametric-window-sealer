// Every setting on the page as a flag (Q90), named after the page's field. What each setting
// is, where it sits in a --params file and its choices come from the library's SETTINGS, so
// the command and the MCP server describe them alike.
import { SETTINGS } from 'parametric-window-sealer';
import type { FieldName, Setting } from 'parametric-window-sealer';

export { settingAt } from 'parametric-window-sealer';

export interface SettingFlag extends Setting {
  flag: string; // without the leading dashes
}

// A Record over every field, so a field the library adds without a flag fails the type check.
const FLAG_NAMES: Record<FieldName, string> = {
  openingWidthMm: 'width',
  openingHeightMm: 'height',
  printer: 'printer',
  printerModel: 'printer-model', // makes the printer a listed one (Q115)
  bedMarginMm: 'bed-margin',
  customWidthMm: 'printer-width',
  customHeightMm: 'printer-height',
  widthMode: 'width-mode',
  widthFiller: 'width-filler',
  widthLeftover: 'width-leftover',
  heightMode: 'height-mode',
  heightFiller: 'height-filler',
  heightLeftover: 'height-leftover',
  thicknessMm: 'thickness',
  slotMm: 'slot',
  slideMm: 'slide',
  webMm: 'web',
  flangeMm: 'flange',
  fitMm: 'fit',
  window: 'window',
  topEdge: 'top-edge',
  bottomEdge: 'bottom-edge',
  leftEdge: 'left-edge',
  rightEdge: 'right-edge',
  trackWidthMm: 'track-width',
  topDepthMm: 'top-depth',
  bottomDepthMm: 'bottom-depth',
  leftDepthMm: 'left-depth',
  rightDepthMm: 'right-depth',
  trackClearanceMm: 'track-clearance',
  ports: 'port', // repeatable: one --port for each port (Q114)
  collarDepthMm: 'collar-depth',
  collarWallMm: 'collar-wall',
  collarClearanceMm: 'collar-clearance',
  collarLipMm: 'collar-lip',
  seal: 'seal', // none or tape (Q122)
  tapeWidthMm: 'tape-width', // a tape flag without --seal means tape, as a printer size means custom
  tapeThicknessMm: 'tape-thickness',
  tapeGrooveMm: 'tape-groove',
  tapeSqueezePct: 'tape-squeeze',
  tapeSides: 'tape-sides',
  tapePort: 'tape-port',
};

export const SETTING_FLAGS: readonly SettingFlag[] = SETTINGS.map((s) => ({ ...s, flag: FLAG_NAMES[s.field] }));

export const flagFor = (field: FieldName): string => `--${FLAG_NAMES[field]}`;
