import { reactive } from "vue";
import type { StageDocument } from "./types";

const defaultAudio = {
  gain: 0.65,
  sensitivity: 1.2,
  smoothing: 0.78,
};

export function createDocument(): StageDocument {
  return reactive({
    scenes: [
      {
        id: "s1",
        name: "Celestial orbit",
        kind: "orbit",
        theme: "violet",
        intensity: 0.8,
        speed: 1,
        audio: { ...defaultAudio },
      },
      {
        id: "s2",
        name: "Frequency field",
        kind: "spectrum",
        theme: "mint",
        intensity: 0.75,
        speed: 1,
        audio: { ...defaultAudio },
      },
      {
        id: "s3",
        name: "Liquid signal",
        kind: "wave",
        theme: "ember",
        intensity: 0.7,
        speed: 0.6,
        audio: { ...defaultAudio },
      },
      {
        id: "s4",
        name: "Into the void",
        kind: "tunnel",
        theme: "ice",
        intensity: 0.9,
        speed: 1.2,
        audio: { ...defaultAudio },
      },
    ],
    onAirId: "s1",
    transition: 1.2,
    blackout: false,
    frozen: false,
    strobe: false,
    master: 1,
  });
}
