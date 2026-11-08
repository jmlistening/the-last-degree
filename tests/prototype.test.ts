import { expect, test } from "vitest";
import { levels } from "../src/levels";
import { advance, deploy, sectorSafety, start } from "../src/sim";
test("town has a complete win and loss loop", () => {
  const level = levels[0];
  let idle = start(level);
  while (idle.status === "active") idle = advance(idle, level);
  expect(idle.status).toBe("lost");
  const play = (cells: number[]) => {
    let game = start(level);
    for (const cell of cells) {
      const deployed = deploy(game, level, "tower", cell, 0);
      if (typeof deployed === "string") throw Error(deployed + " " + cell);
      game = deployed;
    }
    while (game.status === "active") game = advance(game, level);
    return game;
  };
  const uneven = play([3, 27, 50]);
  expect(uneven.safe).toBeGreaterThan(0.8);
  expect(uneven.status).toBe("lost");
  const game = play([3, 42, 41]);
  expect(game.status).toBe("won");
  expect(game.time).toBeLessThan(level.duration);
  expect(game.stable).toBe(level.rescue!.hold);
  for (const fraction of sectorSafety(level, game.temp)) {
    expect(fraction).toBeGreaterThanOrEqual(0.6);
  }
});
