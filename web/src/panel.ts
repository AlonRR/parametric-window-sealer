// The parameter panel's page wiring (params-basic, #5). The checks and the wording live in the
// library, where the unit tests reach them; the page moves values between the form and the
// library, and shows what comes back (code-params-page, #95):
// - the named fields are the library's FIELD_NAMES (form-fields.ts);
// - controls that are more than a field are form parts, each written into the fields it stands
//   for before every reading (form-part.ts and the modules listed in `parts` below);
// - which parts of the form show is said in the page's HTML (show-when.ts);
// - the plan's lines go to the elements marked with their keys (plan-view.ts).
import { EXAMPLE_PARAMS, describePlan, planWall, readParams, toFormValues } from 'parametric-window-sealer';
import type { FieldErrors, Params } from 'parametric-window-sealer';
import { readForm, setValue, showErrors, valueOf, writeForm } from './form-fields';
import type { FormPart } from './form-part';
import { applianceModel, clamps, exhaustFan, slidingInsert, hosePorts, measuredCutout } from './fittings';
import { meshTile } from './mesh-tile';
import { mountPatternControls } from './pattern-controls';
import { pieceMap } from './piece-map';
import { showPlan } from './plan-view';
import { printerChoice } from './printer-choice';
import { applyConditions } from './show-when';
import { svgTile } from './svg-tile';
import { tapeSize } from './tape-size';
import { tileEditor } from './tile-editor';
import { mountWindowRoles } from './window-roles';

// onChange hears the parameters after every edit, or null while a field is wrong.
export function mountPanel(
  form: HTMLFormElement,
  plan: HTMLElement,
  onChange: (params: Params | null) => void = () => {},
): void {
  const update = (): void => {
    const problems = parts.map((p) => p.sync?.() ?? {});
    applyConditions(form, (name) => valueOf(form, name));
    const result = readParams(readForm(form));
    onChange(result.ok ? result.params : null);
    // The page's own word for a problem it can tell first takes the library's place.
    const errors: FieldErrors = { ...(result.ok ? {} : result.errors) };
    for (const problem of problems) Object.assign(errors, problem);
    showErrors(form, errors);
    if (!result.ok) {
      showPlan(plan, null, chooseLeftover);
      return;
    }
    for (const p of parts) p.placed?.(result.params);
    const layout = planWall(result.params);
    showPlan(plan, describePlan(layout, result.params), chooseLeftover);
    pieces.draw(layout.columns.length, layout.rows.length);
  };
  const chooseLeftover = (axis: 'width' | 'height', value: string): void => {
    setValue(form, `${axis}Leftover`, value);
    update();
  };

  const parts: FormPart[] = [
    printerChoice(form),
    tapeSize(form),
    hosePorts(form, update),
    measuredCutout(form),
    exhaustFan(form),
    clamps(form),
    slidingInsert(form),
    applianceModel(form, update),
    svgTile(form, update),
    meshTile(form, update),
    tileEditor(form, update),
  ].filter((p): p is FormPart => p !== null);
  const pieces = pieceMap(form, update);
  mountPatternControls(form);
  writeForm(form, toFormValues(EXAMPLE_PARAMS));
  for (const p of parts) p.load?.();
  mountWindowRoles(form);
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}
