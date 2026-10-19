import React, { useEffect, useRef } from 'react';
import { sampleLogarithmicBins } from '../hooks/useAudioVisualizer';

export interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  variant?: 'equalizer' | 'spectrum';
  barCount?: number;
  barWidth?: number;
  barGap?: number;
  maxBarHeight?: number;
  minBarHeight?: number;
  className?: string;
  accentColor?: string; // Kept for interface backward-compatibility
  mode?: string;        // Kept for interface backward-compatibility
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isPlaying,
  variant = 'equalizer',
  barCount: customBarCount,
  barWidth: customBarWidth,
  barGap: customBarGap,
  maxBarHeight: customMaxHeight,
  minBarHeight: customMinHeight,
  className = 'w-full h-full',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Configuration based on requested specs:
  // Equalizer: 28-32 slender bars (default: 30), width 3px, gap 3px, max-height 44px
  // Spectrum: 16-20 compact bars (default: 18), width 2.5px, gap 2.5px, max-height 24px
  const isSpectrum = variant === 'spectrum';
  const barCount = customBarCount ?? (isSpectrum ? 30 : 30);
  const baseBarWidth = customBarWidth ?? (isSpectrum ? 2.5 : 3.0);
  const baseBarGap = customBarGap ?? (isSpectrum ? 2.5 : 3.0);
  const baseMaxHeight = customMaxHeight ?? (isSpectrum ? 30 : 44);
  const baseMinHeight = customMinHeight ?? 3.0; // Resting at 3px baseline height

  // Persistent physics arrays for smooth lerping and organic decay
  const prevHeights = useRef<number[]>([]);
  const prevAmplitudes = useRef<number[]>([]);
  const frequencyBuffer = useRef<Uint8Array | null>(null);

  // Initialize or resize physics states
  if (prevHeights.current.length !== barCount) {
    prevHeights.current = new Array(barCount).fill(baseMinHeight);
    prevAmplitudes.current = new Array(barCount).fill(0);
  }

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

    // Ensure AnalyserNode configuration matches 256 fftSize and 0.86 smoothing
    if (analyser) {
      try {
        if (analyser.fftSize !== 256) analyser.fftSize = 256;
        if (analyser.smoothingTimeConstant !== 0.86) analyser.smoothingTimeConstant = 0.86;
      } catch {
        // Node state guard
      }
    }

    const render = () => {
      animFrameId.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      const dprScale = dpr;
      const minHeight = baseMinHeight * dprScale;
      const maxHeight = Math.min(height, baseMaxHeight * dprScale);
      const barWidth = baseBarWidth * dprScale;
      const barGap = baseBarGap * dprScale;

      // Extract Logarithmic / Low-Mid frequency energies between bins 2 and 48
      let rawEnergies: number[] = new Array(barCount).fill(0);

      if (analyser && isPlaying) {
        if (!frequencyBuffer.current || frequencyBuffer.current.length !== analyser.frequencyBinCount) {
          frequencyBuffer.current = new Uint8Array(analyser.frequencyBinCount);
        }

        // Sampling bins 2 to 48 with symmetric center-outward distribution for both variants
        rawEnergies = sampleLogarithmicBins(analyser, frequencyBuffer.current, barCount, 2, 48, true);
      }

      // Calculate centered layout
      const totalWidth = barCount * barWidth + (barCount - 1) * barGap;
      const startX = Math.max(0, (width - totalWidth) / 2);

      for (let i = 0; i < barCount; i++) {
        const normalizedValue = rawEnergies[i] || 0;

        // 1. Sensitivity Reduction & Noise Floor Threshold (Fix instant max-out on fade-ins):
        // Compress low-level sound; reserve full height only for true audio peaks
        const dampedValue = Math.pow(Math.max(0, (normalizedValue - 0.12) / 0.88), 1.6);

        // 2. Symmetric Bell-Curve Window Multiplier:
        // x is normalized position from center: -1.0 at left, 0.0 at center, +1.0 at right
        const x = barCount > 1 ? (i - (barCount - 1) / 2) / ((barCount - 1) / 2) : 0;
        const bellMultiplier = Math.exp(-2.2 * (x * x));

        // Scale total height with moderate headroom
        let targetHeight = minHeight;
        if (isPlaying && analyser) {
          targetHeight = Math.max(minHeight, dampedValue * bellMultiplier * maxHeight);
        }

        // 3. Organic Smoothing & Decay:
        // Snappy attack on sudden musical beats, smooth 0.85 decay factor on volume drops or pause
        if (targetHeight > prevHeights.current[i]) {
          prevHeights.current[i] = prevHeights.current[i] * 0.35 + targetHeight * 0.65;
        } else {
          // Decay by multiplying by 0.85 on each frame until resting at 3px baseline height
          prevHeights.current[i] = Math.max(minHeight, prevHeights.current[i] * 0.85);
        }

        // Snap cleanly to resting baseline once decayed
        if (Math.abs(prevHeights.current[i] - minHeight) < 0.08) {
          prevHeights.current[i] = minHeight;
        }

        const currentBarHeight = Math.max(minHeight, Math.min(maxHeight, prevHeights.current[i]));

        // Calculate normalized amplitude for dynamic opacity scaling [0.35 .. 0.95]
        const amplitude = (currentBarHeight - minHeight) / Math.max(1, maxHeight - minHeight);
        prevAmplitudes.current[i] = prevAmplitudes.current[i] * 0.75 + amplitude * 0.25;
        const currentAmp = Math.min(1, Math.max(0, prevAmplitudes.current[i]));

        // Dynamic opacity scaled smoothly between 0.35 and 0.95
        const barOpacity = 0.35 + currentAmp * (0.95 - 0.35);

        const xPos = startX + i * (barWidth + barGap);
        const yPos = height - currentBarHeight;
        const radius = barWidth / 2;

        ctx.save();
        ctx.globalAlpha = barOpacity;

        // Monochrome silver-white palette (#FFFFFF down to #A1A1AA / zinc-300)
        const grad = ctx.createLinearGradient(0, yPos, 0, yPos + currentBarHeight);
        grad.addColorStop(0, '#FFFFFF'); // Pure crisp silver-white top
        grad.addColorStop(1, '#A1A1AA'); // zinc-300 silver baseline

        ctx.fillStyle = grad;

        // Render rounded-full slender pill bar
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(xPos, yPos, barWidth, currentBarHeight, radius);
        } else {
          ctx.moveTo(xPos + radius, yPos);
          ctx.lineTo(xPos + barWidth - radius, yPos);
          ctx.arcTo(xPos + barWidth, yPos, xPos + barWidth, yPos + radius, radius);
          ctx.lineTo(xPos + barWidth, yPos + currentBarHeight - radius);
          ctx.arcTo(xPos + barWidth, yPos + currentBarHeight, xPos + barWidth - radius, yPos + currentBarHeight, radius);
          ctx.lineTo(xPos + radius, yPos + currentBarHeight);
          ctx.arcTo(xPos, yPos + currentBarHeight, xPos, yPos + currentBarHeight - radius, radius);
          ctx.lineTo(xPos, yPos + radius);
          ctx.arcTo(xPos, yPos, xPos + radius, yPos, radius);
          ctx.closePath();
        }
        ctx.fill();
        ctx.restore();
      }
    };

    render();

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
      resizeObserver.disconnect();
    };
  }, [analyser, isPlaying, barCount, baseBarWidth, baseBarGap, baseMaxHeight, baseMinHeight]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={isSpectrum ? 'Audio Spectrum Visualizer' : 'Now Playing Equalizer'}
    />
  );
};
