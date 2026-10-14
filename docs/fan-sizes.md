# Fan sizes

The square-framed fans behind the fan mount (`fan-mount`, #28; Q15, Q16): the frame, where its
screw holes are, and the round opening the air passes through. Every number was read from a
fan maker's own drawing on 14 Oct 2026 and is quoted with its address; none is from memory, a
retailer or a review. `packages/core/test/fan.test.ts` checks that the library's list (`FANS`)
is this table, row for row, so a change to either one shows up in the tests.

## The list

The frame, the hole spacing (centre to centre) and the opening are from Arctic's mounting hole
drawing for each size; the drawings give each fan's own holes as Ø4.30 mm.

| Size mm | Hole spacing mm | Opening mm | Source |
|---|---|---|---|
| 80 | 71.5 | 76.3 | <https://support.arctic.de/products/f8/techdocs/80mm_fan-Mounting_hole_pattern.pdf> |
| 92 | 82.5 | 88.4 | <https://support.arctic.de/products/f9/techdocs/92mm_fan-Mounting_hole_pattern.pdf> |
| 120 | 105 | 116 | <https://support.arctic.de/products/f12/techdocs/120mm_fan-Mounting_hole_pattern.pdf> |
| 140 | 124.5 to 125 | 134.2 | <https://support.arctic.de/products/f14/techdocs/140mm_fan-Mounting_hole_pattern.pdf> |

## Checked against

- **Delta Electronics**, whose datasheets have a "mounting panel cutout" for each fan, agree on
  the spacing for the two sizes found: 71.5 ± 0.3 mm for its 80 × 80 × 15 mm series and
  105.0 ± 0.3 mm for its 120 × 120 × 38 mm series. They give the panel's screw holes as
  Ø4.5 ± 0.3 mm, which the fan mount uses (`FAN_SCREW_HOLE_MM`). Delta's panel openings are a
  square with rounded corners (76.6 mm with an 85.0 mm circle for 80 mm; 116.0 mm with a
  122.7 mm circle on the inlet side and 142.0 mm on the outlet side for 120 mm); the fan mount
  takes Arctic's plain circle, which is smaller and fits either way round. Read from the
  datasheets hosted at <https://static.chipdip.ru/lib/388/DOC012388512.pdf> (80 mm) and
  <https://static.chipdip.ru/lib/679/DOC011679251.pdf> (120 mm).
- **Noctua** spaces the holes of its 140 mm fans 124.5 mm apart (relayed: Noctua's NF-A14 FLX
  datasheet, <https://noctua.at/pub/media/blfa_files/infosheet/noctua_nf_a14_flx_datasheet_en_web.pdf>,
  as quoted by a web search; noctua.at refused this session's requests, so the document itself
  was not read). Arctic draws 125.00 mm. The fan mount cuts each 140 mm hole as a slot from
  124.5 to 125 mm, so either maker's fan fits.

## Not yet confirmed

- That a printed hole of 4.5 mm takes the fan's screws: a test print, the owner's step.
- That the 140 mm slot holds both makers' fans: the same.
