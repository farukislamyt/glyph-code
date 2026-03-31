import { encodeDataHybrid } from "./core/encoder.js";
import { renderFrame } from "./render/renderer.js";
import { startCamera } from "./scan/camera.js";
import { startScanner } from "./scan/scanner.js";

const canvas = document.getElementById("canvas");
const video = document.getElementById("video");

startCamera(video);
video.onloadedmetadata = () => startScanner(video);

document.getElementById("generate").onclick = () => {
  const result = encodeDataHybrid(document.getElementById("data").value);

  let i = 0;
  if (result.mode === "single") {
    renderFrame(result.frames[0], canvas);
  } else {
    setInterval(() => {
      renderFrame(result.frames[i % result.frames.length], canvas);
      i++;
    }, 800);
  }
};