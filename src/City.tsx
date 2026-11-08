import { useEffect, useRef } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Gear, Level } from "./levels";
import type { Game } from "./sim";
import { buildable, deploy, directions, rules, type Wind } from "./sim";
import { buildDistrict, type Finish } from "./districtArt";
import {
  createFieldGeometry,
  createFieldMaterial,
  createGlowTexture,
  createWater,
} from "./cityEffects";

const terrainColors = {
  road: 0x26324a,
  lot: 0x424969,
  home: 0x455571,
  office: 0x3c4567,
  factory: 0x46445c,
  hospital: 0x62758c,
  park: 0x285c52,
  water: 0x25426f,
};
const warm = new T.Color();
const markerColor = new T.Color();
const cool = new T.Color(0x29c9fa),
  temperate = new T.Color(0x715f9b),
  hot = new T.Color(0xf64e24);
interface Props {
  level: Level;
  game: Game;
  heat: boolean;
  selected: number;
  quality: boolean;
  onPick: (cell: number, touch?: boolean) => void;
  cameraAction: number;
  tool: Gear | null;
  direction: Wind;
  interactive: boolean;
  highlightedCells?: readonly number[];
  touchPreview: number;
}
export function City(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const { level, quality } = props;
  useEffect(() => {
    const host = container.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: quality, alpha: true });
    } catch {
      host.dataset.unavailable = "true";
      return;
    }
    host.dataset.unavailable = "false";
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality ? 1.7 : 1.1));
    renderer.shadowMap.enabled = quality;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = quality;
    renderer.shadowMap.type = T.PCFShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-label", "三维城市");
    host.append(renderer.domElement);
    const scene = new T.Scene();
    scene.fog = new T.Fog(0x19203a, 9, 36);
    const n = level.size;
    const camera = new T.OrthographicCamera();
    camera.position.set(n * 0.89, n * 0.93, n * 1.07);
    const controls = new OrbitControls(camera, renderer.domElement);
    const reducedMotion = matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.11;
    controls.enablePan = false;
    controls.minZoom = 0.65;
    controls.maxZoom = 2.4;
    controls.maxPolarAngle = 1.28;
    controls.minPolarAngle = 0.36;
    controls.update();
    const resize = () => {
      const w = host.clientWidth,
        h = host.clientHeight;
      if (!w || !h) return;
      const half = n * 0.72 * Math.max(1, 1.06 / (w / h));
      camera.left = (-half * w) / h;
      camera.right = (half * w) / h;
      camera.top = half;
      camera.bottom = -half;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const sky = new T.HemisphereLight(0xa9c9ff, 0x432b62, 2.1);
    scene.add(sky);
    const sun = new T.DirectionalLight(0xffdbc4, 2.65);
    sun.position.set(-6, 11, 5);
    sun.castShadow = quality;
    Object.assign(sun.shadow.camera, {
      left: -n,
      right: n,
      top: n,
      bottom: -n,
      near: 0.1,
      far: 30,
    });
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.normalBias = 0.018;
    sun.shadow.radius = 3;
    scene.add(sun);
    const rim = new T.DirectionalLight(0x76a1ff, 1.55);
    rim.position.set(6, 5, -7);
    scene.add(rim);
    const box = new T.BoxGeometry(),
      cone = new T.IcosahedronGeometry(0.5, 0),
      cylinder = new T.CylinderGeometry(0.47, 0.5, 1, 12);
    const mat = new T.MeshStandardMaterial({ roughness: 0.79 });
    const glass = new T.MeshStandardMaterial({
      roughness: 0.24,
      metalness: 0.32,
    });
    const lit = new T.MeshBasicMaterial({ toneMapped: false });
    const white = new T.MeshBasicMaterial({
      color: 0x8ff0c7,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    });
    const base = new T.Mesh(
      box,
      new T.MeshStandardMaterial({
        color: 0x222842,
        roughness: 0.72,
        metalness: 0.18,
      }),
    );
    base.position.y = -0.32;
    base.scale.set(n + 0.3, 0.5, n + 0.3);
    base.receiveShadow = quality;
    scene.add(base);
    const dummy = new T.Object3D();
    const place = (
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      return dummy.matrix;
    };
    type Piece = { matrix: T.Matrix4; color: number; vegetationCell?: number };
    const pieces = new Map<T.BufferGeometry, Piece[]>([
      [box, []],
      [cone, []],
      [cylinder, []],
    ]);
    const trims: Record<Exclude<Finish, "solid">, Piece[]> = {
      glass: [],
      light: [],
    };
    const piece = (
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      color: number,
      geom: T.BufferGeometry = box,
      vegetationCell?: number,
      finish: Finish = "solid",
    ) => {
      const batch = finish === "solid" ? pieces.get(geom)! : trims[finish];
      batch.push({
        matrix: place(x, y, z, sx, sy, sz).clone(),
        color,
        vegetationCell,
      });
    };
    const at = (i: number) =>
      [(i % n) - (n - 1) / 2, Math.floor(i / n) - (n - 1) / 2] as const;
    const tiles = new T.InstancedMesh(box, mat, n * n);
    tiles.receiveShadow = quality;
    scene.add(tiles);
    const pickTargets: T.Object3D[] = [tiles];
    const pickMaterial = new T.MeshBasicMaterial({ visible: false });
    const roofHeights = new Float32Array(n * n);
    const river = createWater(level);
    scene.add(river.mesh);
    const glowTexture = createGlowTexture();
    const lampGlow = new T.SpriteMaterial({
      map: glowTexture,
      color: 0x74d6ff,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      blending: T.AdditiveBlending,
      toneMapped: false,
    });
    const addLamp = (x: number, z: number) => {
      piece(x, 0.17, z, 0.026, 0.34, 0.026, 0x495975);
      piece(x + 0.046, 0.335, z, 0.125, 0.023, 0.05, 0x67788e);
      piece(
        x + 0.075,
        0.32,
        z,
        0.058,
        0.012,
        0.036,
        0x9df7ff,
        box,
        undefined,
        "light",
      );
      if (!quality) return;
      const halo = new T.Sprite(lampGlow);
      halo.position.set(x + 0.075, 0.32, z);
      halo.scale.setScalar(0.27);
      scene.add(halo);
    };
    for (const edge of [-1, 1]) {
      piece(0, -0.18, edge * (n / 2 + 0.151), n + 0.24, 0.025, 0.021, 0x577bb2);
      piece(edge * (n / 2 + 0.151), -0.18, 0, 0.021, 0.025, n + 0.24, 0x577bb2);
      piece(0, -0.36, edge * (n / 2 + 0.154), n + 0.24, 0.08, 0.023, 0x313e5d);
      piece(edge * (n / 2 + 0.154), -0.36, 0, 0.023, 0.08, n + 0.24, 0x313e5d);
      for (let j = 0; j < n; j++) {
        const offset = j - (n - 1) / 2;
        const color = j % 4 === 0 ? 0xffc488 : 0x59cce9;
        piece(
          offset,
          -0.19,
          edge * (n / 2 + 0.164),
          0.19,
          0.022,
          0.014,
          color,
          box,
          undefined,
          "light",
        );
        piece(
          edge * (n / 2 + 0.164),
          -0.19,
          offset,
          0.014,
          0.022,
          0.19,
          color,
          box,
          undefined,
          "light",
        );
      }
    }

    const tree = (x: number, z: number, variant: number, cell: number) => {
      piece(x, 0.14, z, 0.067, 0.27, 0.067, 0x685544, cylinder);
      piece(
        x,
        0.34,
        z,
        0.34,
        0.43,
        0.32,
        variant ? 0x278264 : 0x39876e,
        cone,
        cell,
      );
      piece(
        x - 0.06,
        0.44,
        z - 0.025,
        0.24,
        0.29,
        0.25,
        variant ? 0x63bd87 : 0x7ab99a,
        cone,
        cell,
      );
    };
    level.tiles.forEach((tile, i) => {
      const [x, z] = at(i);
      tiles.setMatrixAt(i, place(x, -0.045, z, 0.994, 0.09, 0.994));
      tiles.setColorAt(i, new T.Color(terrainColors[tile]));
      if (tile === "water") {
        for (const edge of [-1, 1]) {
          const other = (i % n) + edge;
          if (other >= 0 && other < n && level.tiles[i + edge] === "water")
            continue;
          piece(x + edge * 0.467, 0.029, z, 0.064, 0.061, 1, 0x546682);
          piece(
            x + edge * 0.46,
            0.063,
            z - 0.18,
            0.02,
            0.009,
            0.21,
            0x6ce8ff,
            box,
            undefined,
            "light",
          );
        }
      } else if (tile === "road") {
        const side =
          (level.tiles[i - 1] === "road" && i % n > 0) ||
          (level.tiles[i + 1] === "road" && i % n < n - 1);
        for (const k of [-0.23, 0.23])
          piece(
            x + (side ? k : 0),
            0.003,
            z + (side ? 0 : k),
            side ? 0.2 : 0.024,
            0.007,
            side ? 0.024 : 0.2,
            0xd7ad78,
          );
        for (const k of [-0.445, 0.445])
          piece(
            x + (side ? 0 : k),
            0.017,
            z + (side ? k : 0),
            side ? 0.96 : 0.055,
            0.034,
            side ? 0.055 : 0.96,
            0x647995,
          );
        if (i % 4 === 1) addLamp(x - 0.33, z + 0.38);
        if (side && i % 6 === 2) {
          for (let j = 0; j < 5; j++)
            piece(
              x + 0.37,
              0.007,
              z - 0.25 + j * 0.123,
              0.12,
              0.008,
              0.064,
              0x92a7c1,
            );
        }
      } else if (tile === "park" || tile === "lot") {
        if (tile === "park") {
          tree(x - 0.23, z - 0.23, i % 2, i);
          tree(x + 0.21, z + 0.19, (i + 1) % 2, i);
          piece(x, 0.009, z, 0.14, 0.012, 0.95, 0x839ba4);
          piece(x - 0.15, 0.055, z + 0.26, 0.15, 0.07, 0.048, 0x6e7e9a);
          piece(x + 0.28, 0.038, z - 0.28, 0.21, 0.057, 0.21, 0x395777);
          piece(
            x + 0.28,
            0.072,
            z - 0.28,
            0.13,
            0.012,
            0.13,
            0x57c8d3,
            box,
            undefined,
            "light",
          );
        } else {
          piece(x, 0.009, z, 0.64, 0.014, 0.58, 0x283650);
          for (const edge of [-1, 1]) {
            piece(x + edge * 0.31, 0.021, z, 0.017, 0.01, 0.56, 0x637392);
            piece(x, 0.021, z + edge * 0.28, 0.63, 0.01, 0.018, 0x637392);
          }
          for (let j = 0; j < 3; j++)
            piece(
              x - 0.19 + j * 0.18,
              0.02,
              z + 0.17,
              0.062,
              0.016,
              0.023,
              0xffca7a,
              box,
              undefined,
              "light",
            );
        }
      } else {
        const top = buildDistrict(
          tile,
          i,
          (dx, y, dz, w, h, d, color, finish) => {
            piece(x + dx, y, z + dz, w, h, d, color, box, undefined, finish);
          },
        );
        roofHeights[i] = top;
        const hit = new T.Mesh(box, pickMaterial);
        hit.position.set(x, top / 2, z);
        hit.scale.set(0.78, top, 0.77);
        hit.userData.cell = i;
        scene.add(hit);
        pickTargets.push(hit);
      }
    });
    const vegetation: {
      mesh: T.InstancedMesh;
      instance: number;
      cell: number;
      color: number;
    }[] = [];
    function batchPieces(
      geometry: T.BufferGeometry,
      material: T.Material,
      list: Piece[],
    ) {
      if (!list.length) return;
      const batch = new T.InstancedMesh(geometry, material, list.length);
      list.forEach((p, i) => {
        batch.setMatrixAt(i, p.matrix);
        batch.setColorAt(i, warm.setHex(p.color));
        if (p.vegetationCell !== undefined)
          vegetation.push({
            mesh: batch,
            instance: i,
            cell: p.vegetationCell,
            color: p.color,
          });
      });
      batch.castShadow = quality && material !== lit;
      batch.receiveShadow = quality && material !== lit;
      scene.add(batch);
    }
    for (const [geometry, list] of pieces) batchPieces(geometry, mat, list);
    batchPieces(box, glass, trims.glass);
    batchPieces(box, lit, trims.light);

    const labels = document.createElement("div");
    labels.className = "city-labels";
    labels.setAttribute("aria-hidden", "true");
    host.append(labels);
    const flags = level.focus.map((i) => {
      const material = new T.MeshBasicMaterial({
        color: 0x8af3ff,
        toneMapped: false,
      });
      const flag = new T.Mesh(cone, material);
      const [x, z] = at(i);
      const top = roofHeights[i];
      flag.position.set(x, top + 0.13, z);
      flag.scale.set(0.082, 0.125, 0.082);
      const label = document.createElement("span");
      labels.append(label);
      scene.add(flag);
      return { i, flag, material, top, label };
    });
    const roads = level.tiles.flatMap((tile, i) =>
      tile === "road" && i % n < n - 1 && level.tiles[i + 1] === "road"
        ? [i]
        : [],
    );
    const moving = roads
      .filter((_, i) => i % 3 === 0)
      .slice(0, 12)
      .map((i, j) => {
        const object = new T.Group();
        const add = (
          sx: number,
          sy: number,
          sz: number,
          y: number,
          color: number,
        ) => {
          const mesh = new T.Mesh(box, new T.MeshStandardMaterial({ color }));
          mesh.scale.set(sx, sy, sz);
          mesh.position.y = y;
          object.add(mesh);
        };
        if (j % 3 === 0) {
          add(0.058, 0.14, 0.057, 0.075, 0xd2a269);
          add(0.066, 0.065, 0.064, 0.174, 0xf0ccb0);
        } else {
          add(0.27, 0.105, 0.14, 0.08, j % 2 ? 0xe3b264 : 0x62aba6);
          add(0.14, 0.07, 0.125, 0.154, 0x495e62);
        }
        scene.add(object);
        return { object, i, j };
      });
    const marker = new T.Mesh(box, white);
    marker.scale.set(0.97, 0.015, 0.97);
    scene.add(marker);
    const hoverMaterial = new T.MeshBasicMaterial({
      color: 0xffd394,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const hoverMarker = new T.Mesh(box, hoverMaterial);
    hoverMarker.scale.set(0.95, 0.009, 0.95);
    scene.add(hoverMarker);
    const edgeGeometry = new T.EdgesGeometry(box);
    const outline = new T.LineSegments(
      edgeGeometry,
      new T.LineBasicMaterial({
        color: 0xffca80,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      }),
    );
    scene.add(outline);
    const fieldGeometry = createFieldGeometry();
    const preview = new T.Mesh(fieldGeometry, createFieldMaterial(n, true));
    preview.position.y = 0.052;
    preview.renderOrder = 4;
    preview.visible = false;
    scene.add(preview);
    let hovered = -1;
    let previewGame: Game | undefined,
      previewCell = -1,
      previewTool: Gear | null = null;
    let previewDirection: Wind = 0;
    const footprint = (
      game: Game,
      kind: Exclude<Gear, "rain">,
      cell: number,
    ) => {
      const [x, z] = at(cell);
      const fan = game.facilities.find((f) => {
        if (f.kind !== "fan") return false;
        const [fx, fz] = at(f.cell);
        return Math.hypot(fx - x, fz - z) <= rules.gear.fan.radius;
      });
      const [dx, dz] = directions[fan?.wind ?? game.wind];
      const offset =
        kind === "tree" || kind === "fan" ? 0 : fan ? rules.fanBoost : 0.25;
      return {
        x: x + dx * offset,
        z: z + dz * offset,
        radius: rules.gear[kind].radius + (kind === "fan" ? 0 : 0.5),
      };
    };
    const cracks = new T.InstancedMesh(
      box,
      new T.MeshBasicMaterial({
        color: 0x815642,
        transparent: true,
        opacity: 0.65,
      }),
      n * n * 3,
    );
    cracks.count = 0;
    cracks.frustumCulled = false;
    scene.add(cracks);
    const hazeGeometry = new T.PlaneGeometry(2.4, 0.32);
    const hazeMaterial = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: T.DoubleSide,
      uniforms: { time: { value: 0 }, strength: { value: 0 } },
      vertexShader:
        "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: `varying vec2 vUv; uniform float time; uniform float strength;
        void main(){
          float wave=sin(vUv.x*29.+vUv.y*26.-time*3.+sin(vUv.x*18.-time)*2.);
          float edge=sin(vUv.x*3.14159)*sin(vUv.y*3.14159);
          gl_FragColor=vec4(1.,.68,.37,edge*pow(max(wave,0.),4.)*strength);
        }`,
    });
    const haze = level.focus
      .filter((_, i) => i % 3 === 0)
      .map((i) => {
        const band = new T.Mesh(hazeGeometry, hazeMaterial);
        const [x, z] = at(i);
        band.position.set(x, 1.38, z);
        scene.add(band);
        return band;
      });
    const facilityGroup = new T.Group();
    scene.add(facilityGroup);
    const facilityMaterials = [0x48a985, 0x426f9c, 0x946b4c, 0x5f8eae].map(
      (color) =>
        new T.MeshStandardMaterial({ color, metalness: 0.28, roughness: 0.38 }),
    );
    const coreMaterial = new T.MeshBasicMaterial({
      color: 0x82f2ff,
      toneMapped: false,
    });
    const waterCloudMaterial = new T.SpriteMaterial({
      map: glowTexture,
      color: 0x93c2ef,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    const rainCloud = Array.from({ length: 8 }, (_, i) => {
      const puff = new T.Sprite(waterCloudMaterial);
      puff.position.set(
        Math.sin(i * 2.4) * n * 0.35,
        3.25 + (i % 3) * 0.15,
        Math.cos(i * 2.4) * n * 0.35,
      );
      puff.scale.set(2.8, 1.2, 1);
      scene.add(puff);
      return puff;
    });
    const rainGeometry = new T.BufferGeometry();
    const drops = new Float32Array((quality ? 190 : 76) * 6);
    rainGeometry.setAttribute("position", new T.BufferAttribute(drops, 3));
    const rainMaterial = new T.LineBasicMaterial({
      color: 0x9bd5ff,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const rainLines = new T.LineSegments(rainGeometry, rainMaterial);
    rainLines.frustumCulled = false;
    scene.add(rainLines);
    let visualKey = "",
      cameraAction = latest.current.cameraAction;
    type Rig = {
      group: T.Group;
      spinner: T.Mesh;
      born: number;
      kind: Exclude<Gear, "rain">;
      cell: number;
      key: string;
      hit: T.Mesh;
      field?: T.Mesh<T.PlaneGeometry, T.ShaderMaterial>;
    };
    let rigs: Rig[] = [];
    let emitterRigs: Rig[] = [];
    let emitters: Rig[] = [];
    const refresh = (now: number, reset: boolean) => {
      const key = latest.current.game.facilities
        .map((f) => f.cell + ":" + f.kind + ":" + f.built + ":" + f.wind)
        .join(",");
      if (!reset && key === visualKey) return;
      visualKey = key;
      const old = new Map(rigs.map((rig) => [rig.key, rig]));
      rigs = latest.current.game.facilities.map((f): Rig => {
        const id = f.cell + ":" + f.kind + ":" + f.built + ":" + f.wind;
        const existing = old.get(id);
        if (existing && !reset) {
          old.delete(id);
          return existing;
        }
        const [x, z] = at(f.cell),
          group = new T.Group();
        group.position.set(x, 0.025, z);
        const style = ["tree", "tower", "fan", "mist"].indexOf(f.kind);
        const [dx, dz] = directions[f.wind];
        group.rotation.y = Math.atan2(dx, dz);
        const mesh = (
          geo: T.BufferGeometry,
          sx: number,
          sy: number,
          sz: number,
          y: number,
          material: T.Material = facilityMaterials[style],
        ) => {
          const m = new T.Mesh(geo, material);
          m.position.y = y;
          m.scale.set(sx, sy, sz);
          m.castShadow = quality;
          group.add(m);
          return m;
        };
        mesh(cylinder, 0.59, 0.1, 0.59, 0.04);
        if (f.kind !== "tree")
          mesh(cylinder, 0.46, 0.035, 0.46, 0.106, coreMaterial);
        mesh(cylinder, 0.12, f.kind === "tree" ? 0.35 : 0.5, 0.12, 0.24);
        const spinner = mesh(
          f.kind === "tree" ? cone : f.kind === "fan" ? box : cylinder,
          f.kind === "tree" ? 0.53 : 0.42,
          f.kind === "tree" ? 0.62 : f.kind === "fan" ? 0.085 : 0.15,
          f.kind === "fan" ? 0.055 : 0.43,
          0.48,
        );
        let field: Rig["field"];
        if (f.kind === "tower" || f.kind === "mist") {
          mesh(cylinder, 0.26, 0.46, 0.26, 0.36);
          mesh(cylinder, 0.36, 0.028, 0.36, 0.565, coreMaterial);
          mesh(cylinder, 0.19, 0.11, 0.19, 0.625, coreMaterial);
          field = new T.Mesh(fieldGeometry, createFieldMaterial(n, false));
          field.position.y = 0.044;
          field.renderOrder = 3;
          scene.add(field);
        }
        facilityGroup.add(group);
        const hit = new T.Mesh(box, pickMaterial);
        hit.position.set(x, 0.34, z);
        hit.scale.set(0.59, 0.68, 0.59);
        hit.userData.cell = f.cell;
        scene.add(hit);
        pickTargets.push(hit);
        return {
          group,
          spinner,
          born: now,
          kind: f.kind,
          cell: f.cell,
          key: id,
          field,
          hit,
        };
      });
      for (const rig of old.values()) {
        rig.group.removeFromParent();
        rig.hit.removeFromParent();
        const target = pickTargets.indexOf(rig.hit);
        if (target >= 0) pickTargets.splice(target, 1);
        rig.field?.removeFromParent();
        rig.field?.material.dispose();
      }
      emitterRigs = rigs.filter((rig) => rig.field);
      renderer.shadowMap.needsUpdate = quality;
    };
    const count = quality ? 220 : 85;
    const particles = new Float32Array(count * 3);
    const particleGeometry = new T.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new T.BufferAttribute(particles, 3),
    );
    const particleMaterial = new T.PointsMaterial({
      color: 0x8bffe7,
      size: 0.045,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const cloud = new T.Points(particleGeometry, particleMaterial);
    cloud.frustumCulled = false;
    scene.add(cloud);
    let prior: Game | undefined,
      priorHeat = false,
      frame = 0,
      sampleAt = 0,
      samples = 0;
    let ratio = renderer.getPixelRatio();
    const baseline = level.tiles.map(
      (tile) => level.base + rules.terrain[tile],
    );
    const targetColors = level.tiles.map(
      (tile) => new T.Color(terrainColors[tile]),
    );
    const displayedColors = targetColors.map((color) => color.clone());
    const labelPoint = new T.Vector3();
    let colorFrames = 0,
      rotationLeft = 0,
      lastFrame = 0;
    const tick = (ms: number) => {
      const {
        game,
        heat,
        selected,
        interactive,
        tool,
        direction,
        touchPreview,
      } = latest.current;
      const s = ms * 0.001;
      const dt = lastFrame ? Math.min(0.08, s - lastFrame) : 0.016;
      lastFrame = s;
      const reset = Boolean(prior && game.time < prior.time);
      const rain = game.rainUntil > 0 && game.rainUntil >= game.time;
      river.update(reducedMotion ? 0 : s, heat);
      if (prior !== game || priorHeat !== heat) {
        refresh(s, reset);
        emitters = [];
        const disruptions = game.events.filter(
          (event) =>
            game.time >= event.start &&
            game.time < event.end &&
            (event.kind === "outage" || event.kind === "fault"),
        );
        for (const rig of emitterRigs) {
          const [x, z] = at(rig.cell);
          const offline = disruptions.some((event) => {
            if (event.kind === "fault") return rig.kind === "mist";
            const [ex, ez] = at(event.center);
            return rig.kind === "tower" && Math.hypot(ex - x, ez - z) < 3;
          });
          rig.field!.visible = !offline;
          if (offline) continue;
          emitters.push(rig);
          const area = footprint(game, rig.kind, rig.cell);
          rig.field!.position.set(area.x, 0.044, area.z);
          rig.field!.scale.setScalar(area.radius);
        }
        colorFrames = 30;
        cracks.count = 0;
        level.tiles.forEach((tile, i) => {
          warm.setHex(terrainColors[tile]);
          if (heat) {
            const t = T.MathUtils.clamp((game.temp[i] - 29) / 15, 0, 1);
            if (t < 0.5) warm.copy(cool).lerp(temperate, t * 2);
            else warm.copy(temperate).lerp(hot, (t - 0.5) * 2);
          } else if (tile !== "water") {
            const relief = T.MathUtils.clamp(
              (baseline[i] - game.temp[i] - 0.35) * 0.23,
              0,
              0.7,
            );
            const stress = T.MathUtils.clamp(
              (game.temp[i] - level.limit) * 0.14,
              0,
              0.58,
            );
            if (relief > 0.04) warm.lerp(cool, relief);
            else warm.lerp(hot, stress * (tile === "road" ? 0.57 : 1));
          }
          targetColors[i].copy(warm);
          if (
            !heat &&
            game.temp[i] > 40 &&
            (tile === "lot" || tile === "park")
          ) {
            const [x, z] = at(i);
            for (let j = 0; j < 3; j++) {
              dummy.rotation.y = (i + j) * 1.84;
              cracks.setMatrixAt(
                cracks.count++,
                place(
                  x - 0.27 + j * 0.24,
                  0.024,
                  z + 0.28 - j * 0.17,
                  0.12,
                  0.004,
                  0.012,
                ),
              );
            }
            dummy.rotation.y = 0;
          }
        });
        cracks.instanceMatrix.needsUpdate = true;
        flags.forEach(({ i, material, label }) => {
          const safe = game.temp[i] <= level.limit;
          material.color.set(safe ? 0x66eaff : 0xff7951);
          label.textContent = game.temp[i].toFixed(1) + "°";
          label.dataset.safe = String(safe);
        });
        markerColor.setHex(0xc5a370);
        vegetation.forEach(({ mesh, instance, cell, color }) => {
          const stress = T.MathUtils.clamp(
            (game.temp[cell] - 36) * 0.2,
            0,
            0.75,
          );
          mesh.setColorAt(
            instance,
            warm.setHex(color).lerp(markerColor, stress),
          );
        });
        if (vegetation.length)
          vegetation[0].mesh.instanceColor!.needsUpdate = true;
        tiles.instanceColor!.needsUpdate = true;
        const phase = game.time / level.duration;
        const night = T.MathUtils.clamp((phase - 0.78) / 0.22, 0, 1);
        sky.intensity = 2.1 - phase * 0.45;
        sun.intensity = (2.65 - night * 1.1) * (rain ? 0.74 : 1);
        sun.color
          .set(phase > 0.65 ? 0xffa6a1 : 0xffdbc4)
          .lerp(markerColor.setHex(0x93b7ff), night);
        prior = game;
        priorHeat = heat;
      }
      if (colorFrames > 0) {
        colorFrames--;
        displayedColors.forEach((color, i) => {
          color.lerp(
            targetColors[i],
            colorFrames && !reducedMotion ? 1 - Math.exp(-dt * 9) : 1,
          );
          tiles.setColorAt(i, color);
        });
        tiles.instanceColor!.needsUpdate = true;
      }
      flags.forEach(({ flag, top }, i) => {
        flag.position.y = top + 0.16 + Math.sin(s * 2 + i) * 0.05;
        flag.rotation.y = s;
      });
      hazeMaterial.uniforms.time.value = s;
      hazeMaterial.uniforms.strength.value = game.temp.some((t) => t > 42)
        ? 0.17
        : 0;
      haze.forEach((band) => {
        band.visible =
          quality && !heat && hazeMaterial.uniforms.strength.value > 0;
        band.quaternion.copy(camera.quaternion);
      });
      if (cameraAction !== latest.current.cameraAction) {
        rotationLeft +=
          ((latest.current.cameraAction - cameraAction) * Math.PI) / 4;
        hovered = -1;
        cameraAction = latest.current.cameraAction;
      }
      if (Math.abs(rotationLeft) > 0.0002) {
        const step = reducedMotion
          ? rotationLeft
          : rotationLeft * (1 - Math.exp(-dt * 9));
        camera.position.applyAxisAngle(T.Object3D.DEFAULT_UP, step);
        rotationLeft -= step;
      }
      controls.update();
      camera.updateMatrixWorld();
      flags.forEach(({ i, flag, label }, index) => {
        const highlighted = latest.current.highlightedCells?.includes(i);
        flag.visible =
          interactive &&
          (highlighted || heat || game.temp[i] > level.limit + 0.4);
        const visible =
          interactive &&
          (highlighted ||
            i === selected ||
            index % (level.focus.length > 12 ? 4 : 3) === 0);
        if (visible)
          labelPoint
            .copy(flag.position)
            .addScaledVector(T.Object3D.DEFAULT_UP, 0.085)
            .project(camera);
        label.hidden =
          !visible ||
          Math.abs(labelPoint.x) > 0.94 ||
          Math.abs(labelPoint.y) > 0.92;
        if (!label.hidden)
          label.style.transform = `translate(${(labelPoint.x + 1) * 50}cqw,${(1 - labelPoint.y) * 50}cqh) translate(-50%,-100%)`;
      });
      const candidate = interactive
        ? hovered >= 0
          ? hovered
          : touchPreview
        : -1;
      hoverMarker.visible = interactive && hovered >= 0 && hovered !== selected;
      if (hoverMarker.visible) {
        const [x, z] = at(hovered);
        hoverMarker.position.set(x, 0.038, z);
      }
      const outlined = interactive ? (hovered >= 0 ? hovered : selected) : -1;
      const roof = outlined >= 0 ? roofHeights[outlined] : 0;
      outline.visible = roof > 0;
      if (outline.visible) {
        const [x, z] = at(outlined);
        outline.position.set(x, roof / 2 + 0.03, z);
        outline.scale.set(0.86, roof + 0.05, 0.83);
      }
      if (!interactive) preview.visible = false;
      if (
        game !== previewGame ||
        candidate !== previewCell ||
        tool !== previewTool ||
        direction !== previewDirection
      ) {
        previewGame = game;
        previewCell = candidate;
        previewTool = tool;
        previewDirection = direction;
        preview.visible =
          candidate >= 0 && Boolean(tool && tool !== "rain") && interactive;
        if (preview.visible && tool && tool !== "rain") {
          const valid =
            typeof deploy(game, level, tool, candidate, direction) !== "string";
          const [x, z] = at(candidate);
          const field = valid
            ? footprint(game, tool, candidate)
            : { x, z, radius: 0.58 };
          preview.position.set(field.x, 0.052, field.z);
          preview.scale.setScalar(field.radius);
          preview.material.uniforms.tint.value.set(valid ? 0x7ff4ff : 0xff795a);
          preview.material.uniforms.intensity.value = valid ? 0.86 : 0.7;
        }
      }
      renderer.domElement.style.cursor =
        hovered < 0
          ? "grab"
          : tool && !buildable.includes(level.tiles[hovered])
            ? "not-allowed"
            : "pointer";
      marker.visible = selected >= 0;
      if (marker.visible) {
        const [x, z] = at(selected);
        marker.position.set(x, 0.012, z);
      }
      moving.forEach(({ object, i, j }) => {
        const [x, z] = at(i);
        object.position.set(
          x + ((s * (j % 3 === 0 ? 0.24 : 0.48) + j) % 1.7) - 0.35,
          0,
          z + (j % 2 ? 0.19 : -0.19),
        );
      });
      rigs.forEach(({ group, spinner, kind, born, cell, field }) => {
        const age = s - born;
        if (quality && age < 0.48) renderer.shadowMap.needsUpdate = true;
        group.scale.setScalar(
          reducedMotion
            ? 1
            : 0.22 + 0.78 * (1 - (1 - Math.min(1, age / 0.39)) ** 3),
        );
        if (kind === "fan") spinner.rotation.z = s * 12;
        if (kind === "tower") spinner.rotation.y = s * 1.5;
        if (field) {
          field.material.uniforms.clock.value = reducedMotion
            ? 0.75
            : age * 0.72;
          field.material.uniforms.intensity.value =
            age < 2
              ? 0.92 - age * 0.18
              : heat || selected === cell
                ? 0.55
                : 0.31;
        }
      });
      rainLines.visible = rain;
      rainCloud.forEach((puff) => {
        puff.visible = rain;
      });
      if (rain) {
        for (let i = 0; i < drops.length; i += 6) {
          const y = 3.4 * (1 - ((s * 1.5 + i * 0.618) % 1));
          const x = Math.sin(i * 3.71) * n * 0.49;
          const z = Math.cos(i * 2.71) * n * 0.49;
          drops[i] = x;
          drops[i + 1] = y;
          drops[i + 2] = z;
          drops[i + 3] = x + 0.035;
          drops[i + 4] = y + 0.21;
          drops[i + 5] = z - 0.022;
        }
        rainGeometry.attributes.position.needsUpdate = true;
      }
      cloud.visible = emitters.length > 0 || game.status === "won";
      if (cloud.visible) {
        for (let j = 0; j < count; j++) {
          const t = (s * 0.7 + j * 0.618) % 1,
            a = j * 2.399 + s;
          const source = emitters.length
            ? emitters[j % emitters.length].group.position
            : null;
          const wide = game.status === "won";
          particles[j * 3] = wide
            ? Math.sin(j * 3.71) * n * 0.52
            : (source?.x ?? 0) + Math.cos(a) * t * 1.7;
          particles[j * 3 + 1] = wide
            ? t * 2.5
            : 0.58 + Math.sin(t * Math.PI) * 0.34 - t * 0.35;
          particles[j * 3 + 2] = wide
            ? Math.cos(j * 2.71) * n * 0.52
            : (source?.z ?? 0) + Math.sin(a) * t * 1.7;
        }
        particleGeometry.attributes.position.needsUpdate = true;
      }
      if (!sampleAt) sampleAt = ms;
      samples++;
      if (ms - sampleAt >= 2500) {
        if (
          (samples / (ms - sampleAt)) * 1000 < 28 &&
          ratio > 0.85 &&
          !document.hidden
        ) {
          ratio = Math.max(0.85, ratio - 0.2);
          renderer.setPixelRatio(ratio);
          resize();
        }
        sampleAt = ms;
        samples = 0;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const ray = new T.Raycaster(),
      mouse = new T.Vector2();
    const readCell = (x: number, y: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.set(
        ((x - rect.left) / rect.width) * 2 - 1,
        1 - ((y - rect.top) / rect.height) * 2,
      );
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(pickTargets, false)[0];
      return hit ? (hit.instanceId ?? Number(hit.object.userData.cell)) : -1;
    };
    let down: { x: number; y: number; id: number } | null = null;
    const pointers = new Set<number>();
    const begin = (e: PointerEvent) => {
      hovered = -1;
      pointers.add(e.pointerId);
      down =
        pointers.size === 1
          ? { x: e.clientX, y: e.clientY, id: e.pointerId }
          : null;
    };
    const cancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      down = null;
      hovered = -1;
    };
    const hover = (e: PointerEvent) => {
      if (
        e.pointerType === "mouse" &&
        !pointers.size &&
        latest.current.interactive
      )
        hovered = readCell(e.clientX, e.clientY);
    };
    const leave = () => {
      hovered = -1;
    };
    const end = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      const tap =
        down &&
        e.pointerId === down.id &&
        e.button === 0 &&
        Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7;
      down = null;
      if (!tap) return;
      const cell = readCell(e.clientX, e.clientY);
      if (cell >= 0) latest.current.onPick(cell, e.pointerType === "touch");
    };
    renderer.domElement.addEventListener("pointerdown", begin);
    renderer.domElement.addEventListener("pointerup", end);
    renderer.domElement.addEventListener("pointercancel", cancel);
    renderer.domElement.addEventListener("pointermove", hover);
    renderer.domElement.addEventListener("pointerleave", leave);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      controls.dispose();
      sun.shadow.dispose();
      const materials = new Set<T.Material>([
        mat,
        glass,
        lit,
        pickMaterial,
        white,
        coreMaterial,
        lampGlow,
        waterCloudMaterial,
        rainMaterial,
        outline.material,
        ...facilityMaterials,
        particleMaterial,
      ]);
      scene.traverse((o) => {
        if (o instanceof T.InstancedMesh) o.dispose();
        if (o instanceof T.Mesh) materials.add(o.material as T.Material);
      });
      materials.forEach((m) => m.dispose());
      [
        box,
        cone,
        cylinder,
        particleGeometry,
        hazeGeometry,
        fieldGeometry,
        rainGeometry,
        edgeGeometry,
      ].forEach((g) => g.dispose());
      river.dispose();
      glowTexture.dispose();
      labels.remove();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [level, quality]);
  return <div className="city" ref={container} />;
}
