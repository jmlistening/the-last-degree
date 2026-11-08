import { expect, test } from "@playwright/test";
import { levels } from "../src/levels";

test("all seven later districts render and the final district can call rain", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /THREE|WebGL|shader/i.test(message.text())
    )
      errors.push(message.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "last-degree-v1",
      JSON.stringify({
        unlocked: 7,
        stars: [],
        volume: 0,
        quality: false,
        tutorial: true,
      }),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: /开始游戏/ }).click();
  for (const level of levels.slice(1)) {
    await page.getByRole("button", { name: new RegExp(level.name) }).click();
    await expect(page.locator(".mission b")).toHaveText(level.name);
    const canvas = page.getByLabel("三维城市");
    await expect(canvas).toBeVisible();
    await expect(
      page.locator(".city-labels span:visible").first(),
    ).toBeVisible();
    if (level === levels[7]) {
      await page.getByRole("button", { name: /人工降雨/ }).click();
      await expect(page.getByText("人工降雨已部署")).toBeVisible();
      await page.getByRole("button", { name: /旋转/ }).click();
      await canvas.hover();
      await page.mouse.wheel(0, -140);
      await page.screenshot({
        path: "artifacts/rain.png",
        animations: "disabled",
      });
    }
    await page.getByRole("button", { name: "暂停" }).click();
    await page.getByRole("button", { name: "返回关卡" }).click();
  }
  expect(errors).toEqual([]);
});
