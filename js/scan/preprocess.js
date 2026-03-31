/**
 * PREPROCESS — Camera frame → binary image
 *
 * Steps:
 *   1. Convert RGB → grayscale (luminance formula)
 *   2. Adaptive threshold using local mean (5×5 window)
 *      Pixels darker than local mean − 10 are marked as foreground (1).
 *
 * Returns a Uint8Array of 0/1 values, same dimensions as input.
 */
export function preprocess(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h);

  // Step 1: Grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  // Step 2: Adaptive threshold (local mean, 5×5 neighbourhood)
  const out = new Uint8Array(w * h);
  const R = 2; // radius
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, count = 0;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) {
            sum += gray[ny * w + nx];
            count++;
          }
        }
      }
      out[y * w + x] = gray[y * w + x] < (sum / count) - 10 ? 1 : 0;
    }
  }

  return out;
}
