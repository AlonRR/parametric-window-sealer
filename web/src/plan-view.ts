// The plan in words (code-params-page, #95). Each element marked data-plan="<key>" shows that
// line of the library's PlanText, and a list of lines fills a list; a new line of the plan needs
// its key in PlanText and an element here, nothing more. While a field is wrong each shows its
// data-plan-wrong text, or nothing. The warnings, the leftovers' choices first, fill
// data-plan="warnings".
import type { LeftoverText, PlanText } from 'parametric-window-sealer';
import { listItems } from './form-fields';

export type ChooseLeftover = (axis: LeftoverText['axis'], value: string) => void;

// The warning when full pieces leave less room than a joint takes (Q60): one way out is
// chosen, and the user can click another (Q61, Q62); one that cannot work is greyed out.
function leftoverWarning(text: LeftoverText, choose: ChooseLeftover): HTMLLIElement {
  const li = document.createElement('li');
  li.className = 'choice';
  li.dataset.testid = `leftover-${text.axis}`;
  const choices = document.createElement('fieldset');
  choices.className = 'choices';
  const legend = document.createElement('legend');
  legend.textContent = text.message;
  choices.append(legend);
  for (const choice of text.options) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `leftover-${text.axis}`;
    input.value = choice.value;
    input.checked = choice.value === text.used;
    input.disabled = !choice.possible;
    input.addEventListener('change', () => choose(text.axis, choice.value));
    label.append(input, ` ${choice.label}`);
    choices.append(label);
  }
  li.append(choices);
  return li;
}

function showWarnings(box: HTMLElement, text: PlanText, choose: ChooseLeftover): void {
  // Redrawing the warnings replaces their radio buttons; keep the focus on the one chosen.
  const active = document.activeElement;
  const focused =
    active instanceof HTMLInputElement && box.contains(active)
      ? `input[name="${active.name}"][value="${active.value}"]`
      : null;
  box.replaceChildren(...text.leftovers.map((l) => leftoverWarning(l, choose)), ...listItems(text.warnings));
  if (focused) box.querySelector<HTMLInputElement>(focused)?.focus();
}

const isLines = (v: unknown): v is string[] => Array.isArray(v) && v.every((line) => typeof line === 'string');

export function showPlan(plan: HTMLElement, text: PlanText | null, choose: ChooseLeftover): void {
  for (const el of plan.querySelectorAll<HTMLElement>('[data-plan]')) {
    const key = el.dataset.plan ?? '';
    if (text === null) {
      el.replaceChildren(el.dataset.planWrong ?? '');
    } else if (key === 'warnings') {
      showWarnings(el, text, choose);
    } else {
      const value: unknown = Object.entries(text).find(([k]) => k === key)?.[1];
      if (typeof value === 'string') el.textContent = value;
      else if (isLines(value)) el.replaceChildren(...listItems(value));
      else throw new Error(`The plan has no line "${key}"`);
    }
  }
}
