import React from 'react';
import { 
  X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Shuffle, BarChart3, Activity, CircleDot, Maximize2, Minimize2, Music, Quote
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import type { Track, RepeatMode, VisualizerMode, SleepTimerState } from '../types';

interface FullscreenPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  repeatMode: RepeatMode;
  onCycleRepeat: () => void;
  isShuffle: boolean;
  onToggleShuffle: () => void;
  analyser: AnalyserNode | null;
  visualizerMode: VisualizerMode;
  onChangeVisualizerMode: (mode: VisualizerMode) => void;
  sleepTimer: SleepTimerState;
  onOpenLyrics?: () => void;
}

export const FullscreenPlayerModal: React.FC<FullscreenPlayerModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  currentTime,
  duration,
  onSeek,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  repeatMode,
  onCycleRepeat,
  isShuffle,
  onToggleShuffle,
  analyser,
  visualizerMode,
  onChangeVisualizerMode,
  sleepTimer,
  onOpenLyrics,
}) => {
  if (!isOpen || !currentTrack) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d0f] flex flex-col justify-between p-4 sm:p-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] select-none animate-in fade-in duration-200 touch-manipulation overflow-hidden">
      {/* Background ambient album art glow */}
      {currentTrack.coverDataUrl ? (
        <div 
          className="absolute -inset-10 bg-cover bg-center filter blur-3xl opacity-35 scale-125 pointer-events-none transform-gpu"
          style={{ backgroundImage: `url(${currentTrack.coverDataUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-950/25 via-[#0d0d0f] to-[#0d0d0f] pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-[#0d0d0f]/60 backdrop-blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-full">
            <button
              onClick={() => onChangeVisualizerMode('bars')}
              className={`w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                visualizerMode === 'bars' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
              title="Frequency Spectrum Bars"
              aria-label="Spectrum Bars Visualizer"
            >
              <BarChart3 size={15} />
            </button>
            <button
              onClick={() => onChangeVisualizerMode('wave')}
              className={`w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                visualizerMode === 'wave' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
              title="Oscilloscope Waveform"
              aria-label="Oscilloscope Waveform Visualizer"
            >
              <Activity size={15} />
            </button>
            <button
              onClick={() => onChangeVisualizerMode('circle')}
              className={`w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                visualizerMode === 'circle' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
              title="Radial Circular Visualizer"
              aria-label="Circular Visualizer"
            >
              <CircleDot size={15} />
            </button>
          </div>

          {sleepTimer.isActive && (
            <div className="px-3 py-1.5 bg-white/[0.06] backdrop-blur-2xl border border-white/10 text-rose-400 text-xs font-mono rounded-full tabular-nums">
              Timer: {Math.floor(sleepTimer.remainingSeconds / 60)}:{(sleepTimer.remainingSeconds % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenLyrics && (
            <button
              onClick={onOpenLyrics}
              className="h-10 px-3 sm:px-4 flex items-center gap-2 text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/12 border border-white/10 rounded-full transition-all active:scale-95 shadow-lg backdrop-blur-2xl text-xs font-semibold group"
              title="Synchronized Lyrics"
              aria-label="Open Synchronized Lyrics"
            >
              <Quote size={15} className="text-rose-400 rotate-180 group-hover:scale-110 transition-transform" />
              <span>Lyrics</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 rounded-full transition-colors active:scale-95 shadow-lg backdrop-blur-2xl"
            title="Exit Fullscreen (Esc)"
            aria-label="Close Fullscreen"
          >
            <Minimize2 size={18} />
          </button>
        </div>
      </div>

      {/* Centerpiece: Art & Live Visualizer */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-3 sm:my-6 gap-4 sm:gap-6 max-w-4xl mx-auto w-full min-h-0">
        {/* Cover Art with rounded-2xl geometry and ring highlight */}
        <div className="relative group shrink-0">
          <div className="w-52 h-52 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-2xl ring-1 ring-white/15 bg-white/[0.04] overflow-hidden shadow-2xl flex items-center justify-center relative">
            {currentTrack.coverDataUrl ? (
              <img
                src={currentTrack.coverDataUrl}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-rose-950/40 via-zinc-900 to-zinc-800 flex items-center justify-center">
                <Music size={64} className="text-zinc-400" />
              </div>
            )}
          </div>
        </div>

        {/* Track Title and Artist */}
        <div className="text-center max-w-xl px-4 shrink-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight truncate">
            {currentTrack.title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-rose-400 font-medium truncate mt-1">
            {currentTrack.artist}
          </p>
          <p className="text-xs text-zinc-400 truncate mt-0.5">
            {currentTrack.album}
          </p>
        </div>

        {/* Live Audio Visualizer Canvas */}
        <div className="w-full h-20 sm:h-28 md:h-36 max-w-2xl px-4 min-h-[60px]">
          <AudioVisualizer
            analyser={analyser}
            isPlaying={isPlaying}
            mode={visualizerMode}
            className="w-full h-full rounded-xl"
            accentColor="#fa2d48"
          />
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="relative z-10 max-w-2xl mx-auto w-full space-y-3 sm:space-y-4 shrink-0">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div
            className="h-2 w-full bg-white/15 rounded-full cursor-pointer relative overflow-hidden group touch-manipulation hover:h-2.5 transition-all"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              onSeek(pct * duration);
            }}
          >
            <div
              className="h-full bg-white rounded-full transition-all group-hover:bg-rose-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-400 font-mono tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Playback & Volume row */}
        <div className="flex items-center justify-between">
          {/* Shuffle & Repeat (min 48x48 tap target) */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleShuffle}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
                isShuffle ? 'text-rose-500 bg-white/10' : 'text-zinc-400 hover:text-white'
              }`}
              title="Shuffle"
              aria-label="Toggle Shuffle"
            >
              <Shuffle size={18} />
            </button>
            <button
              onClick={onCycleRepeat}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors relative ${
                repeatMode !== 'off' ? 'text-rose-500 bg-white/10' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label="Cycle Repeat"
            >
              <Repeat size={18} />
              {repeatMode === 'one' && (
                <span className="absolute top-2 right-2 text-[8px] font-bold bg-rose-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
            {onOpenLyrics && (
              <button
                onClick={onOpenLyrics}
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Synchronized Lyrics"
                aria-label="Toggle Lyrics"
              >
                <Quote size={17} className="rotate-180 text-rose-400" />
              </button>
            )}
          </div>

          {/* Main Controls (48x48+ touch targets) */}
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={onPrev}
              className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
              aria-label="Previous Track"
            >
              <SkipBack size={24} fill="currentColor" />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-14 h-14 sm:w-16 sm:h-16 min-w-[56px] min-h-[56px] bg-white text-zinc-950 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 shadow-xl shadow-white/20 transition-transform"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-1" />}
            </button>
            <button
              onClick={onNext}
              className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
              aria-label="Next Track"
            >
              <SkipForward size={24} fill="currentColor" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleMute}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              aria-label="Toggle Mute"
            >
              {isMuted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 sm:w-20 h-1 bg-white/20 rounded-full appearance-none accent-white cursor-pointer hidden sm:block"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
