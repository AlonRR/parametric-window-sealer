// The parameter panel's page wiring (params-basic, #5). The checks and the wording live in
// params.ts, where the unit tests reach them; this file only moves values between the
// form and those functions.

import { EXAMPLE_PARAMS, describePlan, planWall, readParams, toFormValues } from 'parametric-window-sealer';
import type { FieldName, FormValues, LeftoverText, Params } from 'parametric-window-sealer';
import { EDGES, WINDOW_PRESETS } from 'parametric-window-sealer';
import type { WindowType } from 'parametric-window-sealer';
import { DEFAULT_MAX_PIECE } from 'parametric-window-sealer';

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
  'widthLeftover',
  'heightLeftover',
  'slotMm',
  'slideMm',
  'webMm',
  'flangeMm',
  'fitMm',
  'window',
  'topEdge',
  'bottomEdge',
  'leftEdge',
  'rightEdge',
  'trackWidthMm',
  'topDepthMm',
  'bottomDepthMm',
  'leftDepthMm',
  'rightDepthMm',
  'trackClearanceMm',
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

// The warning when full pieces leave less room than a joint takes (Q60): one way out is
// chosen, and the user can click another (Q61, Q62); one that cannot work is greyed out.
function leftoverWarning(text: LeftoverText, choose: (value: string) => void): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'choice';
  li.dataset.testid = `leftover-${text.axis}`;
  const choices = document.createElement('fieldset');
  choices.className = 'choices';
  const legend = document.createElement('legend');
  legend.textContent = text.message;
  choices.append(legend);
  for (const option of text.options) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `leftover-${text.axis}`;
    input.value = option.value;
    input.checked = option.value === text.used;
    input.disabled = !option.possible;
    input.addEventListener('change', () => choose(option.value));
    label.append(input, ` ${option.label}`);
    choices.append(label);
  }
  li.append(choices);
  return li;
}

// onChange hears the parameters after every edit, or null while a field is wrong.
export function mountPanel(
  form: HTMLFormElement,
  plan: HTMLElement,
  onChange: (params: Params | null) => void = () => {},
): void {
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
    // A track's depth applies only to an edge in a track.
    for (const edge of EDGES) {
      const depth = control(form, `${edge}DepthMm`);
      if (depth instanceof HTMLInputElement) depth.disabled = values[`${edge}Edge`] !== 'track';
    }

    const result = readParams(values);
    onChange(result.ok ? result.params : null);
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
    // Redrawing the warnings replaces their radio buttons; keep the focus on the one chosen.
    const active = document.activeElement;
    const focused =
      active instanceof HTMLInputElement && warnings?.contains(active)
        ? `input[name="${active.name}"][value="${active.value}"]`
        : null;
    warnings?.replaceChildren();
    if (!result.ok) {
      setText(plan, 'plan-headline', 'Fix the marked fields to see the plan.');
      for (const id of ['plan-columns', 'plan-rows', 'plan-span', 'plan-joints', 'plan-edges']) {
        setText(plan, id, '');
      }
      return;
    }
    const text = describePlan(planWall(result.params), result.params);
    setText(plan, 'plan-headline', text.headline);
    setText(plan, 'plan-columns', text.columns);
    setText(plan, 'plan-rows', text.rows);
    setText(plan, 'plan-span', text.span);
    setText(plan, 'plan-joints', text.joints);
    setText(plan, 'plan-edges', text.edges);
    for (const leftover of text.leftovers) {
      const hidden = control(form, `${leftover.axis}Leftover`);
      warnings?.append(
        leftoverWarning(leftover, (value) => {
          if (hidden instanceof HTMLInputElement) hidden.value = value;
          update();
        }),
      );
    }
    for (const w of text.warnings) {
      const li = document.createElement('li');
      li.textContent = w;
      warnings?.append(li);
    }
    if (focused) warnings?.querySelector<HTMLInputElement>(focused)?.focus();
  };

  // Choosing a window type presets each edge's role (Q66); the user can change any after.
  const windowType = control(form, 'window');
  if (windowType instanceof HTMLSelectElement) {
    windowType.addEventListener('change', () => {
      const roles = WINDOW_PRESETS[windowType.value as WindowType];
      if (!roles) return;
      for (const edge of EDGES) {
        const role = control(form, `${edge}Edge`);
        if (role instanceof HTMLSelectElement) role.value = roles[edge];
      }
    });
  }
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}
