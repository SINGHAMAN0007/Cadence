// Samples 2 dominant accent colors from an image data URL via an off-screen canvas
// to power Apple Music's dynamic blurred background aura.

export interface GradientAura {
  primary: string;
  secondary: string;
}

const DEFAULT_AURA: GradientAura = {
  primary: 'rgba(239, 68, 68, 0.22)', // Apple Music signature crimson/red
  secondary: 'rgba(139, 92, 246, 0.18)', // Soft violet
};

export function extractAuraFromImage(imageSrc?: string): Promise<GradientAura> {
  if (!imageSrc) {
    return Promise.resolve(DEFAULT_AURA);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(DEFAULT_AURA);
          return;
        }

        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        // Sample upper left and lower right quadrants
        let r1 = 0, g1 = 0, b1 = 0, count1 = 0;
        let r2 = 0, g2 = 0, b2 = 0, count2 = 0;

        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            const idx = (y * 16 + x) * 4;
            r1 += data[idx];
            g1 += data[idx + 1];
            b1 += data[idx + 2];
            count1++;
          }
        }

        for (let y = 8; y < 16; y++) {
          for (let x = 8; x < 16; x++) {
            const idx = (y * 16 + x) * 4;
            r2 += data[idx];
            g2 += data[idx + 1];
            b2 += data[idx + 2];
            count2++;
          }
        }

        const avgR1 = Math.round(r1 / count1);
        const avgG1 = Math.round(g1 / count1);
        const avgB1 = Math.round(b1 / count1);

        const avgR2 = Math.round(r2 / count2);
        const avgG2 = Math.round(g2 / count2);
        const avgB2 = Math.round(b2 / count2);

        // Boost saturation slightly if colors are too dark or washed out
        const primary = `rgba(${Math.max(50, avgR1)}, ${Math.max(40, avgG1)}, ${Math.max(60, avgB1)}, 0.28)`;
        const secondary = `rgba(${Math.max(40, avgR2)}, ${Math.max(30, avgG2)}, ${Math.max(70, avgB2)}, 0.22)`;

        resolve({ primary, secondary });
      } catch {
        resolve(DEFAULT_AURA);
      }
    };

    img.onerror = () => {
      resolve(DEFAULT_AURA);
    };

    img.src = imageSrc;
  });
}
