// Windows without a track (compression-edge, #120): casement screen openings, tilt-and-turn frames.
// Indow's inserts hold in a frame by a compression tube round the edge, made slightly oversize. Here
// an edge pressed into a frame is shaped as one against a sash, and the wall is sized so its printed
// TPU gasket, standing out of its groove, is squeezed as the wall goes in: that squeeze holds it.
import { EDGES } from './edge.js';
import type { EdgeParams } from './edge.js';
import { tapeFit } from './tape.js';
import type { SealParams } from './tape.js';
import { mm } from './words.js';

const inWords = (items: readonly string[]): string =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] ?? ''}`;

export function describeFrame(p: { edges: EdgeParams; seal: SealParams }): string[] {
  const inFrame = EDGES.filter((e) => p.edges.roles[e] === 'frame');
  const fit = p.seal.kind === 'tpu' ? tapeFit(p.seal) : undefined;
  if (inFrame.length === 0 || fit === undefined) return [];
  const free = p.seal.tape.thicknessMm - fit.grooveDepthMm;
  const [gaskets, stand, grooves, their] =
    inFrame.length === 1 ? ['gasket', 'stands', 'its groove', 'Its'] : ['gaskets', 'stand', 'their grooves', 'Their'];
  return [
    `In a frame: the TPU ${gaskets} on the ${inWords(inFrame)} ${inFrame.length === 1 ? 'edge' : 'edges'} ${stand} ` +
      `${mm(free)} mm out of ${grooves} and ${inFrame.length === 1 ? 'is' : 'are'} squeezed to ${mm(fit.standOutMm)} mm ` +
      `as the wall goes in. ${their} squeeze is all that holds it: push it in square from the room side, and check ` +
      'it holds before letting go.',
  ];
}
