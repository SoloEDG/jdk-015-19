<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import type { StageDocument, Analysis } from "../../../shared/types";
import type { Playout } from "../../../shared/playout";
import { createRenderer } from "../model/renderer";
const props = defineProps<{
  doc: StageDocument;
  playout: Playout;
  read: () => Analysis;
  onFrame?: (now: number) => void;
}>();
const emit = defineEmits<{ ready: [HTMLCanvasElement] }>();
const canvas = ref<HTMLCanvasElement>();
let stop = () => {};
onMounted(() => {
  if (canvas.value) {
    stop = createRenderer(
      canvas.value,
      props.doc,
      props.playout,
      props.read,
      props.onFrame,
    );
    emit("ready", canvas.value);
  }
});
onUnmounted(() => stop());
</script>
<template><canvas ref="canvas" aria-label="音乐可视化舞台" /></template>
