import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import { levels, type Tile } from "../src/levels";
import { advance, start, type Game } from "../src/sim";
import scenarios from "./scenarios.json";
const python = process.env.SIM_PYTHON;
test.skipIf(!python)(
  "TypeScript and NumPy agree at every step and final cell",
  () => {
    const command = spawnSync(python!, ["scripts/parity.py"], {
      input: JSON.stringify(scenarios),
      encoding: "utf8",
    });
    expect(command.status, command.stderr).toBe(0);
    const outputs = JSON.parse(command.stdout);
    scenarios.forEach((s, i) => {
      const level = {
        ...levels[0],
        rescue: undefined,
        tiles: s.tiles as Tile[],
        size: s.size,
        base: s.base,
        duration: s.duration,
        limit: 150,
        events: 0,
        focus: [0],
      };
      let game = {
        ...start(level),
        time: s.time,
        wind: s.wind,
        rainUntil: s.rain_until ?? 0,
        facilities: s.facilities ?? [],
        events: s.events ?? [],
        ...(s.temp ? { temp: s.temp } : {}),
      } as Game;
      for (let j = 0; j < s.steps; j++) {
        game = advance(game, level);
        const average = game.temp.reduce((a, b) => a + b, 0) / game.temp.length;
        expect(average).toBeCloseTo(outputs[i].average_by_step[j], 10);
      }
      expect(game.wind).toBe(outputs[i].wind);
      game.temp.forEach((value, j) =>
        expect(value).toBeCloseTo(outputs[i].temp[j], 10),
      );
    });
  },
);
