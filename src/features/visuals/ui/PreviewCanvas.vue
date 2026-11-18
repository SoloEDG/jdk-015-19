<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { Analysis, Scene } from "../../../shared/types";
import { createPreviewRenderer } from "../model/renderer";
const props = defineProps<{
  getScene: () => Scene;
  read: () => Analysis;
}>();
const canvas = ref<HTMLCanvasElement>();
let stop = () => {};
onMounted(() => {
  if (canvas.value)
    stop = createPreviewRenderer(canvas.value, props.getScene, props.read);
});
onUnmounted(() => stop());
</script>
<template>
  <canvas class="preview-canvas" ref="canvas" aria-label="场景编辑预览" />
</template>
