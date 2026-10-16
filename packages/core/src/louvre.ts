// A louvre window (louvre-frame, #163; docs/louvre.md): glass blades held at each end in clips,
// turned together by a handle. The lowest blades come out of their clips and the wall goes in
// their place, a wall in the window's own frame: it stands on the sill, its sides are pressed
// against the clips of the blades taken out, clear of the channels they turn in, and its top edge
// is under the lowest blade left, which the handle closes onto its gasket as onto the window's own
// weatherstrip at the sill. What the plan says about it: which blades come out, and to keep the
// louvres closed while the wall is in, since the clips at its sides turn with them.
import type { EdgeParams } from './edge.js';

export function describeLouvre(p: { edges: EdgeParams }): string[] {
  if (p.edges.window !== 'louvre') return [];
  return [
    'A louvre window: take the lowest blades out of their clips, as many as the wall needs, and keep them ' +
      'safe; the wall stands on the sill in their place, its sides pressed against the clips of the blades ' +
      'taken out.',
    ...(p.edges.roles.top === 'sash'
      ? [
          'Close the louvres with the handle: the lowest blade left closes onto the wall’s top gasket, as onto ' +
            'the window’s own weatherstrip. Do not open them while the wall is in: the clips at its sides turn ' +
            'with them.',
        ]
      : []),
  ];
}
