import { expect, test } from "vitest";
import { levels } from "../src/levels";
import { advance, start } from "../src/sim";
import { rescue } from "../scripts/tactics";
test.each(levels)(
  "$name requires intervention and can be cleared",
  (level) => {
    let idle = start(level, 42);
    while (idle.status === "active") idle = advance(idle, level);
    expect(idle.status).toBe("lost");
    for (const seed of [42, 2026, 2027]) {
      const { game, actions } = rescue(level, seed);
      expect(
        game.status,
        JSON.stringify({
          seed,
          health: game.health,
          safe: game.safe,
          time: game.time,
          actions,
        }),
      ).toBe("won");
      expect(game.stars).toBeGreaterThan(0);
    }
  },
  30000,
);
