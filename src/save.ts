const key = "last-degree-v1";
export interface Save {
  unlocked: number;
  stars: number[];
  volume: number;
  quality: boolean;
  tutorial: boolean;
}
const defaults: Save = {
  unlocked: 0,
  stars: [],
  volume: 0.35,
  quality: true,
  tutorial: false,
};
export function readSave(storage: Storage = localStorage): Save {
  try {
    const s = JSON.parse(storage.getItem(key) ?? "null");
    if (!s || typeof s !== "object")
      return { ...defaults, quality: !matchMedia("(pointer:coarse)").matches };
    const stars = Array.from({ length: 8 }, (_, i) => {
      const value = s.stars?.[i];
      return Number.isInteger(value) && value >= 0 && value <= 3 ? value : 0;
    });
    const unlocked = Number.isInteger(s.unlocked)
      ? Math.max(0, Math.min(7, s.unlocked))
      : 0;
    return {
      unlocked,
      stars,
      volume:
        typeof s.volume === "number" && s.volume >= 0 && s.volume <= 1
          ? s.volume
          : defaults.volume,
      quality: typeof s.quality === "boolean" ? s.quality : defaults.quality,
      tutorial: s.tutorial === true,
    };
  } catch {
    return { ...defaults };
  }
}
export function writeSave(save: Save, storage: Storage = localStorage) {
  try {
    storage.setItem(key, JSON.stringify(save));
  } catch {
    /* Private browsing or exhausted storage. */
  }
}
export function recordWin(save: Save, index: number, score: number): Save {
  const stars = Array.from({ length: 8 }, (_, i) =>
    i === index ? Math.max(score, save.stars[i] ?? 0) : (save.stars[i] ?? 0),
  );
  return {
    ...save,
    stars,
    unlocked: Math.min(7, Math.max(save.unlocked, index + 1)),
  };
}
