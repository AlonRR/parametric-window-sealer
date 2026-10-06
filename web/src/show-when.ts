// Which parts of the form show (code-params-page, #95), said in the page's HTML rather than in
// code written for each part. An element with data-show-when="seal=tape" shows only while the
// field named seal holds tape; "fill=grid|hexagon" while it holds either; "seal!=none" while it
// holds anything but none. data-enable-when says the same of a control's disabled state. A new
// part of the form that shows for some answer needs only the attribute.

export interface Condition {
  field: string;
  values: string[];
  negated: boolean; // shown while the field holds none of the values
}

const FORM = /^([A-Za-z][A-Za-z0-9]*)(!?=)([^|=!]+(?:\|[^|=!]+)*)$/;

export function parseCondition(text: string): Condition {
  const m = FORM.exec(text.trim());
  if (!m?.[1] || !m[2] || !m[3])
    throw new Error(`Not a condition: "${text}"; write field=value, field=a|b or field!=value`);
  return { field: m[1], values: m[3].split('|'), negated: m[2] === '!=' };
}

export function holds(condition: Condition, valueOf: (field: string) => string | undefined): boolean {
  const value = valueOf(condition.field);
  const listed = value !== undefined && condition.values.includes(value);
  return condition.negated ? !listed : listed;
}

type Disabled = HTMLInputElement | HTMLSelectElement | HTMLButtonElement | HTMLFieldSetElement;
const canDisable = (el: Element): el is Disabled =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLButtonElement ||
  el instanceof HTMLFieldSetElement;

export function applyConditions(root: ParentNode, valueOf: (field: string) => string | undefined): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-show-when]')) {
    el.hidden = !holds(parseCondition(el.dataset.showWhen ?? ''), valueOf);
  }
  for (const el of root.querySelectorAll('[data-enable-when]')) {
    if (canDisable(el) && el instanceof HTMLElement) {
      el.disabled = !holds(parseCondition(el.dataset.enableWhen ?? ''), valueOf);
    }
  }
}
