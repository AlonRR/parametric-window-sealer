// What each edge meets. Choosing a window type presets each edge's role, and the track's sizes to
// the type's own, a guide rail's behind a roller shutter (#158); the user can change any after. A
// window AC (#24): the edge facing the unit meets it, the unit starting below the wall in a slider
// and to its right in a hung window or under a shutter. Leaving the AC puts the
// window's edges back. These listeners sit on the controls themselves, so they run before the
// form's own, which reads the result.
import { EDGES, UNIT_PLACES, WINDOW_PRESETS, defaultUnitPlace, unitRoles, windowTrack } from 'parametric-window-sealer';
import type { UnitPlace, WindowType } from 'parametric-window-sealer';
import { control, setValue, valueOf } from './form-fields';

const isWindowType = (v: string | undefined): v is WindowType => v !== undefined && Object.hasOwn(WINDOW_PRESETS, v);
const isUnitPlace = (v: string | undefined): v is UnitPlace => UNIT_PLACES.some((p) => p === v);

export function mountWindowRoles(form: HTMLFormElement): void {
  const windowType = control(form, 'window');
  const acPlace = form.querySelector<HTMLSelectElement>('[data-part="ac-place"]');
  const appliance = () => valueOf(form, 'appliance');

  const presetRoles = (): void => {
    const kind = valueOf(form, 'window');
    if (!isWindowType(kind)) return;
    const place = acPlace?.value;
    const roles = appliance() === 'ac' && isUnitPlace(place) ? unitRoles(kind, place) : WINDOW_PRESETS[kind];
    for (const edge of EDGES) setValue(form, `${edge}Edge`, roles[edge]);
  };
  // The unit starts at the window type's own place.
  const startPlace = (): void => {
    const kind = valueOf(form, 'window');
    if (acPlace && isWindowType(kind)) acPlace.value = defaultUnitPlace(kind);
  };

  // The track starts at the window type's own sizes.
  const presetTrack = (kind: WindowType): void => {
    const track = windowTrack(kind);
    setValue(form, 'trackWidthMm', String(track.widthMm));
    setValue(form, 'trackClearanceMm', String(track.clearanceMm));
    for (const edge of EDGES) setValue(form, `${edge}DepthMm`, String(track.depthMm[edge]));
  };

  if (windowType instanceof HTMLSelectElement) {
    windowType.addEventListener('change', () => {
      if (!isWindowType(windowType.value)) return;
      if (appliance() === 'ac') startPlace();
      presetRoles();
      presetTrack(windowType.value);
    });
  }
  let before = appliance();
  for (const radio of form.querySelectorAll<HTMLInputElement>('input[name="appliance"]')) {
    radio.addEventListener('change', () => {
      const now = appliance();
      if (now === 'ac') startPlace();
      if (now === 'ac' || before === 'ac') presetRoles();
      before = now;
    });
  }
  acPlace?.addEventListener('change', presetRoles);
}
