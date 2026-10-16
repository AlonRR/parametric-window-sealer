// A wall behind a roller shutter (shutter-rails, #158): its side strips in the shutter's guide
// rails, its top edge under the lowered shutter's end bar. What the plan says about it: how the
// strips sit in the rails, that the wall does not carry the shutter's weight, and to take it out
// before a storm, when a half-closed shutter can be torn from its rails (docs/shutter.md).
import { edgeProfile } from './edge.js';
import type { EdgeName, EdgeParams } from './edge.js';
import type { JointParams } from './joint.js';
import { tapeFit } from './tape.js';
import type { SealParams } from './tape.js';
import { mm } from './words.js';

const SIDES: readonly EdgeName[] = ['left', 'right'];

export function describeShutter(p: { edges: EdgeParams; joint: JointParams; seal: SealParams }): string[] {
  if (p.edges.window !== 'shutter') return [];
  const fit = p.seal.kind === 'none' ? undefined : tapeFit(p.seal);
  const inRails = SIDES.filter((e) => p.edges.roles[e] === 'track');
  const thick = [...new Set(inRails.map((e) => mm(edgeProfile(e, p.edges, p.joint, fit).widthMm)))];
  const deep = [...new Set(inRails.map((e) => mm(p.edges.track.depthMm[e])))];
  const strips =
    inRails.length === 0
      ? ''
      : ` the side ${inRails.length === 1 ? 'strip is' : 'strips are'} ${thick.join(' and ')} mm thick, to pass ` +
        `the guide rails’ brushes or seals, and sit ${deep.join(' and ')} mm into the rails.`;
  return [
    `Behind a roller shutter:${strips} Lower the shutter only until its end bar rests on the wall’s top edge, ` +
      'and hold it there by its strap or crank: the wall does not carry the shutter’s weight. Before a storm, ' +
      'take the wall out and close the shutter.',
  ];
}
