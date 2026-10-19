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

// Distance to rounded rectangle
function sdRoundedRect(px, py, rx, ry, rw, rh, radius) {
  // Center is rx + rw/2, ry + rh/2
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const dx = Math.abs(px - cx) - (rw / 2 - radius);
  const dy = Math.abs(py - cy) - (rh / 2 - radius);
  const outsideDist = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const insideDist = Math.min(Math.max(dx, dy), 0);
  return outsideDist + insideDist - radius;
}

// Check if point is inside rotated ellipse (notehead)
function insideNoteHead(px, py, cx, cy, rx, ry, angleRad) {
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);
  const dx = px - cx;
  const dy = py - cy;
  const nx = dx * cos - dy * sin;
  const ny = dx * sin + dy * cos;
  return (nx * nx) / (rx * rx) + (ny * ny) / (ry * ry) <= 1.0;
}

function renderAppleMusicIcon(size, isMaskable = false) {
  // Proportions in 0..size coordinates
  // Normalized 0..1 coordinates
  const margin = isMaskable ? 0.10 : 0.04;
  const cardSize = 1.0 - 2 * margin;
  const cornerRadius = cardSize * 0.225; // standard Apple iOS app icon continuous corner radius ratio

  // Gradient: top-left (#FF3B30 -> rgb(255, 59, 48)) to bottom-right (#FF2D55 -> rgb(255, 45, 85))
  // Double eighth note parameters mapped to normalized 0..1 space:
  // Note 1 (left):
  // center of note head ~ (0.34, 0.72), radius a=0.088, b=0.065, rotated ~ -20 deg (-0.35 rad)
  // left stem: x from 0.40 to 0.445, y from 0.31 to 0.72
  // Note 2 (right):
  // center of note head ~ (0.67, 0.64), radius a=0.088, b=0.065, rotated ~ -20 deg (-0.35 rad)
  // right stem: x from 0.73 to 0.775, y from 0.23 to 0.64
  // Beam: connects stems at top. Slanted beam from y ~ 0.20-0.31 on left to 0.12-0.23 on right

  return createPng(size, size, (x, y) => {
    // 2x2 supersampling
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
      const px = (x + ox) / size;
      const py = (y + oy) / size;

      let r = 0, g = 0, b = 0, a = 0;

      if (isMaskable) {
        // Full bleed background for maskable icon
        // Diagonal gradient
        const t = (px + py) / 2.0;
        const bgR = Math.round(255);
        const bgG = Math.round(59 + (45 - 59) * t);
        const bgB = Math.round(48 + (85 - 48) * t);
        r = bgR;
        g = bgG;
        b = bgB;
        a = 255;
      } else {
        // Rounded card
        const dist = sdRoundedRect(
          px, py,
          margin, margin,
          cardSize, cardSize,
          cornerRadius
        );

        if (dist <= 0) {
          // Inside card
          const t = Math.min(Math.max((px + py - 2 * margin) / (2 * cardSize), 0), 1);
          r = 255;
          g = Math.round(59 + (45 - 59) * t);
          b = Math.round(48 + (85 - 48) * t);
          a = 255;
        } else {
          // Transparent or black outside
          r = 0;
          g = 0;
          b = 0;
          a = 0;
        }
      }

      // If inside card / active icon area, check if inside white music note
      if (a > 0) {
        // Check music note glyph
        // Shift slightly if maskable to fit safely within inner 80% circle
        const scale = isMaskable ? 0.75 : 0.82;
        const nx = (px - 0.5) / scale + 0.5;
        const ny = (py - 0.5) / scale + 0.5;

        let inNote = false;

        // Left notehead
        if (insideNoteHead(nx, ny, 0.355, 0.71, 0.082, 0.058, -0.32)) {
          inNote = true;
        }
        // Right notehead
        if (insideNoteHead(nx, ny, 0.665, 0.635, 0.082, 0.058, -0.32)) {
          inNote = true;
        }

        // Left vertical stem: width ~ 0.045
        if (nx >= 0.405 && nx <= 0.450 && ny >= 0.30 && ny <= 0.71) {
          inNote = true;
        }

        // Right vertical stem: width ~ 0.045
        if (nx >= 0.715 && nx <= 0.760 && ny >= 0.22 && ny <= 0.635) {
          inNote = true;
        }

        // Top beam: connects the two stems with standard downward/upward slope
        // Between nx 0.405 and 0.760
        if (nx >= 0.405 && nx <= 0.760) {
          const u = (nx - 0.405) / (0.760 - 0.405);
          const topY = 0.26 - 0.08 * u;
          const beamThickness = 0.095;
          if (ny >= topY && ny <= topY + beamThickness) {
            inNote = true;
          }
        }

        if (inNote) {
          r = 255;
          g = 255;
          b = 255;
          a = 255;
        }
      }

      totalR += r;
      totalG += g;
      totalB += b;
      totalA += a;
    }

    return [
      Math.round(totalR / 4),
      Math.round(totalG / 4),
      Math.round(totalB / 4),
      Math.round(totalA / 4)
    ];
  });
}

console.log('Generating updated Apple Music style PNG icons...');
const pwa192 = renderAppleMusicIcon(192);
const pwa512 = renderAppleMusicIcon(512);
const pwaMaskable = renderAppleMusicIcon(512, true);
const appleTouch = renderAppleMusicIcon(180);

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), pwa192);
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), pwa512);
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), pwaMaskable);
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), appleTouch);
fs.writeFileSync(path.join(outDir, 'favicon.png'), renderAppleMusicIcon(64));
fs.writeFileSync(path.join(outDir, 'muslogo.png'), pwa512);

// Also generate SVG for icon.svg with rounded gradient and white double eighth note
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="appleMusicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF3B30" />
      <stop offset="100%" stop-color="#FF2D55" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#appleMusicGrad)" />
  <g transform="translate(102, 102) scale(12.8)">
    <path fill="#FFFFFF" d="M19.5 3.5 9.5 5.8C8.7 6 8 6.7 8 7.6V16.7C7.3 16.3 6.4 16 5.5 16 3.6 16 2 17.3 2 19s1.6 3 3.5 3 3.5-1.3 3.5-3V9.6l10-2.3v7.4c-.7-.4-1.6-.7-2.5-.7-1.9 0-3.5 1.3-3.5 3s1.6 3 3.5 3 3.5-1.3 3.5-3V4.5c0-.6-.5-1.1-1-.9z"/>
  </g>
</svg>
`;

fs.writeFileSync(path.join(outDir, 'icon.svg'), svgContent);

console.log('Successfully generated icons and saved to public/ !');
