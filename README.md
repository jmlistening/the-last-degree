<div align="center">

<h1>The Last Degree: Heatwave Crisis</h1>
<p><strong>An eight-mission 3D strategy game about keeping a city habitable during a heat wave.</strong></p>
<p>Place cooling towers, steer their coverage with wind guides, and watch the temperature map respond as the simulation runs.</p>

<p>
<img alt="React 19" src="https://img.shields.io/badge/React-19-149ECA">
<img alt="Three.js" src="https://img.shields.io/badge/Three.js-WebGL-242938">
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6">
<img alt="Offline PWA" src="https://img.shields.io/badge/PWA-offline-5A0FC8">
<img alt="MIT License" src="https://img.shields.io/badge/License-MIT-2EA44F">
</p>

<p><a href="README.md">English</a> · <a href="README.zh-CN.md">简体中文</a></p>
<p><a href="docs/images/demo.gif"><strong>Watch the gameplay demo</strong></a></p>
<img src="docs/images/demo.gif" alt="A real playthrough showing cooling towers, the temperature map, three stabilized sectors, and the victory screen" width="100%">
<p><sub>Edited footage from a real Edge playthrough. The demo follows tower placement, falling temperatures, and a three-star evacuation.</sub></p>

</div>

---

**[Gameplay](#gameplay)** · **[Engineering](#engineering)** · **[Quick start](#quick-start)** · **[Verification](#verification)** · **[Privacy](#privacy)** · **[Visual review](docs/VISUAL_REVIEW.md)**

## Gameplay

The opening town is a **55-second rescue drill** with the full budget available from the start. Get at least 60% of the monitored homes in **each** of three sectors to the safety threshold or below. Keep all three stable for eight simulated seconds to win early. Select a sector on the HUD to locate its homes.

Seven later maps introduce industrial hot spots, hospitals, budget constraints and forecast events. Trees, cooling towers, wind guides, mist systems and rain offer different costs and areas of effect. Best scores and unlocked levels are saved in the current browser.

| Before deployment | Cooling response |
| --- | --- |
| ![Tower placement preview](artifacts/placement.png) | ![Cooling fields and live temperature readouts](artifacts/cooling.png) |

[Heat map](artifacts/heatmap.png) · [Mobile layout](artifacts/mobile.png) · [Rain in the final district](artifacts/rain.png) · [Victory screen](artifacts/victory.png)

## Engineering

| Component | Implementation |
| --- | --- |
| Simulation | Seeded, fixed-step TypeScript model. Cell temperatures combine diffusion, environmental heating and distance-weighted cooling with wind offsets. |
| Rendering | Procedural Three.js architecture, instanced geometry, water and cooling shaders, and projected temperature labels. Rendering and simulation use separate clocks. |
| Interaction | Raycast placement and preview, mouse orbit and zoom, touch confirmation and a precision grid. |
| Offline | Vite builds a static PWA. The generated service worker precaches versioned assets. The game runs locally after the first successful cache. |
| Numerical reference | FastAPI and NumPy provide a reference for the game's simplified temperature model. Regression fixtures compare TypeScript and NumPy outputs for the same inputs. |

[Visual review and measured software-renderer frame intervals](docs/VISUAL_REVIEW.md) · [API reference](docs/API.md)

## Quick start

Use Node.js 24 and pnpm 11.25.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm preview
```

Open [the local preview](http://127.0.0.1:4173/). On Windows, double-click **Start.bat** after building to launch the game on port 4188 with Python 3. Double-click **Stop.bat** to stop the local server.

The game interface is in Chinese. Choose **开始游戏** (Start Game), then **新手小镇** (Starter Town). Hover a buildable tile to preview the area, click to build, or tap twice on a touchscreen. The bottom bar controls pause, heat map, rotation, speed and the placement grid.

## Verification

The production build and local checks passed with **15 Vitest tests, 4 pytest tests and 3 Edge end-to-end tests**. Coverage includes an early clear, a lost run with uneven sector coverage, later district rendering, rain, browser save recovery, and offline touch deployment. A separate launcher smoke test verified that `Stop.bat` releases port 4188.

```sh
pnpm test
python -m pytest -q
pnpm build
pnpm test:e2e
```

Install [the Python dependencies](backend/requirements.txt) for pytest and set `SIM_PYTHON` to that interpreter to enable the numerical parity test. GitHub workflows are manually triggered. Windows and Android packaging instructions are included, and native installers are pending. [Packaging guide](README.zh-CN.md)

## Privacy

The browser stores campaign progress and settings locally. The Windows launcher listens on `127.0.0.1` and serves `dist/`. The demo was captured in a clean browser session and shows the game viewport. Each launcher run generates a local stop token in a Git-ignored file.

[MIT License](LICENSE) · [Changelog](CHANGELOG.md) · [中文技术文章草稿](docs/CSDN.md) · [Known issues](ISSUES.md)
