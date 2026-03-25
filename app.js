// TAB SWITCH
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));

  document.getElementById(tab).classList.add("active");
  document.getElementById("btn-" + tab).classList.add("active");
}

// ENCODING (same as before)
function toBits(str) {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(2).padStart(8, "0"))
    .join("");
}

function generate() {
  const data = document.getElementById("data").value;
  const bits = toBits(data);

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 300, 300);

  const cell = 30;

  for (let i = 0; i < bits.length; i += 2) {
    const chunk = bits.substr(i, 2);
    const index = parseInt(chunk, 2);

    const x = ((i/2) % 10) * cell;
    const y = Math.floor((i/2) / 10) * cell;

    drawShape(ctx, index, x, y);
  }
}

function drawShape(ctx, type, x, y) {
  ctx.fillStyle = "black";

  if (type === 0) {
    ctx.beginPath();
    ctx.arc(x+15, y+15, 10, 0, Math.PI*2);
    ctx.fill();
  }
  if (type === 1) ctx.fillRect(x+5, y+5, 20, 20);
  if (type === 2) {
    ctx.beginPath();
    ctx.moveTo(x+15,y+5);
    ctx.lineTo(x+5,y+25);
    ctx.lineTo(x+25,y+25);
    ctx.fill();
  }
  if (type === 3) {
    ctx.beginPath();
    ctx.moveTo(x+15,y+5);
    ctx.lineTo(x+25,y+15);
    ctx.lineTo(x+15,y+25);
    ctx.lineTo(x+5,y+15);
    ctx.fill();
  }
}

// CAMERA
let video = document.getElementById("video");

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
      requestAnimationFrame(scanFrame);
    });
}

function scanFrame() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = 300;
  canvas.height = 300;

  ctx.drawImage(video, 0, 0, 300, 300);

  try {
    let src = cv.imread(canvas);
    let result = "Scanning..."; // integrate full pipeline here

    document.getElementById("output").innerText = result;

    src.delete();
  } catch(e){}

  requestAnimationFrame(scanFrame);
}