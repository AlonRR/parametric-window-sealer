// The measuring guide (backlog item user-guide, #14): steps at the top of the form, each with a
// drawing made for this project, whose fields fill the form's own as you type, so the guide never
// holds a value the form does not. The guide sits inside the form, so an edit here goes on to the
// form's own update once its value is copied across. One track depth fills every edge in a track;
// the fourth step works out the fit from a printed strip and piece measured with calipers, and the
// fifth takes the grip from the test coupon (joint-lock, #110), moving the grip or the fit after each
// print until a section holds (fit-test-print, #63). Why each is so: docs/choices.md.
// Each step's text for what is in the window shows by the page's own data-show-when.
import {
  DEFAULT_JOINT,
  EDGES,
  FIT_TARGET_MM,
  couponGrips,
  fitFromMeasured,
  measuredPlayMm,
  nextTestPrint,
} from 'parametric-window-sealer';
import { control, setValue, valueOf } from './form-fields';
import { applyConditions } from './show-when';

type Field = HTMLInputElement | HTMLSelectElement;

const mm = (n: number) => String(Math.round(n * 100) / 100);
const inside = (box: HTMLElement | null, part: string) => box?.querySelector<Field>(`[data-part="${part}"]`) ?? null;

export function mountGuide(form: HTMLFormElement): void {
  const guide = form.querySelector<HTMLDetailsElement>('[data-testid="guide"]');
  if (!guide) return;
  const value = (name: string) => valueOf(form, name) ?? '';
  const set = (name: string, v: string) => setValue(form, name, v);
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
  guide.addEventListener('toggle', () => {
    if (!guide.open) return;
    for (const input of guideFields()) input.value = read(input.dataset.fills ?? '');
    applyConditions(guide, (name) => valueOf(form, name));
  });

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

  // The guided test print (#63): a button for each of the coupon's sections, with its grip, and two
  // for none; each answer sets the grip or the fit for the next print, and the coupon in or out.
  const answers = [...guide.querySelectorAll<HTMLButtonElement>('button[data-answer]')];
  const told = guide.querySelector<HTMLElement>('[data-testid="guide-test-print"]');
  const gripBox = guide.querySelector<HTMLInputElement>('input[data-fills="gripMm"]');
  const size = (name: string): number | undefined => {
    const text = value(name).trim();
    const n = Number(text);
    return text !== '' && Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const coupon = (on: boolean) => {
    const box = control(form, 'coupon');
    if (box instanceof HTMLInputElement) box.checked = on;
  };
  const label = () => {
    const grip = size('gripMm');
    const grips = grip === undefined ? [] : couponGrips(grip);
    for (const button of answers) {
      const section = Number(button.dataset.answer);
      const gripMm = grips[section - 1];
      if (Number.isInteger(section))
        button.textContent = `Section ${section}${gripMm === undefined ? '' : `: ${mm(gripMm)} mm`}`;
      button.disabled = grip === undefined || size('fitMm') === undefined;
    }
  };
  for (const button of answers) {
    button.addEventListener('click', () => {
      const [gripMm, fitMm] = [size('gripMm'), size('fitMm')];
      if (gripMm === undefined || fitMm === undefined) return;
      const answer = button.dataset.answer ?? '';
      const next = nextTestPrint(
        { ...DEFAULT_JOINT, gripMm, fitMm },
        answer === 'all-loose' || answer === 'all-tight' ? answer : Number(answer),
      );
      set('gripMm', String(next.joint.gripMm));
      set('fitMm', String(next.joint.fitMm));
      if (gripBox) gripBox.value = String(next.joint.gripMm);
      coupon(!next.done);
      if (told) told.textContent = next.say;
      form.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  guide.querySelector<HTMLButtonElement>('[data-part="add-coupon"]')?.addEventListener('click', () => {
    coupon(true);
    form.dispatchEvent(new Event('input', { bubbles: true }));
  });
  form.addEventListener('input', label);
  label();
}
