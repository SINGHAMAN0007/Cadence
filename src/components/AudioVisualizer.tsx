import React, { useEffect, useRef } from 'react';
import type { VisualizerMode } from '../types';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  mode?: VisualizerMode;
  className?: string;
  accentColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isPlaying,
  mode = 'bars',
  className = 'w-full h-full',
  accentColor = '#8b5cf6', // violet-500
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number | null>(null);

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
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(canvas);

    let idlePhase = 0;

    const render = () => {
      animFrameId.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      if (width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      // If analyser is not active or paused
      if (!analyser || !isPlaying) {
        // Subtle resting pulse wave
        idlePhase += 0.03;
        ctx.save();
        ctx.lineWidth = 1.5 * dpr;
        ctx.strokeStyle = 'rgba(161, 161, 170, 0.25)'; // muted zinc
        ctx.beginPath();
        const midY = height / 2;
        const waveCount = 40;
        for (let i = 0; i <= waveCount; i++) {
          const x = (i / waveCount) * width;
          const y = midY + Math.sin(i * 0.35 + idlePhase) * (height * 0.06);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
        return;
      }

      // Live Analyser Data
      if (mode === 'bars') {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Take a relevant slice (lower & mid frequencies are most musical)
        const barsToDraw = Math.min(48, Math.floor(width / (4 * dpr)));
        const step = Math.floor(bufferLength * 0.75 / barsToDraw);
        const totalBarWidth = width / barsToDraw;
        const barWidth = Math.max(2 * dpr, totalBarWidth - 2.5 * dpr);

        for (let i = 0; i < barsToDraw; i++) {
          const value = dataArray[i * step] || 0;
          const percent = value / 255;
          const barHeight = Math.max(3 * dpr, percent * height * 0.92);
          const x = i * totalBarWidth + (totalBarWidth - barWidth) / 2;
          const y = height - barHeight;

          // Gradient color: Purple -> Cyan / Pink
          const grad = ctx.createLinearGradient(0, height, 0, y);
          grad.addColorStop(0, accentColor);
          grad.addColorStop(0.7, '#38bdf8'); // sky-400
          grad.addColorStop(1, '#ec4899'); // pink-500

          ctx.fillStyle = grad;
          // Rounded top bar
          const radius = Math.min(barWidth / 2, 4 * dpr);
          ctx.beginPath();
          ctx.moveTo(x, height);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.lineTo(x + barWidth - radius, y);
          ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
          ctx.lineTo(x + barWidth, height);
          ctx.closePath();
          ctx.fill();
        }
      } else if (mode === 'wave') {
        const bufferLength = analyser.fftSize;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        ctx.save();
        ctx.lineWidth = 2.5 * dpr;
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 8 * dpr;

        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.restore();
      } else if (mode === 'circle') {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(width, height) * 0.22;
        const numPoints = 64;
        const angleStep = (Math.PI * 2) / numPoints;

        ctx.save();
        ctx.translate(centerX, centerY);

        // Core glowing pulse
        const avgFreq = dataArray.slice(0, 16).reduce((a, b) => a + b, 0) / 16;
        const pulse = (avgFreq / 255) * 8 * dpr;

        ctx.beginPath();
        ctx.arc(0, 0, baseRadius + pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.15)';
        ctx.fill();
        ctx.lineWidth = 1.5 * dpr;
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
        ctx.stroke();

        // Radiating spikes
        for (let i = 0; i < numPoints; i++) {
          const val = dataArray[i * 2] || 0;
          const spikeLen = (val / 255) * (Math.min(width, height) * 0.25);
          const rad = baseRadius + pulse;
          const angle = i * angleStep;

          const x1 = Math.cos(angle) * rad;
          const y1 = Math.sin(angle) * rad;
          const x2 = Math.cos(angle) * (rad + spikeLen);
          const y2 = Math.sin(angle) * (rad + spikeLen);

          ctx.strokeStyle = `hsl(${(i / numPoints) * 120 + 240}, 85%, 65%)`;
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    render();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      resizeObserver.disconnect();
    };
  }, [analyser, isPlaying, mode, accentColor]);

  return <canvas ref={canvasRef} className={className} />;
};
