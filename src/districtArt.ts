import type { Tile } from "./levels";

type Building = Extract<Tile, "home" | "office" | "factory" | "hospital">;
export type Finish = "solid" | "glass" | "light";
type Block = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
  finish?: Finish,
) => void;

export function buildDistrict(tile: Building, i: number, block: Block): number {
  const variation = i % 3;
  const alloy = 0x465574;
  const pale = 0x9eabbf;
  const dark = 0x1c2440;
  const cyan = 0x73e7ff;
  const gold = 0xffc887;
  const glass = 0x263e71;
  block(0, 0.025, 0, 0.96, 0.05, 0.94, alloy);
  block(0, 0.054, 0, 0.81, 0.025, 0.82, 0x68768b);

  if (tile === "home") {
    const h = 0.45 + variation * 0.095;
    const wall = [0x8498bb, 0x9d89a8, 0x5d779f][variation];
    block(-0.045, h / 2 + 0.06, -0.035, 0.64, h, 0.56, wall);
    block(0.15, (h - 0.13) / 2 + 0.06, 0.19, 0.3, h - 0.13, 0.24, alloy);
    for (let floor = 0; floor < 2 + Number(variation > 0); floor++) {
      const y = 0.17 + floor * 0.156;
      block(-0.075, y - 0.058, 0.259, 0.58, 0.026, 0.09, pale);
      for (let window = 0; window < 3; window++) {
        const lit = (i + floor + window) % 4 !== 0;
        block(
          -0.272 + window * 0.17,
          y,
          0.249,
          0.105,
          0.082,
          0.013,
          lit ? gold : glass,
          lit ? "light" : "glass",
        );
        block(
          0.282,
          y,
          -0.208 + window * 0.15,
          0.013,
          0.075,
          0.083,
          lit ? 0xa4c8fd : glass,
          lit ? "light" : "glass",
        );
      }
    }
    block(-0.045, h + 0.066, -0.035, 0.69, 0.055, 0.6, dark);
    block(-0.13, h + 0.113, -0.14, 0.25, 0.042, 0.22, pale);
    for (const dx of [-0.186, -0.075])
      block(dx, h + 0.138, -0.14, 0.084, 0.012, 0.19, 0x41648f, "glass");
    block(0.21, h + 0.125, 0.058, 0.022, 0.12, 0.022, pale);
    block(0.21, h + 0.185, 0.058, 0.028, 0.022, 0.028, cyan, "light");
    return h + 0.2;
  }

  if (tile === "office") {
    const h = 1.2 + variation * 0.16;
    block(-0.07, 0.24, 0, 0.72, 0.36, 0.74, alloy);
    block(-0.09, h / 2 + 0.08, -0.06, 0.53, h, 0.52, glass, "glass");
    block(
      0.21,
      h * 0.34 + 0.06,
      0.084,
      0.24,
      h * 0.68,
      0.43,
      0x51668d,
      "glass",
    );
    for (let floor = 0; floor < Math.floor(h / 0.135); floor++) {
      const y = 0.21 + floor * 0.135;
      block(-0.09, y, 0.204, 0.55, 0.019, 0.017, pale);
      block(0.181, y, -0.06, 0.018, 0.018, 0.52, pale);
      if ((floor + i) % 3 !== 0)
        block(
          -0.14 + (floor % 2) * 0.15,
          y + 0.05,
          0.202,
          0.13,
          0.055,
          0.008,
          cyan,
          "light",
        );
    }
    block(-0.343, h / 2 + 0.08, 0.198, 0.018, h, 0.015, cyan, "light");
    block(-0.09, h + 0.096, -0.06, 0.58, 0.056, 0.55, dark);
    block(-0.22, h + 0.173, -0.12, 0.14, 0.125, 0.13, alloy);
    block(-0.22, h + 0.248, -0.12, 0.024, 0.095, 0.024, gold, "light");
    block(0.15, 0.29, 0.379, 0.26, 0.1, 0.022, 0xba8dff, "light");
    return h + 0.31;
  }

  if (tile === "hospital") {
    block(-0.08, 0.33, -0.05, 0.68, 0.54, 0.59, 0xb3c6d5);
    block(0.2, 0.212, 0.143, 0.31, 0.302, 0.49, 0x7e9fb4);
    block(-0.09, 0.658, -0.11, 0.57, 0.14, 0.44, 0x526587);
    block(-0.09, 0.737, -0.11, 0.61, 0.027, 0.47, dark);
    for (const y of [0.23, 0.41, 0.53]) {
      block(-0.12, y, 0.25, 0.49, 0.08, 0.014, glass, "glass");
      block(-0.12, y, 0.259, 0.4, 0.032, 0.011, cyan, "light");
    }
    block(0.19, 0.367, 0.267, 0.34, 0.041, 0.23, pale);
    block(0.2, 0.397, 0.38, 0.27, 0.013, 0.027, cyan, "light");
    block(-0.09, 0.755, -0.11, 0.28, 0.012, 0.077, 0xf8ffff, "light");
    block(-0.09, 0.756, -0.11, 0.077, 0.012, 0.28, 0xf8ffff, "light");
    return 0.8;
  }

  block(-0.08, 0.29, 0.02, 0.68, 0.46, 0.62, 0x65617a);
  block(-0.08, 0.53, 0.02, 0.73, 0.05, 0.64, dark);
  for (let rib = 0; rib < 5; rib++) {
    block(-0.35 + rib * 0.125, 0.28, 0.338, 0.035, 0.39, 0.027, 0x9a8494);
    block(-0.35 + rib * 0.125, 0.577, 0.08, 0.026, 0.055, 0.4, 0x9a8494);
  }
  block(0.3, 0.27, -0.15, 0.18, 0.4, 0.49, 0x455170);
  for (const dx of [-0.25, 0.1]) {
    block(dx, 0.735, -0.162, 0.105, 0.41, 0.105, alloy);
    block(dx, 0.848, -0.162, 0.113, 0.04, 0.113, gold, "light");
    block(dx, 0.947, -0.162, 0.132, 0.041, 0.132, dark);
  }
  block(-0.03, 0.32, 0.36, 0.35, 0.045, 0.019, gold, "light");
  return 1.0;
}
