/**
 * SCANNER — Camera scan loop → decoded text
 *
 * Continuously captures video frames, runs the scan engine,
 * stabilises results, decodes individual frames, and reassembles
 * multi-frame messages when all frames have been received.
 *
 * Emits progress via onProgress(receivedCount, totalCount)
 * and delivers the final text via onResult(text).
 */

import { runEngine }              from './engine.js';
import { stabilize, resetStabilizer } from './stabilize.js';
import { decodeFrame, assembleFrames } from '../core/decoder.js';

export function startScanner(videoEl, { onResult, onProgress, onError } = {}) {
  const offscreen = document.createElement('canvas');
  offscreen.width  = 240;
  offscreen.height = 240;
  const ctx = offscreen.getContext('2d');

  let frameMap   = {};  // id → payload bits
  let totalFrames = null;
  let running    = true;
  let rafId      = null;

  function reset() {
    frameMap    = {};
    totalFrames = null;
    resetStabilizer();
  }

  function loop() {
    if (!running) return;

    // Draw current video frame to offscreen canvas
    ctx.drawImage(videoEl, 0, 0, 240, 240);

    // Run scan pipeline
    const rawBits = runEngine(ctx, 240, 240);
    const stable  = stabilize(rawBits);

    if (stable) {
      const frame = decodeFrame(stable);

      if (frame && frame.checksumOk) {
        // Accept this frame
        if (!(frame.id in frameMap)) {
          frameMap[frame.id] = frame.payload;
          if (totalFrames === null) totalFrames = frame.total;
          onProgress?.(Object.keys(frameMap).length, totalFrames);
        }

        // Check if we have all frames
        if (totalFrames !== null && Object.keys(frameMap).length >= totalFrames) {
          try {
            const text = assembleFrames(frameMap, totalFrames);
            onResult?.(text);
          } catch (e) {
            onError?.('Decode error: ' + e.message);
          }
          reset();
        }
      } else if (frame && !frame.checksumOk) {
        onError?.(`Frame ${frame.id} checksum failed — retrying`);
      }
    }

    rafId = requestAnimationFrame(loop);
  }

  loop();

  return {
    stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      reset();
    },
    reset,
  };
}
