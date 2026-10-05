// The Q22 test panel in OpenSCAD. The numbers below are defaults only: bench-node.mjs and
// the browser page pass the same values as panel.mjs with -D, so one set of numbers drives
// both engines. EXAMPLE sizes (Q18), see panel.mjs.
size = 200;
thickness = 3;
border = 10;
hex_af = 10;
wall = 2;

r = hex_af / sqrt(3);
pitch = hex_af + wall;
dx = pitch * sqrt(3) / 2;
lo = border;
hi = size - border;

function fits(x, y) = x - r >= lo && x + r <= hi && y - hex_af / 2 >= lo && y + hex_af / 2 <= hi;

centres = [
  for (i = [0 : floor(size / dx)])
    for (j = [-1 : floor(size / pitch) + 1])
      let (x = border + r + i * dx, y = border + hex_af / 2 + j * pitch + (i % 2) * pitch / 2)
        if (fits(x, y)) [x, y]
];

echo(str("HOLES=", len(centres)));

difference() {
  cube([size, size, thickness]);
  for (c = centres) translate([c[0], c[1], -1]) cylinder(r = r, h = thickness + 2, $fn = 6);
}
