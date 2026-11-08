export type Tile =
  | "road"
  | "lot"
  | "home"
  | "office"
  | "factory"
  | "hospital"
  | "park"
  | "water";
export type Gear = "tree" | "tower" | "fan" | "mist" | "rain";
const terrain: Record<string, Tile> = {
  ".": "road",
  _: "lot",
  h: "home",
  o: "office",
  f: "factory",
  H: "hospital",
  p: "park",
  w: "water",
};
export interface Level {
  name: string;
  brief: string;
  map: string[];
  base: number;
  limit: number;
  budget: number;
  duration: number;
  focus: number[];
  gear: Gear[];
  events: number;
  integrity: number;
  income: number;
  size: number;
  tiles: Tile[];
  rescue?: { hold: number; sectors: { name: string; cells: number[] }[] };
}
const all: Gear[] = ["tree", "tower", "fan", "mist", "rain"];
function level(
  name: string,
  brief: string,
  map: string[],
  base: number,
  limit: number,
  budget: number,
  duration: number,
  focus: string,
  gear: Gear[],
  events: number,
  integrity = 100,
  income = 3,
): Level {
  const cells = map.join("");
  if (
    !map.every((row) => row.length === map.length) ||
    [...cells].some((char) => !terrain[char])
  )
    throw Error(name);
  return {
    name,
    brief,
    map,
    base,
    limit,
    budget,
    duration,
    gear,
    events,
    integrity,
    income,
    size: map.length,
    tiles: [...cells].map((char) => terrain[char]),
    focus: [...cells].flatMap((char, i) => (focus.includes(char) ? [i] : [])),
  };
}
export const levels = [
  (() => {
    const town = level(
      "新手小镇",
      "启动资金已到位。把冷却设施分给北区、中区和南区，三个街区都稳住就可以撤离。",
      [
        "pp._hh.w",
        "p_.hhh.w",
        ".......w",
        "hh._pp.w",
        "hh._pH.w",
        ".......w",
        "_o.hh_.w",
        "pp.hhp.w",
      ],
      37,
      37.4,
      114,
      55,
      "h",
      ["tree", "tower"],
      0,
      100,
      0,
    );
    return {
      ...town,
      rescue: {
        hold: 8,
        sectors: ["北区", "中区", "南区"].map((name, i) => ({
          name,
          cells: town.focus.filter(
            (cell) => Math.floor(cell / town.size / 3) === i,
          ),
        })),
      },
    };
  })(),

  level(
    "炎热商业街",
    "商业楼在午间蓄热，沿街分散部署，避免只冷却一侧。",
    [
      "h._oo.hw",
      "h._oo.hw",
      ".......w",
      "p.oo_.pw",
      "p._o_.pw",
      ".......w",
      "h._oo.hw",
      "pp.__.pw",
    ],
    38,
    38.4,
    100,
    195,
    "o",
    ["tree", "tower", "mist"],
    1,
    110,
    5,
  ),
  level(
    "工业热源",
    "为工厂上风侧的冷却塔配上引导器，保护厂区和工人住宅。",
    [
      "hh.__.fw",
      "hh._f.fw",
      ".......w",
      "pp._ff.w",
      "p_._ff.w",
      ".......w",
      "hh._o.hw",
      "hp.__.hw",
    ],
    38.1,
    39.2,
    108,
    205,
    "fh",
    ["tree", "tower", "fan", "mist"],
    2,
    108,
    5,
  ),
  level(
    "医院保卫战",
    "三家医院都在监控范围内，尽早建立分布式冷却。",
    [
      "pH._hh.w",
      "p_.hh_.w",
      ".......w",
      "hh._pH.w",
      "hh._oo.w",
      ".......w",
      "_H.hh_.w",
      "pp.hhp.w",
    ],
    39,
    37.8,
    105,
    215,
    "H",
    ["tree", "tower", "fan", "mist"],
    2,
    104,
    5,
  ),
  level(
    "干旱城市",
    "河道消失，财政补给缓慢。用低成本绿化提高长期覆盖率。",
    [
      "p_.hh._p",
      "__.hh.__",
      "........",
      "hh._pp.h",
      "hh.___.h",
      "........",
      "_o._h.__",
      "pp._hp._",
    ],
    38,
    38.7,
    62,
    225,
    "h",
    ["tree", "tower", "fan", "mist"],
    2,
    108,
    4,
  ),
  level(
    "热浪突袭",
    "查看事件预警，留一笔资金应对突发升温。",
    [
      "oo.__.pw",
      "oo.hh._w",
      ".......w",
      "_h._HH.w",
      "hh._op.w",
      ".......w",
      "f_.hh_.w",
      "f_.hhp.w",
    ],
    38.7,
    38.6,
    113,
    235,
    "hH",
    ["tree", "tower", "fan", "mist", "rain"],
    4,
    116,
    6,
  ),
  level(
    "城市连锁危机",
    "重点建筑横跨城区。停电时用绿化与喷雾维持冷却。",
    [
      "H_.ff.hw",
      "h_._f.hw",
      ".......w",
      "ho._Ho.w",
      "h_._oo.w",
      ".......w",
      "_f.hhH.w",
      "p_.hhp.w",
    ],
    39,
    39.3,
    118,
    250,
    "fHo",
    all,
    5,
    120,
    6,
  ),
  level(
    "终极热浪",
    "保住医院和密集住宅，给末段的热浪留足机动资金。",
    [
      "H_.hh.fw",
      "hh._f.fw",
      ".......w",
      "hh._HH.w",
      "hh._oo.w",
      ".......w",
      "hH.hh_.w",
      "pp.hho.w",
    ],
    39.9,
    39.2,
    124,
    270,
    "hH",
    all,
    6,
    126,
    6,
  ),
];
