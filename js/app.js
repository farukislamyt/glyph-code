/**
 * APP — GlyphCode main entry point
 *
 * Wires together:
 *   - Tab navigation
 *   - Encode: text → frames → canvas animation (with speed control + download)
 *   - Decode: camera → scanner → multi-frame reassembly → output
 */

import { encodeDataMulti } from './core/encoder.js';
import { renderFrame }     from './render/renderer.js';
import { startCamera, stopCamera } from './scan/camera.js';
import { startScanner }    from './scan/scanner.js';

// ── Tab navigation ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ── ENCODE ──────────────────────────────────────────────────────────────────
const inputText     = document.getElementById('input-text');
const charCount     = document.getElementById('char-count');
const frameCountEl  = document.getElementById('frame-count');
const btnGenerate   = document.getElementById('btn-generate');
const canvas        = document.getElementById('canvas');
const placeholder   = document.getElementById('canvas-placeholder');
const frameIndicator = document.getElementById('frame-indicator');
const frameControls = document.getElementById('frame-controls');
const speedSlider   = document.getElementById('speed-slider');
const speedLabel    = document.getElementById('speed-label');
const playbackLabel = document.getElementById('playback-label');
const btnDownload   = document.getElementById('btn-download');

let animInterval = null;
let currentFrames = [];
let currentFrameIdx = 0;
let frameDelay = 800;

// Update char/frame count on input
inputText.addEventListener('input', () => {
  const text = inputText.value;
  const charLen = [...text].length; // proper unicode char count
  charCount.textContent = `${charLen} char${charLen !== 1 ? 's' : ''}`;

  if (text.trim()) {
    const frames = encodeDataMulti(text);
    frameCountEl.textContent = `${frames.length} frame${frames.length !== 1 ? 's' : ''}`;
  } else {
    frameCountEl.textContent = '— frames';
  }
});

// Generate button
btnGenerate.addEventListener('click', () => {
  const text = inputText.value.trim();
  if (!text) return;

  // Stop existing animation
  if (animInterval) clearInterval(animInterval);

  currentFrames = encodeDataMulti(text);
  currentFrameIdx = 0;

  // Show canvas, hide placeholder
  placeholder.style.display = 'none';
  frameControls.style.display = 'flex';

  renderCurrentFrame();
  startAnimation();
});

function renderCurrentFrame() {
  if (!currentFrames.length) return;
  renderFrame(currentFrames[currentFrameIdx], canvas);
  frameIndicator.textContent =
    `${currentFrameIdx + 1} / ${currentFrames.length}`;
}

function startAnimation() {
  if (animInterval) clearInterval(animInterval);
  animInterval = setInterval(() => {
    currentFrameIdx = (currentFrameIdx + 1) % currentFrames.length;
    renderCurrentFrame();
  }, frameDelay);
  playbackLabel.textContent = 'Playing';
}

// Speed slider
speedSlider.addEventListener('input', () => {
  frameDelay = +speedSlider.value;
  speedLabel.textContent = `${frameDelay}ms`;
  if (animInterval) startAnimation(); // restart with new speed
});

// Download current frame
btnDownload.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `glyphcode-frame-${currentFrameIdx + 1}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// ── DECODE ──────────────────────────────────────────────────────────────────
const video         = document.getElementById('video');
const btnStartCam   = document.getElementById('btn-start-cam');
const btnStopCam    = document.getElementById('btn-stop-cam');
const statusDot     = document.getElementById('status-dot');
const statusText    = document.getElementById('scan-status-text');
const progressWrap  = document.getElementById('progress-wrap');
const progressFill  = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const outputBox     = document.getElementById('output-box');
const outputActions = document.getElementById('output-actions');
const btnCopy       = document.getElementById('btn-copy');
const btnClearOut   = document.getElementById('btn-clear-output');
const scanLine      = document.querySelector('.scan-line');

let cameraStream = null;
let scanner      = null;

function setStatus(state, text) {
  statusDot.className = 'status-dot ' + (state || '');
  statusText.textContent = text;
}

btnStartCam.addEventListener('click', async () => {
  setStatus('', 'Requesting camera…');
  cameraStream = await startCamera(video);

  if (!cameraStream) {
    setStatus('error', 'Camera unavailable — check permissions');
    return;
  }

  btnStartCam.style.display = 'none';
  btnStopCam.style.display  = 'block';
  scanLine.classList.add('active');
  setStatus('scanning', 'Scanning — point at a GlyphCode');
  progressWrap.style.display = 'flex';

  // Wait for video metadata before starting scanner
  video.addEventListener('loadedmetadata', () => {
    scanner = startScanner(video, {
      onProgress(received, total) {
        const pct = total ? (received / total) * 100 : 0;
        progressFill.style.width = pct + '%';
        progressLabel.textContent = `${received} / ${total} frame${total !== 1 ? 's' : ''}`;
        setStatus('scanning', `Received frame ${received} of ${total}…`);
      },
      onResult(text) {
        outputBox.textContent = text;
        outputBox.classList.add('has-content');
        outputActions.style.display = 'flex';
        setStatus('success', 'Decoded successfully!');
        progressFill.style.width = '100%';
        setTimeout(() => {
          outputBox.classList.remove('has-content');
        }, 600);
      },
      onError(msg) {
        setStatus('scanning', msg);
      },
    });
  }, { once: true });
});

btnStopCam.addEventListener('click', () => {
  if (scanner) { scanner.stop(); scanner = null; }
  stopCamera(cameraStream);
  cameraStream = null;
  btnStartCam.style.display = 'block';
  btnStopCam.style.display  = 'none';
  scanLine.classList.remove('active');
  progressWrap.style.display = 'none';
  progressFill.style.width = '0%';
  setStatus('', 'Camera stopped');
});

btnCopy.addEventListener('click', async () => {
  const text = outputBox.textContent;
  if (!text || outputBox.querySelector('.output-placeholder')) return;
  await navigator.clipboard.writeText(text).catch(() => {});
  btnCopy.textContent = '✓ Copied';
  setTimeout(() => { btnCopy.textContent = '⧉ Copy'; }, 1500);
});

btnClearOut.addEventListener('click', () => {
  outputBox.innerHTML = '<div class="output-placeholder">Decoded text will appear here…</div>';
  outputActions.style.display = 'none';
  setStatus('scanning', 'Scanning — point at a GlyphCode');
  progressFill.style.width = '0%';
  progressLabel.textContent = '0 / 0 frames';
  if (scanner) scanner.reset();
});
