<script setup lang="ts">
import { computed } from "vue";
import { Copy, ChevronUp, ChevronDown, Trash2, Clapperboard } from "lucide-vue-next";
import type { StageDocument } from "../../../shared/types";
import type { SceneStore } from "../model/sceneStore";
import { catalog } from "../lib/catalog";
import { PreviewCanvas } from "../../visuals";
import type { AudioEngine } from "../../audio";

const props = defineProps<{
  doc: StageDocument;
  store: SceneStore;
  audio: AudioEngine;
}>();

const previewScene = computed(() => props.store.preview.value);
const canDelete = computed(() => props.store.visibleScenes.value.length > 1);
</script>
<template>
  <section class="panel scene-panel">
    <div class="panel-heading">
      <span>02 / SCENE DESK</span
      ><span>{{ doc.scenes.filter((s) => !s.removing).length }} SCENES</span>
    </div>

    <div class="preview-block">
      <div class="preview-head">
        <span class="preview-tag">EDIT PREVIEW</span>
        <span class="preview-name">{{ previewScene.name }}</span>
        <button
          class="take-button"
          :disabled="store.isOnAir(previewScene.id)"
          @click="store.takePreview()"
        >
          <Clapperboard :size="12" />
          {{ store.isOnAir(previewScene.id) ? "正在播出" : "正式切场" }}
        </button>
      </div>
      <PreviewCanvas
        :get-scene="() => previewScene"
        :read="() => audio.frame.value"
      />
      <small class="preview-hint">预演改动仅作用于此预览，切场后才影响舞台与录制。</small>
    </div>

    <div class="scene-list">
      <template v-for="(s, i) in doc.scenes" :key="s.id">
        <div
          v-if="!s.removing"
          class="scene-row"
          :class="{
            active: store.state.previewId === s.id,
            onair: store.isOnAir(s.id),
          }"
          @click="store.previewSelect(s.id)"
        >          <div class="scene-thumb" :class="s.kind">
            {{ catalog.find((c) => c.kind === s.kind)?.icon }}
          </div>
          <div class="scene-meta">
            <strong>{{ s.name }}</strong>
            <small>{{
              catalog.find((c) => c.kind === s.kind)?.description
            }}</small>
            <i v-if="store.isOnAir(s.id)" class="live-badge">
              LIVE<em v-if="store.transitioning.value"> · 过渡中</em>
            </i>
          </div>
          <kbd>{{ i + 1 }}</kbd>
          <div class="scene-actions" @click.stop>
            <button
              aria-label="上移"
              :disabled="i === 0"
              @click="store.move(s.id, -1)"
            ><ChevronUp :size="13" /></button
            ><button
              aria-label="下移"
              :disabled="i === doc.scenes.length - 1"
              @click="store.move(s.id, 1)"
            ><ChevronDown :size="13" /></button
            ><button aria-label="复制场景" @click="store.duplicate(s.id)"
              ><Copy :size="12" /></button
            ><button
              class="danger-icon"
              aria-label="删除场景"
              :disabled="!canDelete"
              @click="store.remove(s.id)"
              ><Trash2 :size="12"
            /></button>
          </div>
        </div>
        <div v-else class="scene-row pending">
          <div class="scene-thumb" :class="s.kind">
            {{ catalog.find((c) => c.kind === s.kind)?.icon }}
          </div>
          <div class="scene-meta">
            <strong>{{ s.name }}</strong>
            <small class="pending-note">
              延迟移除：本次过渡结束后下线，期间舞台不会黑屏
            </small>
          </div>
          <i class="pending-badge">待移除</i>
        </div>
      </template>
    </div>

    <label class="control"
      >场景过渡 <b>{{ doc.transition.toFixed(1) }}s</b
      ><input
        type="range"
        min="0"
        max="4"
        step="0.1"
        v-model.number="doc.transition"
    /></label>
  </section>
</template>
