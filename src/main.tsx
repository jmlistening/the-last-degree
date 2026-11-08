import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { City } from "./City";
import { levels, type Gear, type Tile } from "./levels";
import {
  advance,
  buildable,
  deploy,
  eventNames,
  rules,
  sectorSafety,
  start,
  windNames,
  type Wind,
} from "./sim";
import { audio } from "./sound";
import { readSave, writeSave, recordWin } from "./save";
import "./style.css";
import "./command.css";

const copy = {
  tiles: {
    road: "街道",
    lot: "待建空地",
    home: "居民楼",
    office: "商业大楼",
    factory: "工厂",
    hospital: "医院",
    park: "公园",
    water: "河道",
  } satisfies Record<Tile, string>,
  gear: {
    tree: ["♣", "绿化种植", "低成本持续降温 · 2 格"],
    tower: ["◉", "冷却塔", "持续范围降温 · 3 格"],
    fan: ["✣", "风向引导器", "改变附近冷却设施的扩散方向"],
    mist: ["≋", "喷雾系统", "快速降温 · 3 格 · 42 秒"],
    rain: ["☂", "人工降雨", "全城降温 24 秒 · 充能 66 秒"],
  } satisfies Record<Gear, string[]>,
};
const eventActions = {
  surge: "全城升温，预留喷雾或降雨应急。",
  outage: "警区冷却塔暂时停机，绿化仍能运作。",
  fault: "喷雾短时停机，优先保护重点建筑。",
  shift: "自然风向改变，引导器仍保持设定方向。",
  shower: "全城短时降温，可趁机储备资金。",
  overload: "警区周围升温，检查邻近重点建筑。",
};
type Screen = "home" | "levels" | "play";
function App() {
  const [save, setSave] = useState(readSave);
  const [screen, setScreen] = useState<Screen>("home");
  const [index, setIndex] = useState(0);
  const [sector, setSector] = useState(-1);
  const level = levels[index];
  const [game, setGame] = useState(() => start(level));
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState(false);
  const [help, setHelp] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [heat, setHeat] = useState(false);
  const [selected, setSelected] = useState(-1);
  const [tool, setTool] = useState<Gear | null>(null);
  const [direction, setDirection] = useState<Wind>(0);
  const [cameraAction, setCameraAction] = useState(0);
  const [message, setMessage] = useState("");
  const [grid, setGrid] = useState(false);
  const result = useRef(false);
  const [seed, setSeed] = useState(1);
  const pendingTouch = useRef<{ cell: number; tool: Gear } | null>(null);
  const playing = screen === "play";
  useEffect(() => {
    writeSave(save);
    audio.volume(save.volume);
  }, [save]);
  useEffect(() => {
    if (!playing || paused || settings || help || game.status !== "active")
      return;
    const timer = setInterval(
      () => setGame((previous) => advance(previous, level)),
      1000 / speed,
    );
    return () => clearInterval(timer);
  }, [playing, paused, settings, help, speed, level, game.status]);
  useEffect(() => {
    if (!playing || game.status === "active" || result.current) return;
    result.current = true;
    audio.cue(game.status === "won" ? "win" : "lose");
    if (game.status === "won") setSave((s) => recordWin(s, index, game.stars));
  }, [game.status, game.stars, index, playing]);
  const warning = game.events.find(
    (e) => game.time >= e.start - 12 && game.time < e.end,
  );
  useEffect(() => {
    if (warning && playing) audio.cue("warn");
  }, [warning, playing]);
  useEffect(() => {
    audio.ambient(
      screen === "home"
        ? "menu"
        : playing && !paused && !settings && !help && game.status === "active"
          ? "city"
          : null,
    );
    return () => audio.ambient(null);
  }, [screen, paused, settings, help, game.status]);
  const towerRunning = game.facilities.some((f) => f.kind === "tower");
  useEffect(() => {
    audio.tower(
      playing &&
        towerRunning &&
        !paused &&
        !settings &&
        !help &&
        game.status === "active",
    );
    return () => audio.tower(false);
  }, [playing, towerRunning, paused, settings, help, game.status]);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(id);
  }, [message]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (settings) setSettings(false);
        else if (help) setHelp(false);
        else if (playing && game.status === "active") setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settings, help, playing, game.status]);
  const click = () => audio.cue("tap");
  const launch = (i: number, retry = false) => {
    click();
    const nextSeed = retry ? seed : Math.floor(Math.random() * 2 ** 32);
    setSeed(nextSeed);
    setIndex(i);
    setSector(-1);
    setGame(start(levels[i], nextSeed));
    pendingTouch.current = null;
    result.current = false;
    setPaused(false);
    setSpeed(1);
    setTool(null);
    setSelected(-1);
    setMessage("");
    setHeat(false);
    setGrid(false);
    setHelp(i === 0 && !save.tutorial);
    setScreen("play");
  };
  const apply = (kind: Gear, cell: number) => {
    if (paused || help || settings) return;
    const updated = deploy(game, level, kind, cell, direction);
    if (typeof updated === "string") {
      setMessage(updated);
      return;
    }
    setGame(updated);
    setMessage(copy.gear[kind][1] + "已部署");
    audio.cue(kind === "rain" ? "rain" : "build");
  };
  const pick = (cell: number, touch = false) => {
    if (!playing || paused || settings || help || game.status !== "active")
      return;
    setSelected(cell);
    if (tool && buildable.includes(level.tiles[cell])) {
      if (
        touch &&
        (selected !== cell ||
          pendingTouch.current?.cell !== cell ||
          pendingTouch.current.tool !== tool)
      ) {
        pendingTouch.current = { cell, tool };
        setMessage("再次轻触确认部署");
        click();
        return;
      }
      apply(tool, cell);
    } else click();
    pendingTouch.current = null;
  };
  const average = game.temp.reduce((a, b) => a + b, 0) / game.temp.length;
  const sectors = sectorSafety(level, game.temp);
  const selectedFacility = game.facilities.find(
    (facility) => facility.cell === selected,
  );
  const safety = Math.ceil((game.health / level.integrity) * 100);
  const left = level.duration - game.time;
  const time =
    String(Math.floor(left / 60)).padStart(2, "0") +
    ":" +
    String(left % 60).padStart(2, "0");
  const goLevels = () => {
    click();
    setScreen("levels");
    setPaused(false);
  };
  const dismissHelp = () => {
    click();
    setHelp(false);
    setSave((s) => ({ ...s, tutorial: true }));
  };
  const best = save.stars.reduce((a, b) => a + b, 0);
  return (
    <main onPointerDownCapture={() => audio.unlock()}>
      <div
        className={
          "world " +
          (playing ? "playing" : "backdrop") +
          (average > 39 ? " hot" : "")
        }
      >
        <City
          level={level}
          game={game}
          heat={heat}
          selected={playing ? selected : -1}
          quality={save.quality}
          onPick={pick}
          cameraAction={cameraAction}
          tool={tool}
          direction={direction}
          interactive={
            playing &&
            !paused &&
            !settings &&
            !help &&
            !grid &&
            game.status === "active"
          }
          touchPreview={pendingTouch.current?.cell === selected ? selected : -1}
          highlightedCells={level.rescue?.sectors[sector]?.cells}
        />
        <div className="atmosphere" />
      </div>
      {!playing && (
        <header className="top">
          <button
            className="wordmark"
            onClick={() => {
              click();
              setScreen("home");
            }}
          >
            <i>◈</i> THE LAST DEGREE
          </button>
          <div className="top-right">
            <span className="signal">● 系统在线</span>
            <button
              onClick={() => {
                click();
                setSettings(true);
              }}
            >
              ⚙ 设置
            </button>
          </div>
        </header>
      )}
      {screen === "home" && (
        <section className="hero">
          <div className="eyebrow">
            <b /> 城市应急指挥中心 / HEATWAVE RESPONSE
          </div>
          <h1>
            最后一度<span>热浪危机</span>
          </h1>
          <p>
            热浪正在逼近。每一度都关乎一座城。
            <br />
            调度降温设施，守住居民的安全线。
          </p>
          <button className="primary" onClick={goLevels}>
            开始游戏 <strong>→</strong>
          </button>
          <div className="hero-meta">
            <span>
              08 <small>救援区域</small>
            </span>
            <span>
              05 <small>降温手段</small>
            </span>
            <span>
              ★ {best} <small>救援星章</small>
            </span>
          </div>
        </section>
      )}
      {screen === "home" && (
        <footer>
          <span>地表观测 / SURFACE MONITOR</span>
          <span>行动代号 · 最后一度</span>
        </footer>
      )}
      {screen === "levels" && (
        <section className="level-screen">
          <button
            onClick={() => {
              click();
              setScreen("home");
            }}
          >
            ← 返回
          </button>
          <div className="eyebrow">CAMPAIGN / 城市救援行动</div>
          <h2>选择救援区域</h2>
          <div className="level-grid">
            {levels.map((l, i) => (
              <button
                key={l.name}
                className="level-card"
                disabled={i > save.unlocked}
                onClick={() => launch(i)}
              >
                <small>
                  区域 {String(i + 1).padStart(2, "0")}{" "}
                  <span>{i > save.unlocked ? "未解锁" : "可部署"}</span>
                </small>
                <b>{l.name}</b>
                <p>{l.brief}</p>
                <div className="stars">
                  {"★".repeat(save.stars[i] ?? 0)}
                  {"☆".repeat(3 - (save.stars[i] ?? 0))}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
      {playing && (
        <>
          <header className="hud">
            <div className="mission">
              <small>
                区域 {String(index + 1).padStart(2, "0")} / 救援行动
              </small>
              <b>{level.name}</b>
            </div>
            <div className="metrics">
              <div>
                <small>资金</small>
                <b className="green">₡ {game.cash}</b>
              </div>
              <div>
                <small>城市安全</small>
                <b className={safety < 25 ? "danger" : ""}>
                  {safety}
                  <sup>%</sup>
                </b>
              </div>
              <div>
                <small>行动剩余</small>
                <b>{time}</b>
              </div>
            </div>
            <div className="top-right">
              <button
                onClick={() => {
                  click();
                  setHelp(true);
                }}
                aria-label="教学"
              >
                ?
              </button>
            </div>
          </header>
          <aside className="objective">
            <small>
              ▰ 区域监测 <span className="readout-tag">LIVE</span>
            </small>
            <div className="thermal-readout">
              <span>平均温度</span>
              <strong>
                {average.toFixed(1)}
                <sup>°C</sup>
              </strong>
            </div>
            {level.rescue ? (
              <>
                <b>三区同步救援</b>
                <small>各区六成达标 · ≤ {level.limit}°C</small>
                <div className="rescue-sectors">
                  {level.rescue.sectors.map(({ name }, i) => (
                    <button
                      key={name}
                      aria-pressed={sector === i}
                      onClick={() => {
                        click();
                        setSector(sector === i ? -1 : i);
                      }}
                    >
                      {name}
                      <strong className={sectors[i] >= 0.6 ? "green" : "amber"}>
                        {Math.round(sectors[i] * 100)}%
                      </strong>
                    </button>
                  ))}
                </div>
                <div className="progress">
                  <i
                    style={{
                      width: (game.stable / level.rescue.hold) * 100 + "%",
                    }}
                  />
                </div>
                <small>
                  撤离读秒 {game.stable}/{level.rescue.hold} 秒
                </small>
              </>
            ) : (
              <>
                <b>保护重点建筑</b>
                <p>
                  结束时至少 60% 目标建筑 ≤ {level.limit}°C，且城市安全值大于
                  0。
                </p>
                <div className="progress">
                  <i style={{ width: game.safe * 100 + "%" }} />
                </div>
                <small>
                  达标 {Math.round(game.safe * 100)}% · 风向{" "}
                  {windNames[game.wind]}
                </small>
              </>
            )}
          </aside>
          {warning && (
            <div className="warning" role="status">
              △ {eventNames[warning.kind]} ·{" "}
              {game.time < warning.start
                ? warning.start - game.time + " 秒后发生"
                : "正在发生"}
              <small>{eventActions[warning.kind]}</small>
            </div>
          )}
          <div className="controls">
            <button
              onClick={() => {
                click();
                setPaused(true);
              }}
              aria-label="暂停"
            >
              Ⅱ
            </button>
            <button
              onClick={() => {
                click();
                setHeat((h) => !h);
              }}
              aria-pressed={heat}
            >
              ▧ 热力图
            </button>
            <button
              onClick={() => {
                click();
                setCameraAction((a) => a + 1);
              }}
            >
              ↻ 旋转
            </button>
            <button
              onClick={() => {
                click();
                setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1));
              }}
              aria-label="模拟速度"
            >
              {speed}×
            </button>
            <button
              onClick={() => {
                click();
                setGrid((v) => !v);
              }}
              aria-pressed={grid}
            >
              ▦ 网格
            </button>
          </div>
          {heat && (
            <div className="legend">
              <span>29°C</span>
              <i />
              <span>44°C+</span>
            </div>
          )}
          {grid && (
            <div
              className="grid-panel"
              style={{ gridTemplateColumns: "repeat(" + level.size + ", 1fr)" }}
            >
              {level.tiles.map((tile, i) => (
                <button
                  key={i}
                  className={i === selected ? "chosen" : ""}
                  aria-label={"地块 " + (i + 1) + " " + copy.tiles[tile]}
                  onClick={() => pick(i)}
                >
                  {tile === "water"
                    ? "≈"
                    : tile === "road"
                      ? "·"
                      : tile === "park"
                        ? "♣"
                        : tile === "lot"
                          ? "□"
                          : tile === "hospital"
                            ? "✚"
                            : "▤"}
                </button>
              ))}
              <button
                className="grid-close"
                onClick={() => {
                  click();
                  setGrid(false);
                }}
              >
                关闭网格
              </button>
            </div>
          )}
          {selected >= 0 && (
            <div className="inspect">
              <b>
                {selectedFacility
                  ? copy.gear[selectedFacility.kind][1]
                  : copy.tiles[level.tiles[selected]]}
              </b>
              <span>{game.temp[selected].toFixed(1)}°C</span>
              {level.focus.includes(selected) && (
                <small
                  className={
                    game.temp[selected] > level.limit ? "danger" : "green"
                  }
                >
                  {game.temp[selected] > level.limit ? "高温警戒" : "已达标"}
                </small>
              )}
              <button onClick={() => setSelected(-1)} aria-label="关闭地块信息">
                ×
              </button>
            </div>
          )}
          <section className="dock" aria-label="建造面板">
            <div className="dock-label">
              <b>降温部署</b>
              <span>
                {tool ? copy.gear[tool][2] : "选择设施，再点击可建造地块"}
              </span>
              {tool === "fan" && (
                <button
                  onClick={() => setDirection((d) => ((d + 1) % 4) as Wind)}
                >
                  吹向 {windNames[direction]} ↻
                </button>
              )}
            </div>
            <div className="gear">
              {level.gear.map((kind) => (
                <button
                  key={kind}
                  aria-pressed={tool === kind}
                  title={copy.gear[kind][2]}
                  onClick={() => {
                    click();
                    if (kind === "rain") apply(kind, -1);
                    else {
                      pendingTouch.current = null;
                      setTool((t) => (t === kind ? null : kind));
                    }
                  }}
                >
                  <i>{copy.gear[kind][0]}</i>
                  <span>{copy.gear[kind][1]}</span>
                  <small>
                    {kind === "rain" && game.time < game.rainReady
                      ? game.rainReady - game.time + " 秒"
                      : "₡ " + rules.gear[kind].cost}
                  </small>
                </button>
              ))}
            </div>
          </section>
          {message && (
            <div className="toast" role="status">
              {message}
            </div>
          )}
        </>
      )}
      {settings && (
        <Dialog title="游戏设置" close={() => setSettings(false)}>
          <label className="setting">
            音量{" "}
            <input
              type="range"
              min="0"
              max="1"
              step=".05"
              value={save.volume}
              onChange={(e) =>
                setSave((s) => ({ ...s, volume: Number(e.target.value) }))
              }
            />
          </label>
          <button
            onClick={() =>
              setSave((s) => ({ ...s, volume: s.volume ? 0 : 0.45 }))
            }
          >
            {save.volume ? "静音" : "取消静音"}
          </button>
          <label className="setting">
            高画质阴影{" "}
            <input
              type="checkbox"
              checked={save.quality}
              onChange={(e) =>
                setSave((s) => ({ ...s, quality: e.target.checked }))
              }
            />
          </label>
          <button className="primary" onClick={() => setSettings(false)}>
            完成
          </button>
        </Dialog>
      )}
      {help && !settings && (
        <Dialog title="行动简报" close={dismissHelp}>
          <p>{level.brief}</p>
          <ol>
            <li>点击建筑查看温度。打开热力图可定位热点。</li>
            <li>
              选择设施，点击街道、空地或公园部署。拖动旋转，滚轮或双指缩放。
            </li>
            <li>
              {level.rescue
                ? `点击监测面板里的街区名称可定位居民楼。每区至少六成达标并同时稳定 ${level.rescue.hold} 秒即可撤离。`
                : "在计时结束前，让至少六成重点建筑达到安全温度。过热会持续降低城市安全。"}
            </li>
          </ol>
          <button className="primary" onClick={dismissHelp}>
            开始行动
          </button>
        </Dialog>
      )}
      {playing && paused && !settings && !help && game.status === "active" && (
        <Dialog title="行动已暂停" close={() => setPaused(false)}>
          <button className="primary" onClick={() => setPaused(false)}>
            继续行动
          </button>
          <button onClick={() => launch(index, true)}>重新开始</button>
          <button onClick={() => setSettings(true)}>游戏设置</button>
          <button onClick={goLevels}>返回关卡</button>
        </Dialog>
      )}
      {playing && game.status !== "active" && (
        <Dialog title={game.status === "won" ? "救援成功" : "救援失败"}>
          {game.status === "won" && (
            <div className="stars result">
              {"★".repeat(game.stars)}
              {"☆".repeat(3 - game.stars)}
            </div>
          )}
          <p>
            {game.health <= 0
              ? "城市安全值耗尽。"
              : game.status === "lost"
                ? level.rescue
                  ? "计时结束，三个街区未能同时稳定到撤离条件。"
                  : "计时结束，达标的重点建筑不足 60%。"
                : "城市撑过了这一轮热浪。"}
          </p>
          <p>
            达标建筑 {Math.round(game.safe * 100)}% · 城市安全 {safety}%
          </p>
          {game.status === "won" && index < levels.length - 1 && (
            <button className="primary" onClick={() => launch(index + 1)}>
              进入下一关 →
            </button>
          )}
          <button onClick={() => launch(index, true)}>重新开始</button>
          <button onClick={goLevels}>返回关卡</button>
        </Dialog>
      )}
    </main>
  );
}
function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="scrim">
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {close && (
          <button className="close" aria-label="关闭" onClick={close}>
            ×
          </button>
        )}
        <div className="eyebrow">THE LAST DEGREE</div>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if (
  import.meta.env.PROD &&
  !Capacitor.isNativePlatform() &&
  location.hostname !== "tauri.localhost" &&
  "serviceWorker" in navigator &&
  location.protocol.startsWith("http")
) {
  void navigator.serviceWorker.register("./sw.js").catch(console.warn);
}
