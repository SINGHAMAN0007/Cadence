import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  className?: string;
  accentColor?: string;
  mode?: string;
}

const BAR_COUNT = 36; // Symmetrical 36 rounded pill bars (18 mirrored pairs)

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isPlaying,
  className = 'w-full h-full',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const prevHeights = useRef<number[]>(new Array(BAR_COUNT).fill(4));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    const resizeCanvas = () => {
      dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
      }
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(canvas);

    // Enforce Web Audio analyser smoothing
    if (analyser) {
      try {
        analyser.smoothingTimeConstant = 0.8;
      } catch {
        // Ignore audio node parameter access error if closed
      }
    }

    let idlePhase = 0;
    const halfBars = BAR_COUNT / 2; // 18 bands

    const render = () => {
      animFrameId.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      const minBarHeight = 3.5 * dpr;
      const maxBarHeight = height * 0.94;

      // Extract Mel/Logarithmic frequency bands if playing & analyser available
      const bandEnergies: number[] = new Array(halfBars).fill(0);

      if (analyser && isPlaying) {
        // Enforce smoothing constant
        if (analyser.smoothingTimeConstant !== 0.8) {
          try {
            analyser.smoothingTimeConstant = 0.8;
          } catch {
            // ignore
          }
        }

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Map 18 bands logarithmically from bin ~1 to bin ~85% of buffer
        const minBin = 1;
        const maxBin = Math.max(minBin + 2, Math.floor(bufferLength * 0.85));

        for (let b = 0; b < halfBars; b++) {
          const norm = b / (halfBars - 1);
          const nextNorm = (b + 1) / (halfBars - 1);

          const startBin = Math.floor(minBin * Math.pow(maxBin / minBin, norm));
          const endBin = Math.max(startBin + 1, Math.floor(minBin * Math.pow(maxBin / minBin, nextNorm)));

          let sum = 0;
          let count = 0;
          for (let bin = startBin; bin < endBin && bin < bufferLength; bin++) {
            sum += dataArray[bin];
            count++;
          }
          const rawEnergy = count > 0 ? sum / count : 0;

          // Frequency compensation:
          // Dampen booming bass slightly (0.82x) and boost high-frequency presence (up to 2.35x)
          // so bars dance dynamically across the entire spectrum
          const trebleScale = 0.82 + Math.pow(norm, 1.15) * 1.53;
          const weighted = (rawEnergy * trebleScale) / 255;
          bandEnergies[b] = Math.min(1, Math.max(0, weighted));
        }
      }

      // Compute target heights for symmetrical layout
      idlePhase += 0.025;

      // Layout bar geometry
      let barWidth = 3.5 * dpr;
      let gap = 2.5 * dpr;
      let totalWidth = BAR_COUNT * barWidth + (BAR_COUNT - 1) * gap;

      if (totalWidth > width * 0.96) {
        const scale = (width * 0.96) / totalWidth;
        barWidth = Math.max(2 * dpr, barWidth * scale);
        gap = Math.max(1.5 * dpr, gap * scale);
        totalWidth = BAR_COUNT * barWidth + (BAR_COUNT - 1) * gap;
      }

      const startX = (width - totalWidth) / 2;

      // Vibrant vertical gradient (Cyan to Violet to Coral/Pink to Neon Rose)
      const grad = ctx.createLinearGradient(0, height, 0, height - maxBarHeight);
      grad.addColorStop(0, '#06b6d4');   // Electric Cyan (bottom anchor)
      grad.addColorStop(0.35, '#8b5cf6'); // Vibrant Violet
      grad.addColorStop(0.72, '#ec4899'); // Coral Pink
      grad.addColorStop(1.0, '#f43f5e');  // Neon Rose (peak)

      ctx.save();
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(236, 72, 153, 0.45)';
      ctx.shadowBlur = 6 * dpr;

      for (let i = 0; i < BAR_COUNT; i++) {
        let targetHeight = minBarHeight;

        if (analyser && isPlaying) {
          // Symmetrical mapping:
          // The center two bars (17 and 18) receive lowest punchy bass frequencies (band 0).
          // Both edges (0 and 35) receive the sparkling high air/treble (band 17).
          const bandIndex = i < halfBars ? (halfBars - 1 - i) : (i - halfBars);
          const energy = bandEnergies[bandIndex] || 0;

          // Smooth edge taper envelope (Siri/Spotify style)
          const distFromCenter = Math.abs((i - (BAR_COUNT - 1) / 2) / ((BAR_COUNT - 1) / 2));
          const taper = 1 - Math.pow(distFromCenter, 2.8) * 0.24;

          targetHeight = minBarHeight + energy * taper * (maxBarHeight - minBarHeight);
        } else {
          // Idle resting state: gentle organic breathing wave
          const idleWave = Math.sin(i * 0.35 + idlePhase) * (1.8 * dpr);
          targetHeight = Math.max(minBarHeight, minBarHeight + idleWave);
        }

        // Smooth Animation & Physics:
        // Linear interpolation / lerping (currentHeight = prevHeight * 0.8 + targetHeight * 0.2)
        prevHeights.current[i] = prevHeights.current[i] * 0.8 + targetHeight * 0.2;
        const currentHeight = Math.max(minBarHeight, prevHeights.current[i]);

        const x = startX + i * (barWidth + gap);
        const y = height - currentHeight;
        const radius = barWidth / 2;

        // Render rounded-full pill bar
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, currentHeight, radius);
        } else {
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + barWidth - radius, y);
          ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius);
          ctx.lineTo(x + barWidth, y + currentHeight - radius);
          ctx.arcTo(x + barWidth, y + currentHeight, x + barWidth - radius, y + currentHeight, radius);
          ctx.lineTo(x + radius, y + currentHeight);
          ctx.arcTo(x, y + currentHeight, x, y + currentHeight - radius, radius);
          ctx.lineTo(x, y + radius);
          ctx.arcTo(x, y, x + radius, y, radius);
          ctx.closePath();
        }
        ctx.fill();
      }

      ctx.restore();
    };

    render();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      resizeObserver.disconnect();
    };
  }, [analyser, isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      className={className} 
      style={{ filter: 'drop-shadow(0 0 6px rgba(236,72,153,0.35))' }}
    />
  );
};
