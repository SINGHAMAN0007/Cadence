import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, getPixel) {
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = crc32(typeAndData);
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Point-in-triangle test with barycentric coordinates
function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
  const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);

  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

  return !(hasNeg && hasPos);
}

function renderIcon(size, isMaskable = false) {
  const cx = size / 2;
  const cy = size / 2;

  // YT Music Logo proportions:
  // Outer circle radius
  const rMax = isMaskable ? size * 0.40 : size * 0.45;
  // Outer ring inner boundary (thickness ~ 11% of outer radius)
  const rRingInner = rMax * (9.273 / 12.0);
  // Inner red disc radius (approx 59% of outer radius)
  const rDisc = rMax * (7.091 / 12.0);

  // Play triangle vertices inside inner disc
  // In standard YT Music logo, triangle is optically centered:
  const tX1 = cx - rDisc * 0.31;
  const tY1 = cy - rDisc * 0.54;
  const tX2 = cx + rDisc * 0.49;
  const tY2 = cy;
  const tX3 = cx - rDisc * 0.31;
  const tY3 = cy + rDisc * 0.54;

  return createPng(size, size, (x, y) => {
    // 2x2 supersampling for smooth antialiasing
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalA = 0;

    const samples = [
      [0.25, 0.25],
      [0.75, 0.25],
      [0.25, 0.75],
      [0.75, 0.75]
    ];

    for (const [ox, oy] of samples) {
      const px = x + ox;
      const py = y + oy;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= rMax && dist >= rRingInner) {
        // Red outer ring
        totalR += 255;
        totalG += 0;
        totalB += 0;
        totalA += 255;
      } else if (dist < rRingInner && dist > rDisc) {
        // Black gap
        totalR += 0;
        totalG += 0;
        totalB += 0;
        totalA += 255;
      } else if (dist <= rDisc) {
        // Inner disc
        if (pointInTriangle(px, py, tX1, tY1, tX2, tY2, tX3, tY3)) {
          // White play button
          totalR += 255;
          totalG += 255;
          totalB += 255;
          totalA += 255;
        } else {
          // Red disc background
          totalR += 255;
          totalG += 0;
          totalB += 0;
          totalA += 255;
        }
      } else {
        // Outer OLED True Black background
        totalR += 0;
        totalG += 0;
        totalB += 0;
        totalA += 255;
      }
    }

    return [
      Math.round(totalR / 4),
      Math.round(totalG / 4),
      Math.round(totalB / 4),
      Math.round(totalA / 4)
    ];
  });
}

console.log('Generating PNG icons...');
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), renderIcon(192));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), renderIcon(512));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), renderIcon(512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), renderIcon(180));

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="112" fill="#000000"/>
  <!-- Outer red ring -->
  <path d="M256 36 C134.5 36 36 134.5 36 256 C36 377.5 134.5 476 256 476 C377.5 476 476 377.5 476 256 C476 134.5 377.5 36 256 36 Z M256 86 C349.9 86 426 162.1 426 256 C426 349.9 349.9 426 256 426 C162.1 426 86 349.9 86 256 C86 162.1 162.1 86 256 86 Z" fill="#FF0000"/>
  <!-- Inner red disc -->
  <circle cx="256" cy="256" r="130" fill="#FF0000"/>
  <!-- Center white play triangle -->
  <path d="M216 186 C216 180.5 222 177 227 180 L320 250 C324.5 253 324.5 259 320 262 L227 332 C222 335 216 331.5 216 326 Z" fill="#FFFFFF"/>
</svg>`;
fs.writeFileSync(path.join(outDir, 'icon.svg'), svgContent);

console.log('Successfully generated YT Music-styled Cadence app icons in public/');
