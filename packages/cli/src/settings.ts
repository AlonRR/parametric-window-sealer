// From a --params file and the flags to the checked parameters (Q85, Q90). The library's
// readSettings applies the page's rules: its starting values, then the file, then the flags,
// the window presets and the required opening. This puts the command's words on each problem:
// the flag, the setting's place in the file, and the file's name.
import { readSettings } from 'parametric-window-sealer';
import type { FormValues, Params } from 'parametric-window-sealer';
import { SETTING_FLAGS, flagFor } from './flags.js';

export interface Problem {
  flag?: string; // as typed, with its dashes
  setting?: string; // where it sits in a --params file
  message: string;
}

export interface FromFile {
  name: string; // as given to --params
  input: unknown; // the file's JSON, checked by settingsFrom
}

export function readParamsFile(text: string, name: string): FromFile | { problems: Problem[] } {
  try {
    return { name, input: JSON.parse(text) };
  } catch (error) {
    return { problems: [{ message: `${name} is not valid JSON: ${(error as Error).message}` }] };
  }
}

export type Flags = Partial<Record<string, string>>;

// The checked parameters, or every problem found, each naming its flag and its setting.
export function settingsFrom(start: FromFile | undefined, flags: Flags): { params: Params } | { problems: Problem[] } {
  const overrides: FormValues = {};
  for (const f of SETTING_FLAGS) {
    const value = flags[f.flag];
    if (value !== undefined) overrides[f.field] = value;
  }
  const read = readSettings(start?.input ?? {}, overrides);
  if (read.ok) return { params: read.params };
  return {
    problems: read.problems.map((p): Problem => {
      if (p.kind === 'shape' || p.field === undefined) return { message: `${start?.name ?? 'the input'}: ${p.message}` };
      const flag = flagFor(p.field);
      const message =
        p.kind === 'required' ? `${p.message.replace(/\.$/, '')}, as ${flag} or as ${p.path} in a --params file.` : p.message;
      return { flag, setting: p.path, message };
    }),
  };
}
