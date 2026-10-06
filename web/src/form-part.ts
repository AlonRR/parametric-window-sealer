// A part of the form made of more than its named fields (code-params-page, #95): controls of its
// own, written into the named fields the library reads. The panel loads every part once the
// starting values are in the fields, syncs each before every reading, and tells each what a good
// reading placed. A new composite control is a new part, added to the panel's list.
import type { FieldErrors, Params } from 'parametric-window-sealer';

export interface FormPart {
  // From the named fields, once they hold the starting values.
  load?(): void;
  // Into the named fields; returns any problem it can word more plainly than the library.
  sync?(): FieldErrors;
  // After a good reading: what the library placed, such as a port's piece.
  placed?(params: Params): void;
}
