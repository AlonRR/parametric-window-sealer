// The parameter panel's page wiring (params-basic, #5). The checks and the wording live in
// params.ts, where the unit tests reach them; this file only moves values between the
// form and those functions.

import { EXAMPLE_PARAMS, describePlan, planWall, readParams, toFormValues } from './params';
import type { FieldName, FormValues } from './params';
import { DEFAULT_MAX_PIECE } from './printer';

const FIELDS: readonly FieldName[] = [
  'openingWidthMm',
  'openingHeightMm',
  'printer',
  'customWidthMm',
  'customHeightMm',
  'widthMode',
  'widthFiller',
  'heightMode',
  'heightFiller',
  'thicknessMm',
];

type Control = HTMLInputElement | HTMLSelectElement | RadioNodeList;

function control(form: HTMLFormElement, name: FieldName): Control | null {
  return form.elements.namedItem(name) as Control | null;
}

// Read by name rather than through FormData, which leaves out disabled controls: a
// disabled filler select still has a value the plan needs.
function readForm(form: HTMLFormElement): FormValues {
  const values: FormValues = {};
  for (const name of FIELDS) {
    const c = control(form, name);
    if (c) values[name] = c.value;
  }
  return values;
}

function writeForm(form: HTMLFormElement, values: FormValues): void {
  for (const name of FIELDS) {
    const c = control(form, name);
    const v = values[name];
    if (c && v !== undefined) c.value = v;
  }
}

function setText(root: ParentNode, testId: string, text: string): void {
  const el = root.querySelector(`[data-testid="${testId}"]`);
  if (el) el.textContent = text;
}

export function mountPanel(form: HTMLFormElement, plan: HTMLElement): void {
  for (const el of form.querySelectorAll('[data-default-size]')) {
    el.textContent = `${DEFAULT_MAX_PIECE.widthMm} × ${DEFAULT_MAX_PIECE.heightMm} mm`;
  }
  writeForm(form, toFormValues(EXAMPLE_PARAMS));

  const update = (): void => {
    const values = readForm(form);
    const custom = values.printer === 'custom';
    for (const name of ['customWidthMm', 'customHeightMm'] as const) {
      const c = control(form, name);
      if (c instanceof HTMLInputElement) c.disabled = !custom;
    }
    for (const axis of ['width', 'height'] as const) {
      const filler = control(form, `${axis}Filler`);
      if (filler instanceof HTMLSelectElement) {
        filler.disabled = values[`${axis}Mode`] !== 'full-plus-filler';
      }
    }

    const result = readParams(values);
    const errors = result.ok ? {} : result.errors;
    for (const name of FIELDS) {
      const c = control(form, name);
      if (c instanceof HTMLInputElement || c instanceof HTMLSelectElement) {
        if (errors[name]) c.setAttribute('aria-invalid', 'true');
        else c.removeAttribute('aria-invalid');
      }
      setText(form, `error-${name}`, errors[name] ?? '');
    }

    const warnings = plan.querySelector('[data-testid="plan-warnings"]');
    warnings?.replaceChildren();
    if (!result.ok) {
      setText(plan, 'plan-headline', 'Fix the marked fields to see the plan.');
      setText(plan, 'plan-columns', '');
      setText(plan, 'plan-rows', '');
      return;
    }
    const text = describePlan(planWall(result.params), result.params.thicknessMm);
    setText(plan, 'plan-headline', text.headline);
    setText(plan, 'plan-columns', text.columns);
    setText(plan, 'plan-rows', text.rows);
    for (const w of text.warnings) {
      const li = document.createElement('li');
      li.textContent = w;
      warnings?.append(li);
    }
  };

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}
