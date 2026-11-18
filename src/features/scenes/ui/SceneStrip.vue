<script setup lang="ts">
import type { StageDocument } from "../../../shared/types";
import type { SceneStore } from "../model/sceneStore";
defineProps<{ doc: StageDocument; store: SceneStore }>();
</script>
<template>
  <div class="scene-strip">
    <span>QUICK CUES · 单击预演 / 双击切场</span
    ><button
      v-for="(s, i) in doc.scenes"
      v-show="!s.removing"
      :key="s.id"
      :class="{
        selected: store.state.previewId === s.id,
        onair: store.isOnAir(s.id),
      }"
      @click="store.previewSelect(s.id)"
      @dblclick="store.take(s.id)"
    >
      <b>{{ String(i + 1).padStart(2, "0") }}</b
      >{{ s.name }}<i v-if="store.isOnAir(s.id)">
        LIVE{{ store.transitioning.value ? " · 过渡" : "" }}</i
      >
    </button>
  </div>
</template>
