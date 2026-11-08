import { expect, test } from "@playwright/test";
test("3D city, deployment, win, local progress, retry and loss", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /最后一度/ })).toBeVisible();
  await expect(page.locator('canvas[aria-label="三维城市"]')).toBeVisible();
  await page.screenshot({ path: "artifacts/home.png", animations: "disabled" });
  await page.getByRole("button", { name: /开始游戏/ }).click();
  await page.getByRole("button", { name: /新手小镇/ }).click();
  await page.getByRole("button", { name: "开始行动" }).click();
  await page.getByRole("button", { name: "暂停" }).click();
  await expect(page.getByRole("dialog", { name: "行动已暂停" })).toBeVisible();
  await page.getByRole("button", { name: "继续行动" }).click();
  const north = page.getByRole("button", { name: /北区/ });
  await north.click();
  await expect(north).toHaveAttribute("aria-pressed", "true");
  await page.mouse.click(676, 409);
  await expect(
    page.getByRole("button", { name: "关闭地块信息" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭地块信息" }).click();
  await page.getByRole("button", { name: /热力图/ }).click();
  await page.getByRole("button", { name: "▦ 网格", exact: true }).click();
  await page.getByRole("button", { name: /冷却塔/ }).click();
  await page
    .getByRole("button", { name: "地块 4 待建空地", exact: true })
    .click();
  await page.getByRole("button", { name: "地块 43 街道", exact: true }).click();
  await expect(page.getByText("冷却塔已部署", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "关闭网格", exact: true }).click();
  const speed = page.getByRole("button", { name: "模拟速度" });
  await speed.click();
  await speed.click();
  await expect(speed).toHaveText("4×");
  await expect(
    page.locator(".city-labels [data-safe='true']:visible").first(),
  ).toBeVisible({ timeout: 15000 });
  await speed.click();
  await expect(speed).toHaveText("1×");
  await page.screenshot({
    path: "artifacts/heatmap.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: /热力图/ }).click();
  await page.screenshot({
    path: "artifacts/cooling.png",
    animations: "disabled",
  });
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  await page.getByRole("button", { name: "▦ 网格", exact: true }).click();
  await page.getByRole("button", { name: "地块 42 街道", exact: true }).click();
  await page.getByRole("button", { name: "关闭网格", exact: true }).click();
  await page.clock.runFor(18000);
  await expect(page.getByRole("dialog", { name: "救援成功" })).toBeVisible();
  await page.screenshot({
    path: "artifacts/victory.png",
    animations: "disabled",
  });
  await page.getByRole("button", { name: "重新开始" }).click();
  await page.clock.runFor(55000);
  await expect(page.getByRole("dialog", { name: "救援失败" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /开始游戏/ }).click();
  await expect(page.getByRole("button", { name: /炎热商业街/ })).toBeEnabled();
  expect(errors).toEqual([]);
});
