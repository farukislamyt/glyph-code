const shapes = ["circle", "square", "triangle", "diamond"];

// TAB
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(tab).classList.add("active");
}

// STRING → BITS
function toBits(str) {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(2).padStart(8, "0"))
    .join("");
}

// BITS → STRING
function fromBits(bits) {
  let chars = [];
  for (let i = 0; i < bits.length; i += 8) {
    chars.push(parseInt(bits.substr(i, 8), 2));
  }
  return new TextDecoder().decode(new Uint8Array(chars));
}

// DRAW SHAPES
function drawShape(ctx, type, x, y, size) {
  ctx.fillStyle = "black";

  if (type === "circle") {
    ctx.beginPath();
    ctx.arc(x+15, y+15, 10, 0, Math.PI*2);
    ctx.fill();
  }

  if (type === "square") {
    ctx.fillRect(x+5, y+5, 20, 20);
  }

  if (type === "triangle") {
    ctx.beginPath();
    ctx.moveTo(x+15, y+5);
    ctx.lineTo(x+5, y+25);
    ctx.lineTo(x+25, y+25);
    ctx.fill();
  }

  if (type === "diamond") {
    ctx.beginPath();
    ctx.moveTo(x+15, y+5);
    ctx.lineTo(x+25, y+15);
    ctx.lineTo(x+15, y+25);
    ctx.lineTo(x+5, y+15);
    ctx.fill();
  }
}

// ENCODE
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

    drawShape(ctx, shapes[index], x, y, cell);
  }
}

// LOAD IMAGE
function decodeImage() {
  const file = document.getElementById("upload").files[0];
  const img = new Image();

  img.onload = () => {
    const canvas = document.getElementById("decodeCanvas");
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0, 300, 300);

    const bits = readShapes(ctx);
    const text = fromBits(bits);

    document.getElementById("output").innerText = text;
  };

  img.src = URL.createObjectURL(file);
}

// SIMPLE SHAPE DETECTION (prototype)
function readShapes(ctx) {
  const cell = 30;
  let bits = "";

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {

      const px = x * cell + 15;
      const py = y * cell + 15;

      const pixel = ctx.getImageData(px, py, 1, 1).data;

      // crude detection (based on darkness)
      const brightness = pixel[0] + pixel[1] + pixel[2];

      let val = brightness < 200 ? 1 : 0;

      // fallback simple mapping
      bits += val ? "01" : "00";
    }
  }

  return bits;
}