import type { Gear, Level } from "../src/levels";
import {
  advance,
  buildable,
  deploy,
  rules,
  start,
  type Game,
} from "../src/sim";

// A benchmark strategy ranks sites by projected exposure across the monitored buildings.
function score(game: Game, level: Level) {
  return level.focus.reduce(
    (total, i) => total + Math.max(-0.35, game.temp[i] - level.limit),
    0,
  );
}
export function rescue(level: Level, seed: number) {
  let game = start(level, seed);
  const actions: { time: number; kind: Gear; cell: number }[] = [];
  while (game.status === "active") {
    if (game.time % 5 === 0) {
      let baseline = game;
      for (let j = 0; j < 10; j++) baseline = advance(baseline, level);
      let best = 0.18,
        choice: Game | undefined,
        action: (typeof actions)[number] | undefined;
      const kinds = level.gear.filter(
        (kind) =>
          kind !== "fan" &&
          game.cash >= rules.gear[kind].cost &&
          ((kind !== "mist" && kind !== "rain") ||
            game.time >= level.duration - 36 ||
            game.health < 25),
      );
      for (const kind of kinds) {
        if (
          kind === "tree" &&
          game.cash < 34 &&
          game.time < level.duration - 25
        )
          continue;
        const cells =
          kind === "rain"
            ? [-1]
            : level.tiles.flatMap((tile, i) =>
                buildable.includes(tile) ? [i] : [],
              );
        for (const cell of cells) {
          const next = deploy(game, level, kind, cell, 0);
          if (typeof next === "string") continue;
          let forecast = next;
          for (let j = 0; j < 10; j++) forecast = advance(forecast, level);
          const benefit =
            (score(baseline, level) - score(forecast, level)) /
            Math.sqrt(rules.gear[kind].cost);
          if (benefit > best) {
            best = benefit;
            choice = next;
            action = { time: game.time, kind, cell };
          }
        }
      }
      if (choice && action) {
        game = choice;
        actions.push(action);
      }
    }
    game = advance(game, level);
  }
  return { game, actions };
}
