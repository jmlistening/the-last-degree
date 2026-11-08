import { expect, test } from "vitest";
import { levels } from "../src/levels";
import { advance, deploy, rules, start, temperatureStep } from "../src/sim";
import { readSave, recordWin, writeSave } from "../src/save";

test("construction validates terrain, balance, availability and occupancy", () => {
  const level = levels[0],
    game = start(level);
  expect(deploy(game, level, "tower", 4, 0)).toBe("请选择街道、空地或公园");
  expect(deploy(game, level, "tower", -1, 0)).toBe("请选择街道、空地或公园");
  expect(deploy(game, level, "rain", -1, 0)).toBe("本关未开放该设施");
  expect(deploy({ ...game, cash: 0 }, level, "tree", 3, 0)).toBe("资金不足");
  const built = deploy(game, level, "tower", 3, 0);
  if (typeof built === "string") throw Error(built);
  expect(game.facilities).toHaveLength(0);
  expect(built.cash).toBe(game.cash - rules.gear.tower.cost);
  expect(deploy(built, level, "tree", 3, 0)).toBe("这里已有设施");
  expect(advance(built, level).temp[4]).toBeLessThan(
    advance(game, level).temp[4],
  );
});
test("fan redirects a mist plume, mist expires, and rain cools the full map", () => {
  const level = { ...levels[7], events: 0 },
    initial = start(level);
  const must = (value: ReturnType<typeof deploy>) => {
    if (typeof value === "string") throw Error(value);
    return value;
  };
  const mist = must(deploy(initial, level, "mist", 18, 0));
  const fan = must(deploy(mist, level, "fan", 17, 1));
  expect(advance(fan, level).temp[26]).toBeLessThan(
    advance(mist, level).temp[26],
  );
  expect(advance({ ...mist, time: 42 }, level).facilities).toHaveLength(0);
  const rain = must(deploy(initial, level, "rain", -1, 0));
  expect(deploy(rain, level, "rain", -1, 0)).toBe("人工降雨充能中");
  expect(
    advance(rain, level).temp.every(
      (value, i) => value < advance(initial, level).temp[i],
    ),
  ).toBe(true);
});
test("events are deterministic and forecastable with a twelve-tick warning", () => {
  const level = levels[7],
    game = start(level, 42);
  expect(game.events).toEqual(start(level, 42).events);
  expect(game.events).not.toEqual(start(level, 43).events);
  expect(game.events[0].start).toBeGreaterThan(12);
  const surge = {
    ...game,
    events: [{ ...game.events[0], kind: "surge" as const, start: 5, end: 6 }],
  };
  const prior = { ...surge, time: 3 };
  expect(advance(prior, level).temp).toEqual(
    advance({ ...prior, events: [] }, level).temp,
  );
  const ready = { ...prior, time: 4 };
  expect(advance(ready, level).temp[0]).toBeGreaterThan(
    advance({ ...ready, events: [] }, level).temp[0],
  );
});
test("diffusion does not wrap across opposite grid edges", () => {
  expect(temperatureStep([44, 34, 34, 34], [44, 34, 34, 34], 2)).toEqual([
    42.8, 34.6, 34.6, 34,
  ]);
});
test("local progress recovers and preserves the best score", () => {
  let value = "invalid JSON";
  const storage = {
    getItem: () => value,
    setItem: (_key: string, data: string) => {
      value = data;
    },
  } as Storage;
  const fresh = readSave(storage);
  expect(fresh.unlocked).toBe(0);
  const save = recordWin(recordWin(fresh, 0, 3), 0, 1);
  writeSave(save, storage);
  expect(readSave(storage)).toEqual(save);
  expect(save.stars[0]).toBe(3);
  expect(save.unlocked).toBe(1);
});
