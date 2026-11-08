import { devices, expect, test } from "@playwright/test";
test.use({
  viewport: devices["iPhone 13"].viewport,
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
});
test("mobile viewport and touch deployment work after an offline reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect
    .poll(
      () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      { timeout: 10000 },
    )
    .toBe(true);
  await context.setOffline(true);
  const document = await page.reload({ timeout: 15000 });
  expect(document?.fromServiceWorker()).toBe(true);
  await expect(page.getByRole("heading", { name: /最后一度/ })).toBeVisible();
  await page.getByRole("button", { name: /开始游戏/ }).tap();
  await page.getByRole("button", { name: /新手小镇/ }).tap();
  await page.getByRole("button", { name: "开始行动" }).tap();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByRole("button", { name: /冷却塔/ })).toBeInViewport();
  await page.getByRole("button", { name: /绿化种植/ }).tap();
  await page.getByRole("button", { name: "▦ 网格", exact: true }).tap();
  await page
    .getByRole("button", { name: "地块 4 待建空地", exact: true })
    .tap();
  await expect(page.getByText("绿化种植已部署")).toBeVisible();
  await page.getByRole("button", { name: "关闭网格" }).tap({ timeout: 5000 });
  await page.screenshot({
    path: "artifacts/mobile.png",
    animations: "disabled",
  });
  await page.touchscreen.tap(195, 286);
  await expect(page.getByText("再次轻触确认部署")).toBeVisible();
  await page.touchscreen.tap(195, 286);
  await expect(page.getByText("绿化种植已部署")).toBeVisible();
});
