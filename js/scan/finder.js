/**
 * FINDER — Detect the 3 finder patterns from a list of blobs
 *
 * Finder patterns are the large bordered squares in 3 corners of the code.
 * They are the largest blobs with an approximately square bounding box.
 *
 * We score each blob by:
 *   1. Size (large = likely finder)
 *   2. Squareness (aspect ratio close to 1.0)
 *
 * Returns up to 3 finder centroids as { x, y }.
 */

export function detectFinders(blobs) {
  if (blobs.length === 0) return [];

  // Score each blob
  const scored = blobs.map(blob => {
    const xs = blob.map(p => p[0]);
    const ys = blob.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;
    const aspect = Math.min(bw, bh) / Math.max(bw, bh); // 0–1, 1=perfect square
    const score  = blob.length * aspect;  // large + square = high score
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return { score, x: cx, y: cy };
  });

  // Sort by score descending, take top 3
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map(({ x, y }) => ({ x, y }));
}
