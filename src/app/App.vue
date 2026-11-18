<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import {
  Maximize2,
  Radio,
  AudioLines,
  SlidersHorizontal,
  Disc3,
  ArrowUpRight,
} from "lucide-vue-next";
import { createDocument } from "../shared/document";
import { effectiveScene } from "../shared/playout";
import { createAudio, AudioPanel } from "../features/audio";
import { StageCanvas, ThemePanel } from "../features/visuals";
import { createScenes, ScenePanel, SceneStrip } from "../features/scenes";
import {
  createControls,
  bindShortcuts,
  LivePanel,
  SignalMeter,
} from "../features/live";
import { createRecorder, RecordPanel, TakeList } from "../features/recording";

const doc = createDocument(),
  scenes = createScenes(doc),
  audio = createAudio(doc, () => effectiveScene(doc.scenes, scenes.playout)?.audio),
  controls = createControls(doc),
  recorder = createRecorder();
const canvas = ref<HTMLCanvasElement>(),
  stage = ref<HTMLElement>();
const fullError = ref("");

const unbind = bindShortcuts({
  play: () => {
    void (audio.state.playing ? audio.pause() : audio.play());
  },
  // 数字键只改变预演选择（编辑预览），不直接动舞台。
  scene: (i) => {
    const target = scenes.visibleScenes.value[i];
    if (target) scenes.previewSelect(target.id);
  },
  // Enter 才正式切场。
  take: scenes.takePreview,
  blackout: controls.blackout,
  freeze: controls.freeze,
  tap: controls.tap,
});

function start() {
  if (canvas.value) recorder.start(canvas.value, audio.stream());
}
async function fullscreen() {
  try {
    await stage.value?.requestFullscreen();
  } catch {
    fullError.value = "当前浏览器不支持全屏";
  }
}
onUnmounted(() => {
  unbind();
  audio.dispose();
  recorder.dispose();
});
</script>
<template>
  <div class="workspace">
    <header>
      <a class="brand" href="./"
        ><AudioLines :size="25" /><span
          >RESONANCE<small>REALTIME VISUAL STUDIO</small></span
        ></a
      >
      <nav><a class="current">演出工作台</a><span>声音的另一种形状</span></nav>
      <div class="header-right">
        <span class="local-status"><i></i> LOCAL SESSION</span
        ><span class="version">v1.0</span>
      </div>
    </header>
    <div class="title-bar">
      <div>
        <div class="eyebrow">YOUR SOUND. IN MOTION.</div>
        <h1>让音乐，成为现场<span>。</span></h1>
        <p>从第一声节拍，到最后一束光。</p>
      </div>
      <div class="project-badge">
        <Disc3 :size="18" /><span
          >UNTITLED SESSION<small>实时音频驱动 / 720P</small></span
        >
      </div>
    </div>
    <main>
      <aside class="left-column">
        <AudioPanel :engine="audio" :scene="scenes.preview.value" /><ScenePanel
          :doc="doc"
          :store="scenes"
          :audio="audio"
        />
      </aside>
      <div class="center-column">
        <section class="stage-shell" ref="stage">
          <div class="stage-toolbar">
            <span
              ><i class="dot" :class="{ on: audio.state.playing }"></i>
              {{ audio.state.playing ? "LIVE OUTPUT" : "STAGE OUTPUT" }}</span
            ><span
              >{{ scenes.onAir.value.name }}
              <small v-if="scenes.transitioning.value" class="transition-flag"
                >过渡中</small
              >
              <button @click="fullscreen" aria-label="全屏预览">
                <Maximize2 :size="15" /></button
            ></span>
          </div>
          <div class="canvas-wrap">
            <StageCanvas
              :doc="doc"
              :playout="scenes.playout"
              :read="() => audio.frame.value"
              :on-frame="scenes.flushRemovals"
              @ready="canvas = $event"
            />
            <div class="stage-caption">
              <small
                >RESONANCE / 0{{
                  doc.scenes.findIndex((s) => s.id === scenes.onAir.value.id) +
                  1
                }}</small
              ><span>{{ scenes.onAir.value.name }}</span>
            </div>
            <span class="canvas-resolution">16:9 · 1280 × 720</span>
          </div>
          <SignalMeter :frame="audio.frame.value" />
        </section>
        <p v-if="fullError" role="alert">{{ fullError }}</p>
        <SceneStrip :doc="doc" :store="scenes" /><ThemePanel
          :scene="scenes.preview.value"
          :on-air="scenes.isOnAir(scenes.preview.value.id)"
        /><TakeList :recorder="recorder" />
      </div>
      <aside class="right-column">
        <LivePanel
          :doc="doc"
          :controls="controls"
          :beat="audio.frame.value.beat"
        /><RecordPanel :recorder="recorder" @start="start" />
        <div class="note">
          <Radio :size="19" />
          <p>
            预演与播出分离。<small
              >数字键或单击只改编辑预览，Enter / 双击正式切场。<br />紧急黑场 B
              仍直接作用于正式输出。</small
            >
          </p>
          <ArrowUpRight :size="17" />
        </div>
      </aside>
    </main>
    <footer>
      <span
        ><SlidersHorizontal :size="13" /> ALL SYSTEMS READY
        <i>·</i> 浏览器本地运行</span
      ><span
        >SPACE 播放 <i>·</i> 1–9 选择预演 <i>·</i> ENTER 正式切场 <i>·</i> B
        黑场 <i>·</i> F 冻结</span
      ><span>MADE FOR THE MOMENT ↗</span>
    </footer>
  </div>
</template>
