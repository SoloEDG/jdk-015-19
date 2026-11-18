import type { Analysis, Scene, StageDocument } from "../../../shared/types";
import {
  effectiveScene,
  type Playout,
  type SceneSnapshot,
} from "../../../shared/playout";
import { getTheme } from "./themes";
import { drawScene } from "../lib/geometry";

export type RenderableScene = Pick<Scene, "kind" | "theme" | "intensity" | "speed">;

function fallbackSnapshot(doc: StageDocument): SceneSnapshot {
  const scene = doc.scenes.find((s) => !s.removing) ?? doc.scenes[0];
  return {
    id: scene.id,
    kind: scene.kind,
    theme: scene.theme,
    intensity: scene.intensity,
    speed: scene.speed,
    audio: { ...scene.audio },
  };
}

/**
 * 正式舞台渲染器：
 * 只依据 playout 中的切场快照作画，与编辑态完全隔离。
 * 过渡期间 previous/current 都是切场瞬间的参数快照，旧版本按原参数淡出。
 * 黑场、亮度、频闪等正式输出控制仍在这里直接生效（紧急黑场不经过预演）。
 */
export function createRenderer(
  canvas: HTMLCanvasElement,
  doc: StageDocument,
  playout: Playout,
  read: () => Analysis,
  onFrame?: (now: number) => void,
) {
  const c = canvas.getContext("2d")!;
  let raf = 0,
    last = 0,
    phase = 0;
  const scratch = document.createElement("canvas");
  scratch.width = 1280;
  scratch.height = 720;
  const sc = scratch.getContext("2d")!;
  canvas.width = 1280;
  canvas.height = 720;

  function render(ms: number) {
    const dt = Math.min(0.08, (ms - last) / 1000) || 0;
    last = ms;
    onFrame?.(ms);

    const current = playout.current ?? fallbackSnapshot(doc);
    if (!doc.frozen) phase += dt * current.speed;
    const frame = read();
    const live = effectiveScene(doc.scenes, playout);
    // 几何灵敏度跟随正在播出的场景（过渡中即旧场景），与音频端保持一致。
    const sensitivity = live?.audio.sensitivity ?? current.audio.sensitivity;

    drawScene(c, 1280, 720, current, frame, getTheme(current.theme), phase, sensitivity);

    if (playout.transitioning && playout.previous) {
      const mix = Math.min(
        1,
        Math.max(0, (ms - playout.startedAt) / (playout.durationMs || 1)),
      );
      if (mix < 1) {
        drawScene(
          sc,
          1280,
          720,
          playout.previous,
          frame,
          getTheme(playout.previous.theme),
          phase,
          playout.previous.audio.sensitivity,
        );
        c.globalAlpha = 1 - mix;
        c.drawImage(scratch, 0, 0);
        c.globalAlpha = 1;
      }
    }

    if (doc.strobe && frame.beat) {
      c.fillStyle = "#ffffff66";
      c.fillRect(0, 0, 1280, 720);
    }
    c.fillStyle = `rgba(0,0,0,${doc.blackout ? 1 : 1 - doc.master})`;
    c.fillRect(0, 0, 1280, 720);
    raf = requestAnimationFrame(render);
  }
  raf = requestAnimationFrame(render);
  return () => cancelAnimationFrame(raf);
}

/**
 * 编辑预览渲染器：全应用仅此一个预览循环，
 * 不创建任何音频节点，也不为每个场景保留长期渲染资源。
 * 不叠黑场/亮度等正式输出控制，呈现场景本身的编辑结果。
 */
export function createPreviewRenderer(
  canvas: HTMLCanvasElement,
  getScene: () => Scene,
  read: () => Analysis,
) {
  const c = canvas.getContext("2d")!;
  const W = 320,
    H = 180;
  canvas.width = W;
  canvas.height = H;
  let raf = 0,
    last = 0,
    phase = 0;

  function render(ms: number) {
    const dt = Math.min(0.08, (ms - last) / 1000) || 0;
    last = ms;
    const scene = getScene();
    phase += dt * scene.speed;
    drawScene(
      c,
      W,
      H,
      scene,
      read(),
      getTheme(scene.theme),
      phase,
      scene.audio.sensitivity,
    );
    raf = requestAnimationFrame(render);
  }
  raf = requestAnimationFrame(render);
  return () => cancelAnimationFrame(raf);
}
