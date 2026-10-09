import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, getPixel) {
  // width, height: number
  // getPixel: (x, y) => [r, g, b, a]
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

function renderIcon(size, isMaskable = false) {
  return createPng(size, size, (x, y) => {
    const cx = size / 2;
    const cy = size / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Deep modern dark background with purple radial gradient
    const t = Math.min(1, dist / (size * 0.7));
    const bgR = Math.round(15 + (1 - t) * 45);
    const bgG = Math.round(15 + (1 - t) * 15);
    const bgB = Math.round(25 + (1 - t) * 90);

    // Central circular badge
    const badgeRadius = isMaskable ? size * 0.38 : size * 0.42;
    if (dist <= badgeRadius) {
      // Glow boundary
      const innerT = dist / badgeRadius;
      const r = Math.round(139 + innerT * 40);
      const g = Math.round(92 - innerT * 30);
      const b = Math.round(246 - innerT * 20);

      // Simple music wave bars or headphone in center
      const iconScale = size / 512;
      const relX = (x - cx) / iconScale;
      const relY = (y - cy) / iconScale;

      // Draw music bars in the center
      const barWidth = 18;
      const bars = [
        { x: -50, h: 50 },
        { x: -25, h: 90 },
        { x: 0, h: 130 },
        { x: 25, h: 80 },
        { x: 50, h: 45 }
      ];

      for (const bar of bars) {
        if (Math.abs(relX - bar.x) <= barWidth / 2 && Math.abs(relY) <= bar.h / 2) {
          return [255, 255, 255, 255];
        }
      }

      return [r, g, b, 255];
    }

    return [bgR, bgG, bgB, 255];
  });
}

fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), renderIcon(192));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), renderIcon(512));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), renderIcon(512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), renderIcon(180));

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="108" fill="#09090b"/>
  <circle cx="256" cy="256" r="180" fill="url(#grad)"/>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#4f46e5"/>
    </linearGradient>
  </defs>
  <rect x="176" y="216" width="20" height="80" rx="10" fill="#ffffff"/>
  <rect x="216" y="176" width="20" height="160" rx="10" fill="#ffffff"/>
  <rect x="256" y="136" width="20" height="240" rx="10" fill="#ffffff"/>
  <rect x="296" y="186" width="20" height="140" rx="10" fill="#ffffff"/>
  <rect x="336" y="226" width="20" height="60" rx="10" fill="#ffffff"/>
</svg>`;
fs.writeFileSync(path.join(outDir, 'icon.svg'), svgContent);

console.log('Successfully generated PWA icon assets in public/');
