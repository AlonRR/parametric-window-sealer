// The measuring guide (backlog item user-guide, #14; Q51, Q54). Chosen without asking (Q144;
// docs/choices.md): four steps at the top of the form (C58), each with a drawing made for this
// project (C59), whose fields fill the form's own as you type (C60). The guide sits inside the form,
// so an edit here goes on to the form's own update once its value is copied across. One track depth
// fills every edge in a track (C61); the last step works out the fit from a printed strip and piece
// measured with calipers (C62).
import { EDGES, FIT_TARGET_MM, fitFromMeasured, measuredPlayMm } from 'parametric-window-sealer';

type Field = HTMLInputElement | HTMLSelectElement;

const mm = (n: number) => String(Math.round(n * 100) / 100);
const inside = (box: HTMLElement | null, part: string) => box?.querySelector<Field>(`[data-part="${part}"]`) ?? null;

export function mountGuide(form: HTMLFormElement): void {
  const guide = form.querySelector<HTMLDetailsElement>('[data-testid="guide"]');
  if (!guide) return;
  const field = (name: string) => form.elements.namedItem(name) as Field | RadioNodeList | null;
  const value = (name: string) => {
    const f = field(name);
    return f instanceof HTMLInputElement || f instanceof HTMLSelectElement ? f.value : '';
  };
  const set = (name: string, v: string) => {
    const f = field(name);
    if (f instanceof HTMLInputElement || f instanceof HTMLSelectElement) f.value = v;
  };
  const appliance = () => (field('appliance') as RadioNodeList | null)?.value ?? 'none';
  const port = () => form.querySelector<HTMLElement>('[data-port="1"]');
  const cutout = () => form.querySelector<HTMLElement>('[data-testid="cutout"]');
  const tracks = () => EDGES.filter((e) => value(`${e}Edge`) === 'track');

  // Into the form: each guide field to the form's field, or the rows a hose or a cutout uses.
  const fill = (target: string, v: string) => {
    if (target === 'depth') {
      for (const e of tracks()) set(`${e}DepthMm`, v);
    } else if (target === 'hose') {
      const size = inside(port(), 'size');
      const own = inside(port(), 'own');
      if (size) size.value = 'own';
      if (own) own.value = v;
    } else if (target === 'cutout-width' || target === 'cutout-height') {
      const box = inside(cutout(), target);
      if (box) box.value = v;
    } else {
      set(target, v);
    }
  };
  // From the form, when the guide opens: what is there already.
  const read = (target: string): string => {
    if (target === 'depth') {
      const first = tracks()[0];
      return first === undefined ? '' : value(`${first}DepthMm`);
    }
    if (target === 'hose') {
      const size = inside(port(), 'size')?.value ?? '';
      return size === 'own' ? (inside(port(), 'own')?.value ?? '') : size;
    }
    if (target === 'cutout-width' || target === 'cutout-height') return inside(cutout(), target)?.value ?? '';
    return value(target);
  };

  const guideFields = () => [...guide.querySelectorAll<HTMLInputElement>('input[data-fills]')];
  for (const input of guideFields()) {
    input.addEventListener('input', () => fill(input.dataset.fills ?? '', input.value));
  }
  const showAppliance = () => {
    for (const part of guide.querySelectorAll<HTMLElement>('[data-for]'))
      part.hidden = part.dataset.for !== appliance();
  };
  guide.addEventListener('toggle', () => {
    if (!guide.open) return;
    for (const input of guideFields()) input.value = read(input.dataset.fills ?? '');
    showAppliance();
  });
  for (const radio of form.querySelectorAll<HTMLInputElement>('input[name="appliance"]')) {
    radio.addEventListener('change', showAppliance);
  }
  showAppliance();

  // The fit from calipers (C62): the play the print gave, and the fit that gives the play aimed at.
  const slot = guide.querySelector<HTMLInputElement>('[data-part="measured-slot"]');
  const panel = guide.querySelector<HTMLInputElement>('[data-part="measured-panel"]');
  const said = guide.querySelector<HTMLElement>('[data-testid="guide-fit"]');
  const use = guide.querySelector<HTMLButtonElement>('[data-part="use-fit"]');
  let suggested: number | undefined;
  const work = () => {
    const [s, p, fit] = [slot?.value.trim() ?? '', panel?.value.trim() ?? '', Number(value('fitMm'))];
    suggested = undefined;
    if (s !== '' && p !== '' && Number(s) > 0 && Number(p) > 0 && fit >= 0) {
      const m = { fitMm: fit, measuredSlotMm: Number(s), measuredPanelMm: Number(p) };
      suggested = fitFromMeasured(m);
      if (said) {
        said.textContent =
          `Each face has ${mm(measuredPlayMm(m))} mm of play; the joint is meant to have ${mm(FIT_TARGET_MM)} mm. ` +
          `Print with a fit of ${mm(suggested)} mm per face.`;
      }
    } else if (said) {
      said.textContent = 'Enter both measurements to work out the fit.';
    }
    if (use) use.disabled = suggested === undefined;
  };
  slot?.addEventListener('input', work);
  panel?.addEventListener('input', work);
  use?.addEventListener('click', () => {
    if (suggested === undefined) return;
    set('fitMm', String(suggested));
    form.dispatchEvent(new Event('input', { bubbles: true }));
  });
  work();
}
