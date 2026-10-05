// The measuring guide's sum (backlog item user-guide, #14; Q51, Q54). A strip and a piece are
// printed and measured with calipers: the strip's slot across, between its flanges, and the piece's
// thickness. Printers print a little off, so the slot the joint gets is not quite the one designed.
// Chosen without asking (Q144; docs/choices.md): the fit is moved by what the print missed, so the
// next strips give the play the joint is meant to have, the starting fit of 0.2 mm a face (C62).
import { DEFAULT_JOINT } from './joint.js';

export const FIT_TARGET_MM = DEFAULT_JOINT.fitMm;

export interface FitMeasurement {
  fitMm: number; // the fit the strip was printed with
  measuredSlotMm: number; // the strip's slot across, between its flanges
  measuredPanelMm: number; // the printed piece's thickness
}

function checkSizes(m: FitMeasurement): void {
  for (const [name, value] of Object.entries(m)) {
    const least = name === 'fitMm' ? 0 : Number.MIN_VALUE;
    if (!Number.isFinite(value) || value < least) throw new RangeError(`${name} must be a size in mm, got ${value}`);
  }
}

// The play each face has now.
export function measuredPlayMm(m: FitMeasurement): number {
  checkSizes(m);
  return (m.measuredSlotMm - m.measuredPanelMm) / 2;
}

// The fit to print with: the one printed, plus what each face is short of the play aimed at; to
// the hundredth of a mm, and never below nothing.
export function fitFromMeasured(m: FitMeasurement, targetMm: number = FIT_TARGET_MM): number {
  const fit = m.fitMm + targetMm - measuredPlayMm(m);
  return Math.max(0, Math.round(fit * 100) / 100);
}
