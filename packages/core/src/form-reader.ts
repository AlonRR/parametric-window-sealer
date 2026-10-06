// Reading the page's form (params-basic, #5): every value arrives as text, and each problem is
// kept against its field, so the page can mark them all at once and nothing is made from a bad
// value. The settings reader's sections (params.ts) each read their own fields through one of these.
import type { FieldErrors, FieldName, FormValues } from './params.js';

export const SIZE_MESSAGE = 'Enter a size in mm, greater than 0.';
export const SIZE_OR_ZERO_MESSAGE = 'Enter a size in mm, 0 or more.';
export const CHOICE_MESSAGE = 'Choose one of the listed options.';

// A plain decimal number. "600,5" is refused rather than read as 600 or 6005: a silently wrong
// size is worse than a question.
const DECIMAL = /^[0-9]*\.?[0-9]+(e[0-9]+)?$/i;

export const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  allowed.some((a) => a === value);

export class FormReader {
  readonly errors: FieldErrors = {};

  constructor(readonly values: FormValues) {}

  // True while no field has a problem: some checks need every value they use to be sound.
  get ok(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  fail(field: FieldName, message: string): void {
    this.errors[field] = message;
  }

  // The field as a number, or NaN; never a problem by itself.
  number(field: FieldName): number {
    const text = (this.values[field] ?? '').trim();
    return DECIMAL.test(text) ? Number(text) : Number.NaN;
  }

  // A length greater than zero.
  size(field: FieldName): number {
    const n = this.number(field);
    if (Number.isFinite(n) && n > 0) return n;
    this.fail(field, SIZE_MESSAGE);
    return Number.NaN;
  }

  // A length that may be zero: a joint that does not slide, a printer that needs no clearance.
  sizeOrZero(field: FieldName): number {
    const n = this.number(field);
    if (Number.isFinite(n) && n >= 0) return n;
    this.fail(field, SIZE_OR_ZERO_MESSAGE);
    return Number.NaN;
  }

  // One of a list; the first while it is wrong, so the rest of the reading can go on.
  oneOf<T extends string>(field: FieldName, allowed: readonly T[]): T {
    const v = this.values[field];
    if (isOneOf(v, allowed)) return v;
    this.fail(field, CHOICE_MESSAGE);
    const [first] = allowed;
    if (first === undefined) throw new Error(`${field} has no choices`);
    return first;
  }

  // A number read only where it is used, as a pattern's sizes are read only with that pattern:
  // elsewhere a value that does not fit keeps its starting value and is no problem.
  numberIfUsed(
    field: FieldName,
    used: boolean,
    fallback: number,
    fits: (n: number) => boolean,
    message: string,
  ): number {
    const n = this.number(field);
    if (fits(n)) return n;
    if (!used) return fallback;
    this.fail(field, message);
    return Number.NaN;
  }

  // A choice read only where it is used; elsewhere a value off the list keeps its starting value.
  oneOfIfUsed<T extends string>(field: FieldName, used: boolean, allowed: readonly T[], fallback: T): T {
    if (used) return this.oneOf(field, allowed);
    const v = this.values[field];
    return isOneOf(v, allowed) ? v : fallback;
  }
}
