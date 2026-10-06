// Numbers as the messages and the plan say them. Internal to the library.

// A length to a tenth of a mm: "200", "167.5".
export const mm = (n: number): string => String(Math.round(n * 10) / 10);

// A length to a hundredth of a mm, where a tenth would hide the difference: "0.85".
export const hundredth = (n: number): string => String(Math.round(n * 100) / 100);

// "1 strip", "3 strips".
export const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

// "200, 200, 167 and 30".
export function listed(lengths: number[]): string {
  const words = lengths.map(mm);
  const last = words.pop();
  return words.length > 0 ? `${words.join(', ')} and ${last}` : (last ?? '');
}

export const sum = (values: number[]): number => values.reduce((n, v) => n + v, 0);
