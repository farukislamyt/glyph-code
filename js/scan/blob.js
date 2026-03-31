/**
 * BLOB — Connected component labelling (iterative DFS)
 *
 * Finds all connected regions of foreground pixels (value=1) in a
 * binary image. Returns an array of blobs, each blob being an array
 * of [x, y] pixel coordinates.
 *
 * Only blobs larger than MIN_BLOB_SIZE are returned to filter noise.
 */

const MIN_BLOB_SIZE = 50; // minimum pixels to be considered a real blob

export function findBlobs(bin, w, h) {
  const visited = new Uint8Array(bin.length);
  const blobs   = [];

  // Iterative DFS to avoid call-stack overflow on large images
  function dfs(startX, startY) {
    const pixels = [];
    const stack  = [[startX, startY]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
      const i = cy * w + cx;
      if (visited[i] || !bin[i]) continue;
      visited[i] = 1;
      pixels.push([cx, cy]);
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    return pixels;
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!visited[y * w + x] && bin[y * w + x]) {
        const pixels = dfs(x, y);
        if (pixels.length >= MIN_BLOB_SIZE) blobs.push(pixels);
      }
    }
  }

  return blobs;
}
