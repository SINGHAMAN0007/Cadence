import React, { useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  Repeat, Shuffle, ListMusic, Timer, Maximize2, Heart, Music, Quote
} from 'lucide-react';
import type { Track, RepeatMode, SleepTimerState } from '../types';

interface PlayerBarProps {
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
  onToggleFavorite: (track: Track) => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  isQueueOpen: boolean;
  onToggleQueue: () => void;
  queueCount: number;
  sleepTimer: SleepTimerState;
  onOpenSleepTimer: () => void;
  onOpenFullscreen: () => void;
  onOpenLyrics?: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
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
  onToggleFavorite,
  playbackRate,
  onChangePlaybackRate,
  isQueueOpen,
  onToggleQueue,
  queueCount,
  sleepTimer,
  onOpenSleepTimer,
  onOpenFullscreen,
  onOpenLyrics,
}) => {
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleProgressBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverSeekTime(ratio * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  const rates = [0.75, 1.0, 1.25, 1.5, 2.0];
  const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];

  return (
    <footer className="sticky bottom-0 sm:bottom-3 left-0 right-0 z-40 w-full sm:px-4 px-0 select-none shrink-0 pointer-events-none pb-[env(safe-area-inset-bottom,16px)] sm:pb-0">
      <div className="pointer-events-auto mx-auto max-w-5xl bg-[#141416]/95 sm:bg-[#16161a]/90 backdrop-blur-2xl border-t sm:border border-white/[0.1] sm:rounded-2xl shadow-2xl shadow-black/80 px-3 sm:px-5 py-2 sm:py-2.5 h-[76px] sm:h-20 flex items-center justify-between gap-3 sm:gap-6 relative">
        {/* Mobile Top Scrubber Bar */}
        <div 
          className="sm:hidden absolute top-0 left-0 right-0 h-1 bg-white/10 cursor-pointer overflow-hidden touch-manipulation"
          onClick={handleProgressBarClick}
        >
          <div 
            className="h-full bg-rose-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* 1. Track Info (Left) */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 sm:flex-initial sm:w-1/4 sm:min-w-[190px] sm:max-w-xs min-w-0">
          {currentTrack ? (
            <>
              <div 
                onClick={onOpenFullscreen}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg ring-1 ring-white/10 bg-white/[0.04] overflow-hidden relative group cursor-pointer shrink-0 shadow-md flex items-center justify-center touch-manipulation"
                title="Expand Fullscreen (F)"
              >
                {currentTrack.coverDataUrl ? (
                  <img src={currentTrack.coverDataUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
                ) : (
                  <Music size={18} className="text-zinc-400" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Maximize2 size={16} />
                </div>
              </div>

              <div className="min-w-0 pr-1 flex-1">
                <div 
                  onClick={onOpenFullscreen}
                  className="text-xs sm:text-[13px] font-semibold text-white tracking-tight truncate hover:text-rose-400 cursor-pointer transition-colors"
                >
                  {currentTrack.title}
                </div>
                <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                  {currentTrack.artist}
                </div>
              </div>

              <button
                onClick={() => onToggleFavorite(currentTrack)}
                className={`p-2 min-w-[36px] min-h-[36px] rounded-full hover:bg-white/[0.06] transition-colors shrink-0 hidden sm:flex items-center justify-center ${
                  currentTrack.isFavorite ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
                }`}
                title={currentTrack.isFavorite ? 'Favorited' : 'Add to Favorites'}
              >
                <Heart size={16} fill={currentTrack.isFavorite ? 'currentColor' : 'none'} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5 text-zinc-500 text-xs">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg ring-1 ring-white/10 bg-white/[0.04] flex items-center justify-center shrink-0">
                <Music size={16} className="opacity-40" />
              </div>
              <span className="truncate text-zinc-400 text-xs">Not Playing</span>
            </div>
          )}
        </div>

        {/* 2. Controls & Scrubber (Center - Desktop & Tablets sm+) */}
        <div className="hidden sm:flex flex-col items-center gap-1.5 flex-1 max-w-xl px-2">
          {/* Buttons Row */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Shuffle */}
            <button
              onClick={onToggleShuffle}
              className={`w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors ${
                isShuffle ? 'text-rose-500 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Shuffle: ${isShuffle ? 'On' : 'Off'} (S)`}
            >
              <Shuffle size={16} />
            </button>

            {/* Previous */}
            <button
              onClick={onPrev}
              disabled={!currentTrack}
              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-300 hover:text-white disabled:opacity-20 rounded-full hover:bg-white/[0.06] transition-colors"
              title="Previous (or Left Arrow)"
            >
              <SkipBack size={19} fill="currentColor" />
            </button>

            {/* Solid Play / Pause Circular Button */}
            <button
              onClick={onTogglePlay}
              disabled={!currentTrack}
              className="w-10 h-10 min-w-[40px] min-h-[40px] bg-white text-zinc-950 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 shadow-md shadow-white/20 transition-transform"
              title="Play / Pause (Space)"
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              disabled={!currentTrack}
              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-300 hover:text-white disabled:opacity-20 rounded-full hover:bg-white/[0.06] transition-colors"
              title="Next (or Right Arrow)"
            >
              <SkipForward size={19} fill="currentColor" />
            </button>

            {/* Repeat */}
            <button
              onClick={onCycleRepeat}
              className={`w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors relative ${
                repeatMode !== 'off' ? 'text-rose-500 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode} (L)`}
            >
              <Repeat size={16} />
              {repeatMode === 'one' && (
                <span className="absolute top-1.5 right-1.5 text-[8px] font-bold bg-rose-500 text-white rounded-full w-3 h-3 flex items-center justify-center">
                  1
                </span>
              )}
            </button>

            {/* Speed Toggle */}
            <button
              onClick={() => onChangePlaybackRate(nextRate)}
              className="text-[10px] font-mono px-2 py-0.5 bg-white/[0.06] hover:bg-white/10 text-zinc-400 hover:text-white rounded-full transition-colors"
              title="Playback Speed"
            >
              {playbackRate}x
            </button>
          </div>

          {/* Apple-style Scrubbing Row */}
          <div className="w-full flex items-center gap-2.5">
            <span className="text-[10px] text-zinc-400 font-mono tabular-nums w-8 text-right shrink-0">
              {formatTime(currentTime)}
            </span>

            <div
              className="flex-1 h-3 flex items-center cursor-pointer group relative touch-manipulation"
              onMouseMove={handleProgressBarHover}
              onMouseLeave={() => setHoverSeekTime(null)}
              onClick={handleProgressBarClick}
            >
              {/* Ultra-thin Apple progress track that subtly expands on hover */}
              <div className="w-full h-[3px] group-hover:h-[5px] bg-white/15 rounded-full overflow-hidden transition-all">
                <div
                  className="h-full bg-white relative transition-all group-hover:bg-rose-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Scrubber Thumb Knob */}
              <div
                className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform pointer-events-none -translate-x-1/2 -translate-y-1/2 top-1/2"
                style={{ left: `${progressPercent}%` }}
              />

              {/* Hover Tooltip */}
              {hoverSeekTime !== null && (
                <div
                  className="absolute -top-6 px-1.5 py-0.5 bg-[#1c1c1e] border border-white/10 rounded-md text-[10px] font-mono text-white shadow-xl -translate-x-1/2 pointer-events-none"
                  style={{ left: `${hoverX}px` }}
                >
                  {formatTime(hoverSeekTime)}
                </div>
              )}
            </div>

            <span className="text-[10px] text-zinc-400 font-mono tabular-nums w-8 shrink-0">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* 3. Mobile Compact Play & Next Controls (48x48px tap targets, sm:hidden) */}
        <div className="sm:hidden flex items-center gap-1 shrink-0">
          <button
            onClick={onPrev}
            disabled={!currentTrack}
            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-zinc-300 hover:text-white disabled:opacity-30 rounded-full active:bg-white/10 touch-manipulation"
            aria-label="Previous Track"
          >
            <SkipBack size={19} fill="currentColor" />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={!currentTrack}
            className="w-12 h-12 min-w-[48px] min-h-[48px] bg-white text-zinc-950 rounded-full flex items-center justify-center disabled:opacity-30 shadow-md active:scale-95 transition-transform touch-manipulation"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!currentTrack}
            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-zinc-300 hover:text-white disabled:opacity-30 rounded-full active:bg-white/10 touch-manipulation"
            aria-label="Next Track"
          >
            <SkipForward size={19} fill="currentColor" />
          </button>

          <button
            onClick={onOpenFullscreen}
            disabled={!currentTrack}
            className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-30 rounded-full active:bg-white/10 touch-manipulation"
            title="Fullscreen visualizer"
            aria-label="Fullscreen Player"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* 4. Desktop Extras & Volume (sm and above) */}
        <div className="hidden sm:flex items-center justify-end gap-1.5 sm:w-1/4 sm:min-w-[190px] sm:max-w-xs shrink-0">
          {/* Sleep Timer */}
          <button
            onClick={onOpenSleepTimer}
            className={`w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors relative ${
              sleepTimer.isActive
                ? 'text-rose-500'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Sleep & Play Timer (T)"
          >
            <Timer size={17} />
            {sleepTimer.isActive && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          {/* Queue Drawer */}
          <button
            onClick={onToggleQueue}
            className={`w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors relative ${
              isQueueOpen
                ? 'text-rose-500'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Up Next Queue (Q)"
          >
            <ListMusic size={17} />
            {queueCount > 0 && (
              <span className="absolute top-1.5 right-1 px-1 py-0.2 bg-rose-500 text-[8px] font-bold font-mono text-white rounded-full min-w-3.5 text-center">
                {queueCount}
              </span>
            )}
          </button>

          {/* Synchronized Lyrics Button */}
          {onOpenLyrics && (
            <button
              onClick={onOpenLyrics}
              disabled={!currentTrack}
              className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 rounded-full transition-colors"
              title="Synchronized Lyrics (L)"
              aria-label="Open Synchronized Lyrics"
            >
              <Quote size={16} className="rotate-180" />
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={onOpenFullscreen}
            disabled={!currentTrack}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 rounded-full transition-colors"
            title="Immersive Visualizer (F)"
          >
            <Maximize2 size={17} />
          </button>

          {/* Integrated Volume Slider with Fluid Dragging */}
          <div className="hidden md:flex items-center gap-1 group pl-1">
            <button
              onClick={onToggleMute}
              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-zinc-400 hover:text-white rounded-full transition-colors"
              title="Mute / Unmute (M)"
            >
              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 lg:w-20 h-1 bg-white/20 rounded-full appearance-none accent-white hover:accent-rose-500 cursor-pointer"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
