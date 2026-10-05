// The printer list (backlog item printer-presets, #13; Q115): every printer in
// docs/printer-beds.md, in its order, each bed read from the maker's own site on 5 Oct 2026
// (the sources are in that file). test/printers.test.ts reads the table against this list.

export interface PrinterModel {
  id: string; // lower case and dashes, from the model's name
  maker: string;
  model: string; // as the table names it
  bedXMm: number;
  bedYMm: number;
}

export const PRINTERS: readonly PrinterModel[] = [
  { id: 'prusa-mk4s', maker: 'Prusa', model: 'Original Prusa MK4S', bedXMm: 250, bedYMm: 210 },
  { id: 'prusa-mini-plus', maker: 'Prusa', model: 'Original Prusa MINI+', bedXMm: 180, bedYMm: 180 },
  { id: 'prusa-core-one-plus-gen-2', maker: 'Prusa', model: 'Prusa CORE One+ (Gen 2)', bedXMm: 250, bedYMm: 220 },
  { id: 'prusa-core-one-l', maker: 'Prusa', model: 'Prusa CORE One L', bedXMm: 300, bedYMm: 300 },
  { id: 'prusa-xl-plus-single-tool', maker: 'Prusa', model: 'Prusa XL+ Single-Tool', bedXMm: 360, bedYMm: 360 },
  { id: 'bambu-lab-a1', maker: 'Bambu Lab', model: 'Bambu Lab A1', bedXMm: 256, bedYMm: 256 },
  { id: 'bambu-lab-a1-mini', maker: 'Bambu Lab', model: 'Bambu Lab A1 mini', bedXMm: 180, bedYMm: 180 },
  { id: 'bambu-lab-a2l', maker: 'Bambu Lab', model: 'Bambu Lab A2L', bedXMm: 330, bedYMm: 320 },
  { id: 'bambu-lab-p1s', maker: 'Bambu Lab', model: 'Bambu Lab P1S', bedXMm: 256, bedYMm: 256 },
  { id: 'bambu-lab-p2s', maker: 'Bambu Lab', model: 'Bambu Lab P2S', bedXMm: 256, bedYMm: 256 },
  { id: 'bambu-lab-x1c', maker: 'Bambu Lab', model: 'Bambu Lab X1C', bedXMm: 256, bedYMm: 256 },
  { id: 'bambu-lab-x2d-main-nozzle', maker: 'Bambu Lab', model: 'Bambu Lab X2D (main nozzle)', bedXMm: 256, bedYMm: 256 },
  { id: 'bambu-lab-h2d-single-nozzle', maker: 'Bambu Lab', model: 'Bambu Lab H2D (single nozzle)', bedXMm: 325, bedYMm: 320 },
  { id: 'bambu-lab-h2s', maker: 'Bambu Lab', model: 'Bambu Lab H2S', bedXMm: 340, bedYMm: 320 },
  { id: 'creality-ender-3-v3', maker: 'Creality', model: 'Creality Ender-3 V3', bedXMm: 220, bedYMm: 220 },
  { id: 'creality-ender-3-v3-se', maker: 'Creality', model: 'Creality Ender-3 V3 SE', bedXMm: 220, bedYMm: 220 },
  { id: 'creality-ender-3-v3-ke', maker: 'Creality', model: 'Creality Ender-3 V3 KE', bedXMm: 220, bedYMm: 220 },
  { id: 'creality-k1c', maker: 'Creality', model: 'Creality K1C', bedXMm: 220, bedYMm: 220 },
  { id: 'creality-k1-max', maker: 'Creality', model: 'Creality K1 Max', bedXMm: 300, bedYMm: 300 },
  { id: 'creality-k2-plus', maker: 'Creality', model: 'Creality K2 Plus', bedXMm: 350, bedYMm: 350 },
  { id: 'anycubic-kobra-3-combo', maker: 'Anycubic', model: 'Anycubic Kobra 3 (Combo)', bedXMm: 250, bedYMm: 250 },
  { id: 'anycubic-kobra-3-v2-combo', maker: 'Anycubic', model: 'Anycubic Kobra 3 V2 Combo', bedXMm: 255, bedYMm: 255 },
  { id: 'anycubic-kobra-s1', maker: 'Anycubic', model: 'Anycubic Kobra S1', bedXMm: 250, bedYMm: 250 },
  { id: 'elegoo-neptune-4', maker: 'Elegoo', model: 'Elegoo Neptune 4', bedXMm: 225, bedYMm: 225 },
  { id: 'elegoo-neptune-4-pro', maker: 'Elegoo', model: 'Elegoo Neptune 4 Pro', bedXMm: 225, bedYMm: 225 },
  { id: 'elegoo-centauri-carbon', maker: 'Elegoo', model: 'Elegoo Centauri Carbon', bedXMm: 256, bedYMm: 256 },
  { id: 'sovol-sv06', maker: 'Sovol', model: 'Sovol SV06', bedXMm: 220, bedYMm: 220 },
  { id: 'sovol-sv06-ace', maker: 'Sovol', model: 'Sovol SV06 ACE', bedXMm: 220, bedYMm: 220 },
  { id: 'flashforge-adventurer-5m', maker: 'Flashforge', model: 'Flashforge Adventurer 5M', bedXMm: 220, bedYMm: 220 },
];

export const PRINTER_IDS: readonly string[] = PRINTERS.map((p) => p.id);

export function printerById(id: string): PrinterModel | undefined {
  return PRINTERS.find((p) => p.id === id);
}
