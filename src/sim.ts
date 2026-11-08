import rules from "./rules.json";
import type { Gear, Level, Tile } from "./levels";
export { rules };
type Build = Exclude<Gear, "rain">;
export type Wind = 0 | 1 | 2 | 3;
export const directions = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;
export const windNames = ["东", "南", "西", "北"];
export const eventNames = {
  surge: "高温锋面",
  outage: "区域停电",
  fault: "喷雾故障",
  shift: "风向突变",
  shower: "短暂阵雨",
  overload: "设备过载",
};
type EventKind = keyof typeof eventNames;
export interface CityEvent {
  kind: EventKind;
  start: number;
  end: number;
  center: number;
  wind: Wind;
}
interface Facility {
  kind: Build;
  cell: number;
  built: number;
  wind: Wind;
}
export interface Game {
  time: number;
  cash: number;
  health: number;
  temp: number[];
  facilities: Facility[];
  wind: Wind;
  rainUntil: number;
  rainReady: number;
  events: CityEvent[];
  status: "active" | "won" | "lost";
  stars: number;
  safe: number;
  stable: number;
}
export function sectorSafety(level: Level, temp: readonly number[]) {
  return (
    level.rescue?.sectors.map(
      ({ cells }) =>
        cells.filter((cell) => temp[cell] <= level.limit).length / cells.length,
    ) ?? []
  );
}
const eventKinds = Object.keys(eventNames) as EventKind[];
export const buildable: Tile[] = ["lot", "park", "road"];
export function start(level: Level, seed = 1): Game {
  const rand = (max: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor((seed / 4294967296) * max);
  };
  const events = Array.from({ length: level.events }, (_, i): CityEvent => {
    const begin =
      Math.floor(((i + 1) * level.duration) / (level.events + 1)) + rand(9);
    return {
      kind: eventKinds[(i + rand(eventKinds.length)) % eventKinds.length],
      start: begin,
      end: begin + 21,
      center: level.focus[rand(level.focus.length)],
      wind: rand(4) as Wind,
    };
  });
  return {
    time: 0,
    cash: level.budget,
    health: level.integrity,
    temp: level.tiles.map((t) => level.base + rules.terrain[t]),
    facilities: [],
    wind: 0,
    rainUntil: 0,
    rainReady: 0,
    events,
    status: "active",
    stars: 0,
    safe: 0,
    stable: 0,
  };
}
export function deploy(
  game: Game,
  level: Level,
  kind: Gear,
  cell: number,
  wind: Wind,
): Game | string {
  if (game.status !== "active") return "本轮行动已结束";
  if (!level.gear.includes(kind)) return "本关未开放该设施";
  if (game.cash < rules.gear[kind].cost) return "资金不足";
  if (kind === "rain") {
    if (game.time < game.rainReady) return "人工降雨充能中";
    return {
      ...game,
      cash: game.cash - rules.gear.rain.cost,
      rainUntil: game.time + rules.gear.rain.life,
      rainReady: game.time + rules.gear.rain.cooldown,
    };
  }
  if (!buildable.includes(level.tiles[cell])) return "请选择街道、空地或公园";
  const facilities = game.facilities.filter(
    (f) => f.kind !== "mist" || game.time - f.built < rules.gear.mist.life,
  );
  if (facilities.some((f) => f.cell === cell)) return "这里已有设施";
  return {
    ...game,
    cash: game.cash - rules.gear[kind].cost,
    facilities: [...facilities, { kind, cell, built: game.time, wind }],
  };
}
export function temperatureStep(
  temp: number[],
  target: number[],
  size: number,
): number[] {
  return temp.map((value, i) => {
    let total = 0,
      count = 0;
    for (const [dx, dz] of directions) {
      const x = (i % size) + dx,
        z = Math.floor(i / size) + dz;
      if (x >= 0 && x < size && z >= 0 && z < size) {
        total += temp[z * size + x];
        count++;
      }
    }
    return (
      value +
      rules.relax * (target[i] - value) +
      rules.diffuse * (count ? total / count - value : 0)
    );
  });
}
export function advance(game: Game, level: Level): Game {
  if (game.status !== "active") return game;
  const { size } = level,
    time = game.time + 1;
  const distance = (a: number, b: number) =>
    Math.hypot(
      (a % size) - (b % size),
      Math.floor(a / size) - Math.floor(b / size),
    );
  const active = game.events.filter((e) => time >= e.start && time < e.end);
  const wind = game.events.reduce(
    (current, e) => (e.kind === "shift" && time >= e.start ? e.wind : current),
    game.wind,
  );
  const facilities = game.facilities.filter(
    (f) => f.kind !== "mist" || time - f.built <= rules.gear.mist.life,
  );
  const fans = facilities.filter((f) => f.kind === "fan");
  const heat =
    1.4 * Math.sin((Math.PI * time) / level.duration) +
    (time / level.duration) * 1.5;
  const target = level.tiles.map((tile, i) => {
    let value = level.base + rules.terrain[tile] + heat;
    if (tile !== "water") {
      for (const [dx, dz] of directions) {
        const x = (i % size) + dx,
          z = Math.floor(i / size) + dz;
        if (
          x >= 0 &&
          x < size &&
          z >= 0 &&
          z < size &&
          level.tiles[z * size + x] === "water"
        )
          value -= 0.65;
      }
    }
    if (time <= game.rainUntil) value -= rules.gear.rain.power;
    for (const e of active) {
      if (e.kind === "surge") value += 2.7;
      if (e.kind === "shower") value -= 1.8;
      if (e.kind === "overload" && distance(i, e.center) <= 2) value += 3.5;
    }
    for (const f of facilities) {
      if (
        f.kind === "fan" ||
        active.some(
          (e) =>
            (e.kind === "outage" &&
              f.kind === "tower" &&
              distance(f.cell, e.center) < 3) ||
            (e.kind === "fault" && f.kind === "mist"),
        )
      )
        continue;
      const spec = rules.gear[f.kind],
        fan = fans.find(
          (item) => distance(item.cell, f.cell) <= rules.gear.fan.radius,
        );
      const [dx, dz] = directions[fan?.wind ?? wind];
      const x = (i % size) - (f.cell % size),
        z = Math.floor(i / size) - Math.floor(f.cell / size);
      const offset = f.kind === "tree" ? 0 : fan ? rules.fanBoost : 0.25;
      const d = Math.hypot(x - dx * offset, z - dz * offset);
      value -= spec.power * Math.max(0, 1 - d / (spec.radius + 0.5));
    }
    return value;
  });
  const temp = temperatureStep(game.temp, target, size);
  const exposure =
    level.focus.reduce(
      (sum, i) => sum + Math.max(0, temp[i] - level.limit),
      0,
    ) / level.focus.length;
  const safe =
    level.focus.filter((i) => temp[i] <= level.limit).length /
    level.focus.length;
  const health = Math.max(0, game.health - exposure * 0.23);
  const stable =
    level.rescue && sectorSafety(level, temp).every((value) => value >= 0.6)
      ? game.stable + 1
      : 0;
  const cleared = level.rescue
    ? stable >= level.rescue.hold
    : time >= level.duration && safe >= 0.6;
  const status =
    health <= 0
      ? "lost"
      : cleared
        ? "won"
        : time >= level.duration
          ? "lost"
          : "active";
  const stars =
    status === "won"
      ? 1 +
        Number(health >= level.integrity * 0.55) +
        Number(health >= level.integrity * 0.82 && safe >= 0.85)
      : 0;
  return {
    ...game,
    time,
    temp,
    facilities,
    wind,
    health,
    safe,
    stable,
    status,
    stars,
    cash: game.cash + (time % 15 === 0 ? level.income : 0),
  };
}
