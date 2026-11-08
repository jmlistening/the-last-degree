import * as T from "three";
import type { Level } from "./levels";

export function createWater(level: Level) {
  const geometry = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const material = new T.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 river;
      void main(){
        vec4 point=instanceMatrix*vec4(position,1.);
        river=point.xz;
        gl_Position=projectionMatrix*modelViewMatrix*point;
      }`,
    fragmentShader: `
      varying vec2 river;
      uniform float time;
      void main(){
        float ripple=sin(river.y*19.+sin(river.x*13.-time)*1.3-time*2.1);
        float ripple2=sin(river.y*35.-river.x*15.+time*1.4);
        float streak=pow(max(0.,ripple*.72+ripple2*.28),12.);
        float bend=.5+.5*sin(river.x*8.+river.y*.85+time*.48);
        vec3 water=mix(vec3(.054,.116,.235),vec3(.092,.30,.43),bend);
        gl_FragColor=vec4(water+vec3(.19,.62,.71)*streak*.55,1.);
      }`,
  });
  const cells = level.tiles.flatMap((tile, i) => (tile === "water" ? [i] : []));
  const mesh = new T.InstancedMesh(geometry, material, cells.length);
  const transform = new T.Matrix4();
  const n = level.size,
    center = (n - 1) / 2;
  cells.forEach((i, index) => {
    mesh.setMatrixAt(
      index,
      transform.makeTranslation(
        (i % n) - center,
        0.007,
        Math.floor(i / n) - center,
      ),
    );
  });
  return {
    mesh,
    update(time: number, heat: boolean) {
      material.uniforms.time.value = time;
      mesh.visible = !heat && cells.length > 0;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function createFieldGeometry() {
  return new T.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
}

export function createFieldMaterial(size: number, preview: boolean) {
  return new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    uniforms: {
      clock: { value: 0 },
      intensity: { value: 0 },
      tint: { value: new T.Color(0x55ecff) },
      edge: { value: size * 0.5 },
      preview: { value: Number(preview) },
    },
    vertexShader: `
      varying vec2 field;
      varying vec2 world;
      void main() {
        field=uv*2.-1.;
        world=(modelMatrix*vec4(position,1.)).xz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
      }`,
    fragmentShader: `
      varying vec2 field;
      varying vec2 world;
      uniform vec3 tint;
      uniform float clock;
      uniform float intensity;
      uniform float edge;
      uniform float preview;
      void main() {
        if(max(abs(world.x),abs(world.y))>edge) discard;
        float radius=length(field);
        if(radius>1.) discard;
        float rim=smoothstep(.957,.989,radius);
        float angle=atan(field.y,field.x);
        float dashes=mix(1.,smoothstep(-.22,.32,sin(angle*34.)),preview);
        float wave=abs(radius-fract(clock));
        float pulse=(1.-smoothstep(.008,.048,wave))*(1.-preview)*.51;
        float alpha=(rim*dashes*.78 + (1.-radius)*.13 + pulse)*intensity;
        gl_FragColor=vec4(tint,alpha);
        #include <colorspace_fragment>
      }`,
  });
}

export function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.4)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(canvas);
}
