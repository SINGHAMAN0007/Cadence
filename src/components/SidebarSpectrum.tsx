import React from 'react';
import { AudioVisualizer } from './AudioVisualizer';

export interface SidebarSpectrumProps {
  analyser?: AnalyserNode | null;
  isPlaying?: boolean;
  barCount?: number;
  className?: string;
}

export const SidebarSpectrum: React.FC<SidebarSpectrumProps> = ({
  analyser,
  isPlaying = false,
  barCount = 30,
  className = '',
}) => {
  return (
    <div className={`bg-white/[0.02] border border-white/5 rounded-xl p-3 mx-2 mb-2 shrink-0 ${className}`}>
      {/* Header row */}
      <div className="flex items-center justify-between text-[10px] font-mono tracking-wider mb-2">
        <span className="text-zinc-500 font-semibold tracking-wider">SPECTRUM</span>
        <span className={isPlaying ? 'text-white font-medium tracking-wider' : 'text-zinc-500 font-normal tracking-wider'}>
          {isPlaying ? 'ACTIVE' : 'PAUSED'}
        </span>
      </div>

      {/* Visualizer wave: same equalizer wave as in song extended layout with increased width */}
      <div className="w-full h-8 flex items-end justify-center overflow-hidden">
        <AudioVisualizer
          analyser={analyser ?? null}
          isPlaying={isPlaying}
          variant="equalizer"
          barCount={barCount}
          barWidth={3}
          barGap={3}
          maxBarHeight={28}
          minBarHeight={3}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};
