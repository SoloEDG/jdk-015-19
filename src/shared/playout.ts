import { reactive } from "vue";
import type { Scene, SceneAudio } from "./types";

/**
 * 一次过渡在「正式切场」时刻拍下的场景快照。
 * 过渡期间原场景即使被编辑或标记删除，播出端仍按此快照完成本次过渡，
 * 旧版本继续使用它自己的主题、视觉与音频参数。
 */
export interface SceneSnapshot {
  id: string;
  kind: Scene["kind"];
  theme: string;
  intensity: number;
  speed: number;
  audio: SceneAudio;
}

export interface Playout {
  onAirId: string;
  previous: SceneSnapshot | undefined;
  current: SceneSnapshot | undefined;
  startedAt: number;
  durationMs: number;
  /** 是否仍处于淡入淡出过渡中，由渲染循环按时间推进判定 */
  transitioning: boolean;
}

export function snapshotOf(scene: Scene): SceneSnapshot {
  return {
    id: scene.id,
    kind: scene.kind,
    theme: scene.theme,
    intensity: scene.intensity,
    speed: scene.speed,
    audio: { ...scene.audio },
  };
}

export function createPlayout(initial: Scene): Playout {
  return reactive({
    onAirId: initial.id,
    previous: undefined,
    current: snapshotOf(initial),
    startedAt: 0,
    durationMs: 0,
    transitioning: false,
  });
}

/** 当前正在驱动正式音频/渲染参数的场景（过渡中始终是旧版本）。 */
export function effectiveScene(
  scenes: Scene[],
  playout: Playout,
): Scene | undefined {
  const id = playout.transitioning
    ? (playout.previous?.id ?? playout.onAirId)
    : playout.onAirId;
  return scenes.find((s) => s.id === id);
}

/**
 * 推进过渡时钟。过渡结束时清理 previous，确保不会出现「两边场景都没了」
 * 的空档——current 始终是一份完整快照，渲染端永远有画面可画。
 */
export function settlePlayout(playout: Playout, now: number) {
  if (
    playout.transitioning &&
    now - playout.startedAt >= playout.durationMs
  ) {
    playout.previous = undefined;
    playout.transitioning = false;
  }
}
