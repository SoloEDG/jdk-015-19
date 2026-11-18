import { computed, reactive, type ComputedRef } from "vue";
import type { Scene, StageDocument } from "../../../shared/types";
import {
  createPlayout,
  effectiveScene,
  settlePlayout,
  snapshotOf,
  type Playout,
} from "../../../shared/playout";

let seq = 0;
function newId() {
  seq += 1;
  return `s-${Date.now().toString(36)}-${seq}`;
}

/** 深拷贝场景：副本保留全部音频响应与主题/视觉设置，但与原场景完全独立。 */
function cloneScene(scene: Scene): Scene {
  return {
    ...JSON.parse(JSON.stringify(scene)) as Scene,
    id: newId(),
    name: `${scene.name} 副本`,
    removing: false,
  };
}

export function createScenes(doc: StageDocument) {
  const playout: Playout = createPlayout(doc.scenes[0]);
  /** 预演选择是独立于播出身份的编辑态，只影响编辑预览。 */
  const state = reactive<{ previewId: string }>({ previewId: doc.scenes[0].id });

  const onAir: ComputedRef<Scene> = computed(
    () =>
      doc.scenes.find((s) => s.id === playout.onAirId) ??
      doc.scenes.find((s) => !s.removing) ??
      doc.scenes[0],
  );
  const preview: ComputedRef<Scene> = computed(
    () =>
      doc.scenes.find((s) => s.id === state.previewId) ??
      doc.scenes.find((s) => !s.removing) ??
      doc.scenes[0],
  );
  const transitioning = computed(() => playout.transitioning);
  const visibleScenes = computed(() => doc.scenes.filter((s) => !s.removing));

  /** 选中预演场景：只改变编辑预览，正式舞台与录制不受影响。 */
  function previewSelect(id: string) {
    if (doc.scenes.some((s) => s.id === id && !s.removing))
      state.previewId = id;
  }

  /**
   * 正式切场：拍下当前与目标场景快照后再切换播出身份。
   * 淡入淡出期间对场景列表的任何修改都不会串到本次过渡。
   * 紧急黑场等正式输出控制不经过这里，仍直接作用于 doc。
   */
  function take(id: string) {
    const target = doc.scenes.find((s) => s.id === id && !s.removing);
    if (!target || id === playout.onAirId) return;
    const from = effectiveScene(doc.scenes, playout);
    playout.previous = from ? snapshotOf(from) : playout.current;
    playout.current = snapshotOf(target);
    playout.onAirId = id;
    playout.startedAt = performance.now();
    playout.durationMs = Math.max(0, doc.transition) * 1000 || 1;
    playout.transitioning = true;
  }

  /** 把当前预演场景送上正式舞台。 */
  function takePreview() {
    take(state.previewId);
  }

  /** 复制场景：深拷贝保证之后修改互不影响，并自动选中副本进入预演。 */
  function duplicate(id: string) {
    const src = doc.scenes.find((s) => s.id === id);
    if (!src) return;
    const copy = cloneScene(src);
    const index = doc.scenes.findIndex((s) => s.id === id);
    doc.scenes.splice(index + 1, 0, copy);
    state.previewId = copy.id;
  }

  /**
   * 重排只改变数组顺序（数字快捷键随之按新顺序工作），
   * 播出身份由稳定 id 跟踪，不受排序影响。
   */
  function move(id: string, direction: -1 | 1) {
    const from = doc.scenes.findIndex((s) => s.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= doc.scenes.length) return;
    const [row] = doc.scenes.splice(from, 1);
    doc.scenes.splice(to, 0, row);
  }

  function removeNow(id: string) {
    const index = doc.scenes.findIndex((s) => s.id === id);
    if (index < 0) return;
    doc.scenes.splice(index, 1);
    if (state.previewId === id)
      state.previewId = (doc.scenes.find((s) => !s.removing) ?? doc.scenes[0]).id;
  }

  /**
   * 删除场景：
   * - 未参与播出/过渡：立即移除；
   * - 正在播出或正在过渡：只打 removing 标记（延迟移除），本次过渡继续
   *   按快照完成，过渡结束后由渲染循环调用 flushRemovals 真正移除，
   *   全程 current 快照都在，不会黑屏。
   * 始终保留至少一个可用场景。
   */
  function remove(id: string) {
    const scene = doc.scenes.find((s) => s.id === id);
    if (!scene || visibleScenes.value.length <= 1) return;
    const involved =
      id === playout.onAirId ||
      (playout.transitioning && playout.previous?.id === id);
    if (involved) {
      scene.removing = true;
      // 删除播出中的场景时，把预演焦点让给下一个可用场景，便于立刻接场。
      if (state.previewId === id)
        state.previewId =
          doc.scenes.find((s) => !s.removing && s.id !== id)?.id ??
          state.previewId;
    } else {
      removeNow(id);
    }
  }

  /** 过渡结束后清理延迟移除的场景；若删的是当前播出场景则无缝接到下一个。 */
  function flushRemovals(now: number) {
    settlePlayout(playout, now);
    if (playout.transitioning) return;
    const pending = doc.scenes.filter((s) => s.removing);
    for (const scene of pending) {
      if (scene.id === playout.onAirId) {
        const fallback = doc.scenes.find((s) => !s.removing);
        if (fallback && fallback.id !== playout.onAirId) {
          // 无缝切到下一场（过渡已结束，直接换快照，无黑场）。
          playout.current = snapshotOf(fallback);
          playout.onAirId = fallback.id;
          if (state.previewId === scene.id) state.previewId = fallback.id;
        }
      }
      removeNow(scene.id);
    }
  }

  function isOnAir(id: string) {
    return playout.onAirId === id;
  }

  return {
    playout,
    state,
    onAir,
    preview,
    transitioning,
    visibleScenes,
    previewSelect,
    take,
    takePreview,
    duplicate,
    move,
    remove,
    flushRemovals,
    isOnAir,
  };
}

export type SceneStore = ReturnType<typeof createScenes>;
