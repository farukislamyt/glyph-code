/**
 * CAMERA — Request camera access and stream to a <video> element
 *
 * Uses the rear-facing camera (facingMode: 'environment') on mobile,
 * falls back to any available camera on desktop.
 * Returns the MediaStream so the caller can stop tracks if needed.
 */
export async function startCamera(videoEl) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: 640, height: 480 }
    });
    videoEl.srcObject = stream;
    return stream;
  } catch (err) {
    console.warn('Camera unavailable:', err.message);
    return null;
  }
}

/** Stop all tracks on a stream (call to release camera) */
export function stopCamera(stream) {
  if (stream) stream.getTracks().forEach(t => t.stop());
}
