// The parameter panel's page wiring (params-basic, #5). The checks and the wording live in
// params.ts, where the unit tests reach them; this file only moves values between the
// form and those functions.

import { EXAMPLE_PARAMS, describePlan, planWall, readParams, toFormValues } from 'parametric-window-sealer';
import type { FieldName, FormValues, LeftoverText, Params } from 'parametric-window-sealer';
import { EDGES, WINDOW_PRESETS } from 'parametric-window-sealer';
import type { UnitPlace, WindowType } from 'parametric-window-sealer';
import { defaultUnitPlace, unitRoles } from 'parametric-window-sealer';
import { DEFAULT_MAX_PIECE, PRINTERS } from 'parametric-window-sealer';
import { TAPE_SIZES } from 'parametric-window-sealer';
import { FILL_KINDS, PATTERN_STYLES, formatPieceFills, parsePieceFills } from 'parametric-window-sealer';
import type { PieceFill } from 'parametric-window-sealer';

const FIELDS: readonly FieldName[] = [
  'openingWidthMm',
  'openingHeightMm',
  'printer',
  'printerModel',
  'bedMarginMm',
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
  'ports',
  'collarDepthMm',
  'collarWallMm',
  'collarClearanceMm',
  'collarLipMm',
  'seal',
  'tapeWidthMm',
  'tapeThicknessMm',
  'tapeGrooveMm',
  'tapeSqueezePct',
  'tapeSides',
  'tapePort',
  'tpuJoints',
  'fill',
  'fillStyle',
  'reliefPct',
  'gridOpeningMm',
  'gridBarMm',
  'hexOpeningMm',
  'hexBarMm',
  'brickWidthMm',
  'brickHeightMm',
  'brickBarMm',
  'diamondWidthMm',
  'diamondHeightMm',
  'diamondBarMm',
  'pieceFills',
  'cutouts',
  'rimDepthMm',
  'rimWallMm',
  'rimClearanceMm',
];

type Control = HTMLInputElement | HTMLSelectElement | RadioNodeList;

function control(form: HTMLFormElement, name: FieldName): Control | null {
  return form.elements.namedItem(name) as Control | null;
}

// Read by name rather than through FormData, which leaves out disabled controls: a
// disabled filler select still has a value the plan needs.
// A checkbox is yes or no, as the library writes a place for the tape.
const isCheckbox = (c: Control | null): c is HTMLInputElement => c instanceof HTMLInputElement && c.type === 'checkbox';

function readForm(form: HTMLFormElement): FormValues {
  const values: FormValues = {};
  for (const name of FIELDS) {
    const c = control(form, name);
    if (isCheckbox(c)) values[name] = c.checked ? 'yes' : 'no';
    else if (c) values[name] = c.value;
  }
  return values;
}

function writeForm(form: HTMLFormElement, values: FormValues): void {
  for (const name of FIELDS) {
    const c = control(form, name);
    const v = values[name];
    if (isCheckbox(c)) c.checked = v === 'yes';
    else if (c && v !== undefined) c.value = v;
  }
}

// The tape's size (Q121): the listed sizes, or the user's own. A listed size is written into
// the width and thickness fields, and read back from them.
const tapeSize = (widthMm: string | number, thicknessMm: string | number) => `${widthMm}x${thicknessMm}`;

function fillTapeSizes(choice: HTMLSelectElement): void {
  const option = (value: string, text: string) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
  };
  choice.replaceChildren(
    ...TAPE_SIZES.map((t) => option(tapeSize(t.widthMm, t.thicknessMm), `${t.widthMm} × ${t.thicknessMm} mm`)),
    option('own', 'Your own size'),
  );
}

function tapeToForm(form: HTMLFormElement, choice: HTMLSelectElement): void {
  const listed = TAPE_SIZES.find((t) => tapeSize(t.widthMm, t.thicknessMm) === choice.value);
  if (!listed) return;
  const width = control(form, 'tapeWidthMm');
  const thickness = control(form, 'tapeThicknessMm');
  if (width instanceof HTMLInputElement) width.value = String(listed.widthMm);
  if (thickness instanceof HTMLInputElement) thickness.value = String(listed.thicknessMm);
}

function tapeFromForm(form: HTMLFormElement, choice: HTMLSelectElement): void {
  const size = tapeSize(control(form, 'tapeWidthMm')?.value ?? '', control(form, 'tapeThicknessMm')?.value ?? '');
  choice.value = TAPE_SIZES.some((t) => tapeSize(t.widthMm, t.thicknessMm) === size) ? size : 'own';
}

// The hose ports (hose-port, #12): the main form's port and any added under Advanced (Q111,
// Q113). Their controls are not fields of their own: they are written into the hidden ports
// field as the command's --port takes them (Q114), so the library checks them all.
type PortControl = HTMLInputElement | HTMLSelectElement;
const part = (row: ParentNode, name: string): PortControl | null => row.querySelector<PortControl>(`[data-part="${name}"]`);
const portRows = (form: HTMLFormElement): HTMLElement[] => [...form.querySelectorAll<HTMLElement>('[data-port]')];
const WHOLE = /^[1-9][0-9]*$/;

// The ports as text, and the page's own word for what it can tell before the library: what
// is missing, in plainer terms than the --port form. A problem always leaves text the library
// refuses, so nothing is planned from it.
function portsText(form: HTMLFormElement): { text: string; problem?: string } {
  const appliance = (form.elements.namedItem('appliance') as RadioNodeList | null)?.value;
  if (appliance !== 'hose') return { text: '' };
  const words: string[] = [];
  let problem: string | undefined;
  portRows(form).forEach((row, i) => {
    const n = i + 1;
    const own = part(row, 'size')?.value === 'own';
    const size = (own ? part(row, 'own')?.value : part(row, 'size')?.value)?.trim() ?? '';
    const column = part(row, 'column')?.value.trim() ?? '';
    const rowNumber = part(row, 'row')?.value.trim() ?? '';
    if (size === '') problem ??= `Port ${n}: enter the hose end's outside diameter in mm.`;
    if (i > 0 && (column === '' || rowNumber === '')) problem ??= `Port ${n}: choose its piece: column and row.`;
    if ((column === '') !== (rowNumber === '')) problem ??= `Port ${n}: give both its column and its row.`;
    for (const v of [column, rowNumber]) {
      if (v !== '' && !WHOLE.test(v)) problem ??= `Port ${n}: the column and the row are whole numbers from 1.`;
    }
    const placed = i === 0 && column === '' && rowNumber === '' ? size : `${size}@${column},${rowNumber}`;
    words.push(size === '' ? '@' : placed);
  });
  const text = words.join(' ');
  return problem === undefined ? { text } : { text, problem };
}

// The measured cutout (measured-cutout, #23): one on the page (C45), written into the hidden
// cutouts field as the command's --cutout takes it (C44), so the library checks it.
const cutoutBox = (form: HTMLFormElement): HTMLElement | null => form.querySelector<HTMLElement>('[data-testid="cutout"]');

function cutoutsText(form: HTMLFormElement): { text: string; problem?: string } {
  const appliance = (form.elements.namedItem('appliance') as RadioNodeList | null)?.value;
  const box = cutoutBox(form);
  if (appliance !== 'cutout' || !box) return { text: '' };
  const [width, height, column, rowNumber] = ['cutout-width', 'cutout-height', 'column', 'row'].map(
    (name) => part(box, name)?.value.trim() ?? '',
  ) as [string, string, string, string];
  let problem: string | undefined;
  if (width === '' || height === '') problem ??= 'Cutout: enter the appliance’s width and height in mm.';
  if ((column === '') !== (rowNumber === '')) problem ??= 'Cutout: give both its column and its row.';
  for (const v of [column, rowNumber]) {
    if (v !== '' && !WHOLE.test(v)) problem ??= 'Cutout: the column and the row are whole numbers from 1.';
  }
  const size = `${width}x${height}`;
  const text = problem !== undefined ? '@' : column === '' ? size : `${size}@${column},${rowNumber}`;
  return problem === undefined ? { text } : { text, problem };
}

// A row for another port, from the main port's controls, without their notes.
function newPortRow(form: HTMLFormElement): HTMLElement | null {
  const first = form.querySelector<HTMLElement>('[data-port="1"]');
  if (!first) return null;
  const row = first.cloneNode(true) as HTMLElement;
  for (const note of row.querySelectorAll('.note')) note.remove();
  for (const name of ['own', 'column', 'row']) {
    const c = part(row, name);
    if (c) c.value = '';
  }
  const size = part(row, 'size');
  if (size) size.value = first.querySelector<HTMLSelectElement>('[data-part="size"] option')?.value ?? '';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'Remove';
  remove.dataset.part = 'remove';
  row.append(remove);
  return row;
}

function numberPortRows(form: HTMLFormElement): void {
  portRows(form).forEach((row, i) => {
    row.dataset.port = String(i + 1);
    if (i > 0) row.dataset.testid = `extra-port-${i + 1}`;
  });
}

// "Your printer" (Q115): the default, the listed printers grouped by maker, and a custom size.
// A listed printer's option is model:<id>; the choice is written into the hidden printer and
// printerModel fields, and read back from them.
function fillPrinters(choice: HTMLSelectElement): void {
  const option = (value: string, text: string) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
  };
  choice.replaceChildren(option('default', `Not listed: ${DEFAULT_MAX_PIECE.widthMm} × ${DEFAULT_MAX_PIECE.heightMm} mm`));
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const p of PRINTERS) {
    let group = groups.get(p.maker);
    if (!group) {
      group = document.createElement('optgroup');
      group.label = p.maker;
      groups.set(p.maker, group);
      choice.append(group);
    }
    group.append(option(`model:${p.id}`, `${p.model} (bed ${p.bedXMm} × ${p.bedYMm} mm)`));
  }
  choice.append(option('custom', 'Custom size'));
}

function printerToForm(form: HTMLFormElement, choice: HTMLSelectElement): void {
  const [kind, id] = choice.value.startsWith('model:') ? ['model', choice.value.slice(6)] : [choice.value, ''];
  const printer = control(form, 'printer');
  const model = control(form, 'printerModel');
  if (printer instanceof HTMLInputElement) printer.value = kind;
  if (model instanceof HTMLInputElement) model.value = id;
}

function printerFromForm(form: HTMLFormElement, choice: HTMLSelectElement): void {
  const kind = control(form, 'printer')?.value;
  const id = control(form, 'printerModel')?.value;
  choice.value = kind === 'model' ? `model:${id}` : (kind ?? 'default');
}

// Per-piece fills (#21): one list for a piece, its fill and style together (C29), and the map of
// the wall's pieces, the top row first as the wall is seen.
const KIND_NAMES: Record<string, string> = { sealed: 'Sealed', grid: 'Grid', hexagon: 'Hexagon', brick: 'Brick', diamond: 'Diamond' };
const STYLE_NAMES: Record<string, string> = { relief: 'relief', through: 'cut through' };

function fillPieceChoice(choice: HTMLSelectElement): void {
  const option = (value: string, text: string) => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    return o;
  };
  const options = [option('', "As the wall"), option('sealed', 'Sealed')];
  for (const kind of FILL_KINDS.filter((k) => k !== 'sealed')) {
    for (const style of PATTERN_STYLES) options.push(option(`${kind}:${style}`, `${KIND_NAMES[kind]}, ${STYLE_NAMES[style]}`));
  }
  choice.replaceChildren(...options);
}

function pieceFillsOf(form: HTMLFormElement): PieceFill[] {
  const read = parsePieceFills(control(form, 'pieceFills')?.value ?? '');
  return read.ok ? read.fills : [];
}

function setPieceFill(form: HTMLFormElement, column: number, row: number, value: string): void {
  const others = pieceFillsOf(form).filter((f) => !(f.column === column && f.row === row));
  const [kind, style] = value.split(':');
  const own = value === '' ? [] : [{ column, row, kind, ...(style ? { style } : {}) } as PieceFill];
  const field = control(form, 'pieceFills');
  if (field instanceof HTMLInputElement) field.value = formatPieceFills([...others, ...own]);
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
  const printerChoice = form.querySelector<HTMLSelectElement>('[data-part="printer-choice"]');
  if (printerChoice) fillPrinters(printerChoice);
  writeForm(form, toFormValues(EXAMPLE_PARAMS));
  if (printerChoice) printerFromForm(form, printerChoice);
  const tapeChoice = form.querySelector<HTMLSelectElement>('[data-part="tape-size"]');
  if (tapeChoice) {
    fillTapeSizes(tapeChoice);
    tapeFromForm(form, tapeChoice);
  }

  const pieceMap = form.querySelector<HTMLElement>('[data-testid="piece-map"]');
  const pieceChoice = form.querySelector<HTMLSelectElement>('[data-part="piece-fill"]');
  const pieceLabel = form.querySelector<HTMLElement>('[data-part="piece-fill-label"]');
  const pieceName = form.querySelector<HTMLElement>('[data-part="piece-fill-name"]');
  if (pieceChoice) fillPieceChoice(pieceChoice);
  let chosen: { column: number; row: number } | undefined;
  let shownFor: string | undefined;
  // The map follows the plan: a button for each piece, the top row first.
  const drawPieceMap = (columns: number, rows: number): void => {
    if (!pieceMap) return;
    if (chosen && (chosen.column > columns || chosen.row > rows)) chosen = undefined;
    const fills = pieceFillsOf(form);
    pieceMap.style.gridTemplateColumns = `repeat(${columns}, auto)`;
    const buttons: HTMLButtonElement[] = [];
    for (let row = rows; row >= 1; row--) {
      for (let column = 1; column <= columns; column++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = `${column},${row}`;
        b.setAttribute('aria-label', `Column ${column}, row ${row}`);
        b.setAttribute('aria-pressed', String(chosen?.column === column && chosen.row === row));
        b.dataset.own = fills.some((f) => f.column === column && f.row === row) ? 'yes' : 'no';
        b.addEventListener('click', () => {
          chosen = { column, row };
          update();
          pieceChoice?.focus();
        });
        buttons.push(b);
      }
    }
    pieceMap.replaceChildren(...buttons);
    if (pieceLabel) pieceLabel.hidden = chosen === undefined;
    // The list shows the chosen piece's fill when the choice moves to it, and is left alone while
    // the user changes it: the page redraws on its input event, before its change event is heard.
    const key = chosen === undefined ? undefined : `${chosen.column},${chosen.row}`;
    if (chosen && pieceChoice && pieceName && key !== shownFor) {
      const own = fills.find((f) => f.column === chosen?.column && f.row === chosen.row);
      pieceName.textContent = `Fill of column ${chosen.column}, row ${chosen.row}`;
      pieceChoice.value = own === undefined ? '' : own.kind === 'sealed' ? 'sealed' : `${own.kind}:${own.style ?? control(form, 'fillStyle')?.value ?? 'relief'}`;
    }
    shownFor = key;
  };
  pieceChoice?.addEventListener('change', () => {
    if (chosen) setPieceFill(form, chosen.column, chosen.row, pieceChoice.value);
  });

  const extras = form.querySelector<HTMLElement>('[data-testid="extra-ports"]');
  const addPort = form.querySelector<HTMLButtonElement>('#add-port');

  const update = (): void => {
    if (printerChoice) printerToForm(form, printerChoice);
    const hose = (form.elements.namedItem('appliance') as RadioNodeList | null)?.value === 'hose';
    for (const row of portRows(form)) {
      row.hidden = !hose;
      const ownLabel = row.querySelector<HTMLElement>('[data-part="own-label"]');
      if (ownLabel) ownLabel.hidden = part(row, 'size')?.value !== 'own';
    }
    if (addPort) addPort.hidden = !hose;
    const acRow = form.querySelector<HTMLElement>('[data-testid="ac"]');
    if (acRow) acRow.hidden = (form.elements.namedItem('appliance') as RadioNodeList | null)?.value !== 'ac';
    const cutoutRow = cutoutBox(form);
    if (cutoutRow) cutoutRow.hidden = (form.elements.namedItem('appliance') as RadioNodeList | null)?.value !== 'cutout';
    // The seal's size shows with tape or TPU, with the note for the one chosen (C35); its width
    // and thickness only for the user's own.
    const sealKind = (form.elements.namedItem('seal') as RadioNodeList | null)?.value ?? 'none';
    const tapeBox = form.querySelector<HTMLElement>('[data-testid="tape"]');
    if (tapeBox) tapeBox.hidden = sealKind === 'none';
    for (const note of form.querySelectorAll<HTMLElement>('[data-seal]')) note.hidden = note.dataset.seal !== sealKind;
    if (tapeChoice) tapeToForm(form, tapeChoice);
    const tapeOwn = form.querySelector<HTMLElement>('[data-part="tape-own"]');
    if (tapeOwn) tapeOwn.hidden = tapeChoice?.value !== 'own';
    // A pattern's style shows once a pattern is chosen (Q141).
    const fillStyle = form.querySelector<HTMLElement>('[data-testid="fill-style"]');
    if (fillStyle) fillStyle.hidden = control(form, 'fill')?.value === 'sealed';
    // Under Advanced, only the chosen pattern's sizes (C17).
    for (const sizes of form.querySelectorAll<HTMLElement>('[data-pattern]')) {
      sizes.hidden = sizes.dataset.pattern !== control(form, 'fill')?.value;
    }
    const ports = portsText(form);
    const portsField = control(form, 'ports');
    if (portsField instanceof HTMLInputElement) portsField.value = ports.text;
    const cutouts = cutoutsText(form);
    const cutoutsField = control(form, 'cutouts');
    if (cutoutsField instanceof HTMLInputElement) cutoutsField.value = cutouts.text;

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
    const errors = { ...(result.ok ? {} : result.errors) };
    if (ports.problem !== undefined) errors.ports = ports.problem;
    if (cutouts.problem !== undefined) errors.cutouts = cutouts.problem;
    // The cutout's piece starts where the plan put it (C47), as the port's does.
    const cut = cutoutBox(form);
    const placedCutout = result.ok ? result.params.cutouts[0] : undefined;
    if (cut && placedCutout && part(cut, 'column')?.value === '' && part(cut, 'row')?.value === '') {
      const column = part(cut, 'column');
      const row = part(cut, 'row');
      if (column) column.value = String(placedCutout.column);
      if (row) row.value = String(placedCutout.row);
    }
    // The main port's piece starts where the plan put it (Q105), shown once it is placed.
    const main = portRows(form)[0];
    const placed = result.ok ? result.params.ports[0] : undefined;
    if (main && placed && part(main, 'column')?.value === '' && part(main, 'row')?.value === '') {
      const column = part(main, 'column');
      const row = part(main, 'row');
      if (column) column.value = String(placed.column);
      if (row) row.value = String(placed.row);
    }
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
      for (const id of ['plan-columns', 'plan-rows', 'plan-span', 'plan-joints', 'plan-edges', 'plan-seal', 'plan-fill']) {
        setText(plan, id, '');
      }
      plan.querySelector('[data-testid="plan-piece-fills"]')?.replaceChildren();
      plan.querySelector('[data-testid="plan-ports"]')?.replaceChildren();
      plan.querySelector('[data-testid="plan-cutouts"]')?.replaceChildren();
      plan.querySelector('[data-testid="plan-units"]')?.replaceChildren();
      return;
    }
    const text = describePlan(planWall(result.params), result.params);
    setText(plan, 'plan-headline', text.headline);
    setText(plan, 'plan-columns', text.columns);
    setText(plan, 'plan-rows', text.rows);
    setText(plan, 'plan-span', text.span);
    setText(plan, 'plan-joints', text.joints);
    setText(plan, 'plan-edges', text.edges);
    setText(plan, 'plan-seal', text.seal);
    setText(plan, 'plan-fill', text.fill);
    plan.querySelector('[data-testid="plan-piece-fills"]')?.replaceChildren(
      ...text.pieceFills.map((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        return li;
      }),
    );
    const layout = planWall(result.params);
    drawPieceMap(layout.columns.length, layout.rows.length);
    plan.querySelector('[data-testid="plan-ports"]')?.replaceChildren(
      ...text.ports.map((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        return li;
      }),
    );
    plan.querySelector('[data-testid="plan-units"]')?.replaceChildren(
      ...text.units.map((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        return li;
      }),
    );
    plan.querySelector('[data-testid="plan-cutouts"]')?.replaceChildren(
      ...text.cutouts.map((line) => {
        const li = document.createElement('li');
        li.textContent = line;
        return li;
      }),
    );
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
  const acPlace = form.querySelector<HTMLSelectElement>('[data-part="ac-place"]');
  if (windowType instanceof HTMLSelectElement) {
    windowType.addEventListener('change', () => {
      if (!WINDOW_PRESETS[windowType.value as WindowType]) return;
      if (applianceNow() === 'ac' && acPlace) acPlace.value = defaultUnitPlace(windowType.value as WindowType);
      presetRoles();
    });
  }
  // A window AC (#24): the edge facing the unit meets it (C50), the unit starting below the wall
  // in a slider and to its right in a hung window (C53). Leaving the AC puts the window's edges back.
  function applianceNow(): string | undefined {
    return (form.elements.namedItem('appliance') as RadioNodeList | null)?.value;
  }
  function presetRoles(): void {
    const kind = control(form, 'window')?.value as WindowType;
    if (!WINDOW_PRESETS[kind]) return;
    const roles = applianceNow() === 'ac' && acPlace ? unitRoles(kind, acPlace.value as UnitPlace) : WINDOW_PRESETS[kind];
    for (const edge of EDGES) {
      const role = control(form, `${edge}Edge`);
      if (role instanceof HTMLSelectElement) role.value = roles[edge];
    }
  }
  let appliance = applianceNow();
  for (const radio of form.querySelectorAll<HTMLInputElement>('input[name="appliance"]')) {
    radio.addEventListener('change', () => {
      const now = applianceNow();
      if (now === 'ac' && acPlace) acPlace.value = defaultUnitPlace(control(form, 'window')?.value as WindowType);
      if (now === 'ac' || appliance === 'ac') presetRoles();
      appliance = now;
    });
  }
  acPlace?.addEventListener('change', presetRoles);
  addPort?.addEventListener('click', () => {
    const row = newPortRow(form);
    if (!row || !extras) return;
    extras.append(row);
    numberPortRows(form);
    update();
  });
  extras?.addEventListener('click', (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest('[data-part="remove"]') : null;
    if (!button) return;
    button.closest('[data-port]')?.remove();
    numberPortRows(form);
    update();
  });
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}
