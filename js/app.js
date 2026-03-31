import { encodeDataMulti } from './core/encoder.js';
import { renderFrame } from './render/renderer.js';
import { startCamera, stopCamera } from './scan/camera.js';
import { startScanner } from './scan/scanner.js';
import { runEngine } from './scan/engine.js';
import { decodeFrame, assembleFrames } from './core/decoder.js';

const STORAGE_KEYS = {
  draft: 'glyphcode-draft',
  history: 'glyphcode-history',
};

const MAX_HISTORY = 6;
const SAMPLE_TEXT = `GlyphCode demo ✨\n\nEncode text into animated glyph frames, then scan it back with a camera or uploaded screenshots.`;

// ── Tab navigation ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
  });
});

// ── ENCODE DOM ──────────────────────────────────────────────────────────────
const inputText        = document.getElementById('input-text');
const charCount        = document.getElementById('char-count');
const byteCount        = document.getElementById('byte-count');
const frameCountEl     = document.getElementById('frame-count');
const bitCountEl       = document.getElementById('bit-count');
const capacityNote     = document.getElementById('capacity-note');
const btnGenerate      = document.getElementById('btn-generate');
const btnSample        = document.getElementById('btn-sample');
const btnClearInput    = document.getElementById('btn-clear-input');
const canvas           = document.getElementById('canvas');
const placeholder      = document.getElementById('canvas-placeholder');
const frameIndicator   = document.getElementById('frame-indicator');
const frameSummary     = document.getElementById('frame-summary');
const frameControls    = document.getElementById('frame-controls');
const frameSequence    = document.getElementById('frame-sequence');
const speedSlider      = document.getElementById('speed-slider');
const speedLabel       = document.getElementById('speed-label');
const playbackLabel    = document.getElementById('playback-label');
const playbackFps      = document.getElementById('playback-fps');
const btnDownload      = document.getElementById('btn-download');
const btnDownloadSheet = document.getElementById('btn-download-sheet');
const btnPrevFrame     = document.getElementById('btn-prev-frame');
const btnNextFrame     = document.getElementById('btn-next-frame');
const btnPlayPause     = document.getElementById('btn-play-pause');
const btnFullscreen    = document.getElementById('btn-fullscreen');

// ── DECODE DOM ──────────────────────────────────────────────────────────────
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
const btnClearHistory = document.getElementById('btn-clear-history');
const historyList   = document.getElementById('history-list');
const decodeMeta    = document.getElementById('decode-meta');
const scanLine      = document.querySelector('.scan-line');
const uploadZone    = document.getElementById('upload-zone');
const uploadInput   = document.getElementById('file-input');
const btnUpload     = document.getElementById('btn-upload');
const uploadMeta    = document.getElementById('upload-meta');

// ── Fullscreen DOM ──────────────────────────────────────────────────────────
const fullscreenView     = document.getElementById('fullscreen-view');
const fullscreenCanvas   = document.getElementById('fullscreen-canvas');
const fullscreenCaption  = document.getElementById('fullscreen-caption');
const btnCloseFullscreen = document.getElementById('btn-close-fullscreen');
const btnFullscreenPrev  = document.getElementById('btn-fullscreen-prev');
const btnFullscreenNext  = document.getElementById('btn-fullscreen-next');
const btnFullscreenPlay  = document.getElementById('btn-fullscreen-play');

// ── State ───────────────────────────────────────────────────────────────────
let animInterval = null;
let currentFrames = [];
let currentFrameIdx = 0;
let frameDelay = 800;
let livePreviewTimer = null;
let cameraStream = null;
let scanner = null;
let history = loadHistory();

const uploadCanvas = document.createElement('canvas');
uploadCanvas.width = 480;
uploadCanvas.height = 480;
const uploadCtx = uploadCanvas.getContext('2d', { willReadFrequently: true });

// ── Helpers ─────────────────────────────────────────────────────────────────
function getUtf8Bytes(text) {
  return new TextEncoder().encode(text).length;
}

function formatCount(value, singular, plural = singular + 's') {
  return `${value} ${value === 1 ? singular : plural}`;
}

function setStatus(state, text) {
  statusDot.className = 'status-dot ' + (state || '');
  statusText.textContent = text;
}

function showProgress(received, total, labelText = '') {
  progressWrap.style.display = 'flex';
  const pct = total ? (received / total) * 100 : 0;
  progressFill.style.width = pct + '%';
  progressLabel.textContent = total ? `${received} / ${total} ${total === 1 ? 'frame' : 'frames'}` : labelText || `${received} frame${received === 1 ? '' : 's'}`;
}

function resetProgress() {
  progressFill.style.width = '0%';
  progressLabel.textContent = '0 / 0 frames';
}

function hasOutputContent() {
  return !outputBox.querySelector('.output-placeholder') && outputBox.textContent.trim().length > 0;
}

function saveDraft(text) {
  localStorage.setItem(STORAGE_KEYS.draft, text);
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory() {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function addHistory(text, source) {
  if (!text?.trim()) return;
  history = [
    { text, source, at: new Date().toISOString() },
    ...history.filter(item => item.text !== text),
  ].slice(0, MAX_HISTORY);
  persistHistory();
  renderHistory();
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<div class="history-empty">Decoded messages will appear here. History is saved locally in this browser.</div>';
    return;
  }

  historyList.innerHTML = history.map((item, index) => `
    <div class="history-item">
      <div class="history-meta">
        <span>${escapeHtml(item.source || 'Decode')}</span>
        <span>${new Date(item.at).toLocaleString()}</span>
      </div>
      <div class="history-text">${escapeHtml(item.text)}</div>
      <div class="history-actions">
        <button class="btn-secondary history-load" data-index="${index}" type="button">Load</button>
        <button class="btn-secondary history-copy" data-index="${index}" type="button">Copy</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function updateInputMetrics(text) {
  const chars = [...text].length;
  const bytes = getUtf8Bytes(text);
  const bits = bytes * 8;

  charCount.textContent = String(chars);
  byteCount.textContent = String(bytes);
  bitCountEl.textContent = String(bits);

  if (!text.length) {
    frameCountEl.textContent = '—';
    capacityNote.textContent = 'Enter text to generate GlyphCode frames.';
    return;
  }

  const frames = encodeDataMulti(text);
  frameCountEl.textContent = String(frames.length);
  capacityNote.textContent = frames.length === 1
    ? 'Fits in a single frame. Great for screenshots and quick scans.'
    : `Needs ${frames.length} frames. Use playback or upload the full sequence to decode.`;
}

function stopAnimation({ updateButtons = true } = {}) {
  if (animInterval) clearInterval(animInterval);
  animInterval = null;

  if (!updateButtons) return;

  if (currentFrames.length <= 1) {
    playbackLabel.textContent = 'Static frame';
    btnPlayPause.textContent = '• Static';
    btnFullscreenPlay.textContent = '• Static';
  } else {
    playbackLabel.textContent = 'Paused';
    btnPlayPause.textContent = '▶ Play';
    btnFullscreenPlay.textContent = '▶ Play';
  }
}

function startAnimation() {
  if (currentFrames.length <= 1) {
    stopAnimation();
    return;
  }

  stopAnimation({ updateButtons: false });
  animInterval = setInterval(() => {
    currentFrameIdx = (currentFrameIdx + 1) % currentFrames.length;
    renderCurrentFrame();
  }, frameDelay);

  playbackLabel.textContent = 'Playing';
  btnPlayPause.textContent = '❚❚ Pause';
  btnFullscreenPlay.textContent = '❚❚ Pause';
}

function renderFrameSequence() {
  frameSequence.innerHTML = '';

  currentFrames.forEach((_, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'frame-chip' + (index === currentFrameIdx ? ' active' : '');
    btn.textContent = `Frame ${index + 1}`;
    btn.addEventListener('click', () => {
      currentFrameIdx = index;
      renderCurrentFrame();
      stopAnimation();
    });
    frameSequence.appendChild(btn);
  });
}

function renderCurrentFrame() {
  if (!currentFrames.length) return;

  renderFrame(currentFrames[currentFrameIdx], canvas);
  renderFrame(currentFrames[currentFrameIdx], fullscreenCanvas);

  frameIndicator.textContent = `${currentFrameIdx + 1} / ${currentFrames.length}`;
  frameSummary.textContent = `${formatCount(currentFrames.length, 'frame')} · ${formatCount(currentFrames[currentFrameIdx].length, 'bit')}`;
  fullscreenCaption.textContent = `Frame ${currentFrameIdx + 1} of ${currentFrames.length}`;

  Array.from(frameSequence.children).forEach((child, index) => {
    child.classList.toggle('active', index === currentFrameIdx);
  });
}

function resetGeneratedFrames() {
  stopAnimation({ updateButtons: false });
  currentFrames = [];
  currentFrameIdx = 0;
  placeholder.style.display = 'flex';
  frameControls.style.display = 'none';
  frameSequence.innerHTML = '';
  frameIndicator.textContent = '—';
  frameSummary.textContent = 'No frames yet';
  playbackLabel.textContent = 'Idle';
}

function generateFromInput({ autoplay = true } = {}) {
  const text = inputText.value;

  if (!text.length) {
    resetGeneratedFrames();
    return;
  }

  currentFrames = encodeDataMulti(text);
  currentFrameIdx = Math.min(currentFrameIdx, currentFrames.length - 1);

  placeholder.style.display = 'none';
  frameControls.style.display = 'flex';
  playbackFps.textContent = `${frameDelay}ms / frame`;
  speedLabel.textContent = `${frameDelay}ms`;

  renderFrameSequence();
  renderCurrentFrame();

  if (autoplay && currentFrames.length > 1) {
    startAnimation();
  } else {
    stopAnimation();
  }
}

function schedulePreview() {
  clearTimeout(livePreviewTimer);
  livePreviewTimer = setTimeout(() => generateFromInput({ autoplay: false }), 180);
}

function showDecodedText(text, source = 'Decode') {
  outputBox.textContent = text;
  outputBox.classList.add('has-content');
  outputActions.style.display = 'flex';
  decodeMeta.textContent = `${source} • ${new Date().toLocaleTimeString()}`;
  addHistory(text, source);

  setTimeout(() => {
    outputBox.classList.remove('has-content');
  }, 600);
}

function clearOutput() {
  outputBox.innerHTML = '<div class="output-placeholder">Decoded text will appear here…</div>';
  outputActions.style.display = 'none';
  decodeMeta.textContent = 'Awaiting scan';

  if (cameraStream) {
    setStatus('scanning', 'Scanning — point at a GlyphCode');
  } else {
    setStatus('', 'Point camera at a GlyphCode or upload saved frames below');
  }

  resetProgress();
  if (scanner) scanner.reset();
}

function downloadCanvas(canvasEl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvasEl.toDataURL('image/png');
  link.click();
}

function buildContactSheet() {
  if (!currentFrames.length) return null;

  const columns = Math.min(3, currentFrames.length);
  const rows = Math.ceil(currentFrames.length / columns);
  const tileSize = 320;
  const padding = 28;
  const header = 56;
  const sheet = document.createElement('canvas');
  sheet.width = columns * tileSize + padding * (columns + 1);
  sheet.height = rows * tileSize + padding * (rows + 1) + header;

  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, sheet.width, sheet.height);

  ctx.fillStyle = '#e8e8f0';
  ctx.font = '700 20px Space Mono';
  ctx.fillText('GlyphCode Contact Sheet', padding, 34);
  ctx.fillStyle = '#8b8ba7';
  ctx.font = '12px Space Mono';
  ctx.fillText(`${currentFrames.length} frame${currentFrames.length === 1 ? '' : 's'}`, padding, 52);

  const temp = document.createElement('canvas');
  temp.width = tileSize;
  temp.height = tileSize;

  currentFrames.forEach((frame, index) => {
    renderFrame(frame, temp);
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = padding + col * (tileSize + padding);
    const y = header + padding + row * (tileSize + padding);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, tileSize, tileSize);
    ctx.drawImage(temp, x, y, tileSize, tileSize);

    ctx.fillStyle = '#8b8ba7';
    ctx.font = '11px Space Mono';
    ctx.fillText(`Frame ${index + 1}`, x, y - 8);
  });

  return sheet;
}

function openFullscreen() {
  if (!currentFrames.length) return;
  fullscreenView.classList.add('active');
  fullscreenView.setAttribute('aria-hidden', 'false');
  renderCurrentFrame();
}

function closeFullscreen() {
  fullscreenView.classList.remove('active');
  fullscreenView.setAttribute('aria-hidden', 'true');
}

async function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = err => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

async function extractFrameFromImage(file) {
  const img = await loadImageFromFile(file);
  const size = uploadCanvas.width;
  const scale = Math.min(size / img.width, size / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const dx = (size - drawWidth) / 2;
  const dy = (size - drawHeight) / 2;

  uploadCtx.fillStyle = '#fff';
  uploadCtx.fillRect(0, 0, size, size);
  uploadCtx.drawImage(img, dx, dy, drawWidth, drawHeight);

  const rawBits = runEngine(uploadCtx, size, size);
  if (!rawBits) return null;

  return decodeFrame(rawBits);
}

async function decodeImageFiles(files, source = 'Upload') {
  if (!files.length) return;

  setStatus('scanning', `Analyzing ${files.length} image${files.length === 1 ? '' : 's'}…`);
  uploadMeta.textContent = `${files.length} file${files.length === 1 ? '' : 's'} selected`;
  progressWrap.style.display = 'flex';

  const frameMap = {};
  let totalFrames = null;
  let decodedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const frame = await extractFrameFromImage(file);

      if (frame?.checksumOk) {
        frameMap[frame.id] = frame.payload;
        totalFrames ??= frame.total;
        decodedCount = Object.keys(frameMap).length;
        showProgress(decodedCount, totalFrames || files.length);
        setStatus('scanning', `Accepted frame ${frame.id + 1} from ${file.name}`);
      }
    } catch {
      // ignore single-file errors and continue
    }
  }

  if (totalFrames && Object.keys(frameMap).length >= totalFrames) {
    const text = assembleFrames(frameMap, totalFrames);
    showDecodedText(text, source);
    setStatus('success', `Decoded successfully from ${files.length} uploaded image${files.length === 1 ? '' : 's'}`);
    showProgress(totalFrames, totalFrames);
  } else if (decodedCount > 0) {
    decodeMeta.textContent = `${source} • partial sequence`;
    setStatus('error', `Decoded ${decodedCount} frame${decodedCount === 1 ? '' : 's'}, but more are needed to reconstruct the message`);
    progressLabel.textContent = totalFrames
      ? `${decodedCount} / ${totalFrames} frames`
      : `${decodedCount} frame${decodedCount === 1 ? '' : 's'} found`;
  } else {
    setStatus('error', 'No valid GlyphCode frame found in the uploaded image(s)');
    progressLabel.textContent = '0 valid frames';
  }

  uploadInput.value = '';
}

// ── Encode events ───────────────────────────────────────────────────────────
inputText.addEventListener('input', () => {
  const text = inputText.value;
  updateInputMetrics(text);
  saveDraft(text);
  schedulePreview();
});

btnGenerate.addEventListener('click', () => generateFromInput({ autoplay: true }));

btnSample.addEventListener('click', () => {
  inputText.value = SAMPLE_TEXT;
  updateInputMetrics(SAMPLE_TEXT);
  saveDraft(SAMPLE_TEXT);
  generateFromInput({ autoplay: true });
});

btnClearInput.addEventListener('click', () => {
  inputText.value = '';
  updateInputMetrics('');
  saveDraft('');
  resetGeneratedFrames();
});

speedSlider.addEventListener('input', () => {
  frameDelay = +speedSlider.value;
  speedLabel.textContent = `${frameDelay}ms`;
  playbackFps.textContent = `${frameDelay}ms / frame`;
  if (animInterval) startAnimation();
});

btnPrevFrame.addEventListener('click', () => {
  if (!currentFrames.length) return;
  currentFrameIdx = (currentFrameIdx - 1 + currentFrames.length) % currentFrames.length;
  renderCurrentFrame();
  stopAnimation();
});

btnNextFrame.addEventListener('click', () => {
  if (!currentFrames.length) return;
  currentFrameIdx = (currentFrameIdx + 1) % currentFrames.length;
  renderCurrentFrame();
  stopAnimation();
});

btnPlayPause.addEventListener('click', () => {
  if (!currentFrames.length || currentFrames.length === 1) return;
  if (animInterval) stopAnimation();
  else startAnimation();
});

btnFullscreen.addEventListener('click', openFullscreen);
btnCloseFullscreen.addEventListener('click', closeFullscreen);
btnFullscreenPrev.addEventListener('click', () => btnPrevFrame.click());
btnFullscreenNext.addEventListener('click', () => btnNextFrame.click());
btnFullscreenPlay.addEventListener('click', () => btnPlayPause.click());

btnDownload.addEventListener('click', () => {
  if (!currentFrames.length) return;
  downloadCanvas(canvas, `glyphcode-frame-${currentFrameIdx + 1}.png`);
});

btnDownloadSheet.addEventListener('click', () => {
  const sheet = buildContactSheet();
  if (!sheet) return;
  downloadCanvas(sheet, 'glyphcode-contact-sheet.png');
});

// ── Decode events ───────────────────────────────────────────────────────────
function attachScanner() {
  if (scanner) scanner.stop();

  scanner = startScanner(video, {
    onProgress(received, total) {
      showProgress(received, total);
      setStatus('scanning', `Received frame ${received} of ${total}…`);
    },
    onResult(text) {
      showDecodedText(text, 'Camera scan');
      setStatus('success', 'Decoded successfully!');
      showProgress(1, 1);
    },
    onError(msg) {
      setStatus('scanning', msg);
    },
  });
}

btnStartCam.addEventListener('click', async () => {
  setStatus('', 'Requesting camera…');
  cameraStream = await startCamera(video);

  if (!cameraStream) {
    setStatus('error', 'Camera unavailable — check permissions');
    return;
  }

  btnStartCam.style.display = 'none';
  btnStopCam.style.display = 'block';
  scanLine.classList.add('active');
  progressWrap.style.display = 'flex';
  resetProgress();
  setStatus('scanning', 'Scanning — point at a GlyphCode');

  if (video.readyState >= 1) attachScanner();
  else video.addEventListener('loadedmetadata', attachScanner, { once: true });
});

btnStopCam.addEventListener('click', () => {
  if (scanner) {
    scanner.stop();
    scanner = null;
  }

  stopCamera(cameraStream);
  cameraStream = null;
  btnStartCam.style.display = 'inline-flex';
  btnStopCam.style.display = 'none';
  scanLine.classList.remove('active');
  setStatus('', 'Camera stopped — you can still decode from uploaded images');
  resetProgress();
});

btnUpload.addEventListener('click', (event) => {
  event.stopPropagation();
  uploadInput.click();
});

uploadZone.addEventListener('click', () => uploadInput.click());
uploadZone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    uploadInput.click();
  }
});

uploadInput.addEventListener('change', async () => {
  const files = Array.from(uploadInput.files || []);
  await decodeImageFiles(files, 'Uploaded image');
});

['dragenter', 'dragover'].forEach(type => {
  uploadZone.addEventListener(type, event => {
    event.preventDefault();
    uploadZone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach(type => {
  uploadZone.addEventListener(type, event => {
    event.preventDefault();
    uploadZone.classList.remove('dragover');
  });
});

uploadZone.addEventListener('drop', async event => {
  const files = Array.from(event.dataTransfer?.files || []).filter(file => file.type.startsWith('image/'));
  await decodeImageFiles(files, 'Dropped image');
});

document.addEventListener('paste', async event => {
  const items = Array.from(event.clipboardData?.items || []);
  const imageFiles = items
    .filter(item => item.type.startsWith('image/'))
    .map(item => item.getAsFile())
    .filter(Boolean);

  if (imageFiles.length) {
    await decodeImageFiles(imageFiles, 'Clipboard image');
  }
});

btnCopy.addEventListener('click', async () => {
  if (!hasOutputContent()) return;
  await navigator.clipboard.writeText(outputBox.textContent).catch(() => {});
  btnCopy.textContent = '✓ Copied';
  setTimeout(() => { btnCopy.textContent = '⧉ Copy'; }, 1500);
});

btnClearOut.addEventListener('click', clearOutput);

btnClearHistory.addEventListener('click', () => {
  history = [];
  persistHistory();
  renderHistory();
});

historyList.addEventListener('click', async event => {
  const loadButton = event.target.closest('.history-load');
  const copyButton = event.target.closest('.history-copy');

  if (loadButton) {
    const item = history[Number(loadButton.dataset.index)];
    if (!item) return;
    showDecodedText(item.text, item.source || 'History');
  }

  if (copyButton) {
    const item = history[Number(copyButton.dataset.index)];
    if (!item) return;
    await navigator.clipboard.writeText(item.text).catch(() => {});
    copyButton.textContent = '✓ Copied';
    setTimeout(() => { copyButton.textContent = 'Copy'; }, 1200);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeFullscreen();
});

// ── Initial boot ────────────────────────────────────────────────────────────
renderHistory();
clearOutput();

const savedDraft = localStorage.getItem(STORAGE_KEYS.draft) || '';
if (savedDraft) {
  inputText.value = savedDraft;
}
updateInputMetrics(inputText.value);
if (inputText.value) {
  generateFromInput({ autoplay: false });
}
