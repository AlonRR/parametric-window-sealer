// The form reader each section of the settings reader reads its fields with (code-params-page,
// #95): text in, numbers and choices out, each problem kept against its field.
import { describe, expect, it } from 'vitest';
import { CHOICE_MESSAGE, FormReader, SIZE_MESSAGE, SIZE_OR_ZERO_MESSAGE, isOneOf } from '../src/form-reader.js';
import { EXAMPLE_PARAMS, FIELD_NAMES, toFormValues } from '../src/params.js';

describe('FIELD_NAMES', () => {
  it('names every field the form has, once', () => {
    expect([...FIELD_NAMES].sort()).toEqual(Object.keys(toFormValues(EXAMPLE_PARAMS)).sort());
    expect(new Set(FIELD_NAMES).size).toBe(FIELD_NAMES.length);
  });
});

describe('FormReader', () => {
  it('reads plain decimal numbers, and nothing else', () => {
    const r = new FormReader({ thicknessMm: ' 3.5 ', slotMm: '600,5', webMm: '1e2', flangeMm: '' });
    expect(r.number('thicknessMm')).toBe(3.5);
    expect(r.number('slotMm')).toBeNaN(); // not 600 or 6005: a question instead
    expect(r.number('webMm')).toBe(100);
    expect(r.number('flangeMm')).toBeNaN();
    expect(r.ok).toBe(true); // reading a number alone finds no problem
  });

  it('keeps a problem against each field that needs a size and has none', () => {
    const r = new FormReader({ thicknessMm: '0', slideMm: '0', fitMm: '-1' });
    expect(r.size('thicknessMm')).toBeNaN();
    expect(r.sizeOrZero('slideMm')).toBe(0);
    expect(r.sizeOrZero('fitMm')).toBeNaN();
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual({ thicknessMm: SIZE_MESSAGE, fitMm: SIZE_OR_ZERO_MESSAGE });
  });

  it('takes a choice from its list, or the first while it is wrong', () => {
    const r = new FormReader({ window: 'hung', seal: 'glue' });
    expect(r.oneOf('window', ['slider', 'hung'])).toBe('hung');
    expect(r.oneOf('seal', ['none', 'tape'])).toBe('none');
    expect(r.errors).toEqual({ seal: CHOICE_MESSAGE });
    expect(() => new FormReader({}).oneOf('seal', [])).toThrow('seal has no choices');
  });

  it('reads a field only where it is used; elsewhere a value that does not fit keeps its start', () => {
    const r = new FormReader({ gridBarMm: 'thin', tapeSides: 'maybe' });
    const fits = (n: number) => n > 0;
    expect(r.numberIfUsed('gridBarMm', false, 3, fits, 'bad bar')).toBe(3);
    expect(r.oneOfIfUsed('tapeSides', false, ['no', 'yes'], 'no')).toBe('no');
    expect(r.ok).toBe(true);
    expect(r.numberIfUsed('gridBarMm', true, 3, fits, 'bad bar')).toBeNaN();
    expect(r.oneOfIfUsed('tapeSides', true, ['no', 'yes'], 'no')).toBe('no');
    expect(r.errors).toEqual({ gridBarMm: 'bad bar', tapeSides: CHOICE_MESSAGE });
  });

  it('isOneOf narrows anything to a listed choice', () => {
    expect(isOneOf('tape', ['none', 'tape'])).toBe(true);
    expect(isOneOf(undefined, ['none', 'tape'])).toBe(false);
    expect(isOneOf(1, ['1'])).toBe(false);
  });
});
