import React from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX, 
  Repeat, Shuffle, Timer, Maximize2, Music, Quote
} from 'lucide-react';
import { AudioSeeker } from './AudioSeeker';
import { FavoriteHeartButton } from './FavoriteHeartButton';
import { sanitizeMetadata } from '../utils/sanitizeMetadata';
import type { Track, RepeatMode, SleepTimerState } from '../types';

interface PlayerBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  isFavorite?: boolean;
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
  onToggleFavorite?: (track: Track) => void;
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
  isFavorite,
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
  const rates = [0.75, 1.0, 1.25, 1.5, 2.0];
  const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
  const effectiveVolume = isMuted ? 0 : volume;
  const loudnessPercent = Math.round(effectiveVolume * 100);

  return (
    <footer className="sticky bottom-0 sm:bottom-4 left-0 right-0 z-40 w-full sm:px-6 px-0 select-none shrink-0 pointer-events-none pb-[env(safe-area-inset-bottom,16px)] sm:pb-0">
      <div className="pointer-events-auto w-full max-w-7xl mx-auto h-14 sm:h-auto px-3 sm:px-4 py-0 sm:py-3 bg-[#0a0a0a]/95 backdrop-blur-md border-t sm:border border-white/10 sm:rounded-2xl shadow-2xl flex items-center justify-between gap-3 sm:gap-4 overflow-visible relative">
        {/* Mobile Top Scrubber Bar (Flush 2px line with no white dot knob) */}
        <div className="sm:hidden absolute top-0 left-0 right-0 z-20 h-[2px] overflow-hidden pointer-events-auto">
          <AudioSeeker
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            layout="minimal"
            accentColor="rose"
            className="w-full h-[2px]"
          />
        </div>

        {/* Left Track Block */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 sm:flex-initial sm:w-1/4 min-w-0 sm:min-w-[180px] sm:max-w-[260px] shrink-0">
          {currentTrack ? (
            <>
              <div 
                onClick={onOpenFullscreen}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ring-1 ring-white/10 bg-white/5 overflow-hidden relative group cursor-pointer flex items-center justify-center shrink-0 shadow-md touch-manipulation"
                title="Expand Fullscreen (F)"
              >
                {currentTrack.coverDataUrl ? (
                  <img src={currentTrack.coverDataUrl} alt={currentTrack.title} className="w-full h-full object-cover shrink-0" />
                ) : (
                  <Music size={18} className="text-zinc-400" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Maximize2 size={16} />
                </div>
              </div>

              {(() => {
                const cleanMeta = sanitizeMetadata(currentTrack.title, currentTrack.artist, currentTrack.album);
                return (
                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <div 
                      onClick={onOpenFullscreen}
                      className="text-xs sm:text-sm font-semibold text-white truncate block w-full hover:text-zinc-300 cursor-pointer transition-colors leading-tight"
                      title={cleanMeta.title}
                    >
                      {cleanMeta.title}
                    </div>
                    <div 
                      className="text-[11px] text-zinc-400 truncate block w-full mt-0.5 leading-tight"
                      title={cleanMeta.artist}
                    >
                      {cleanMeta.artist}
                    </div>
                  </div>
                );
              })()}

              {/* Now Playing Favorite Heart Button */}
              {onToggleFavorite && (
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <FavoriteHeartButton
                    trackId={currentTrack.id}
                    initialFavorite={isFavorite ?? !!currentTrack.isFavorite}
                    onToggle={() => onToggleFavorite(currentTrack)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-3 text-zinc-500 text-xs min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ring-1 ring-white/10 bg-white/5 flex items-center justify-center shrink-0">
                <Music size={16} className="opacity-40" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="text-xs sm:text-sm font-semibold text-zinc-400 truncate block">Not Playing</span>
                <span className="text-[11px] text-zinc-600 truncate mt-0.5 block">Select a song</span>
              </div>
            </div>
          )}
        </div>

        {/* B. Center Section (Controls + Stacked Scrubber) */}
        <div className="hidden sm:flex flex-col items-center justify-center flex-1 max-w-xl px-2">
          {/* Row 1: Playback Buttons */}
          <div className="flex items-center gap-4 mb-1.5">
            {/* Shuffle */}
            <button
              onClick={onToggleShuffle}
              className={`p-1.5 rounded-full hover:bg-white/10 transition-colors ${
                isShuffle ? 'text-rose-500 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Shuffle: ${isShuffle ? 'On' : 'Off'} (S)`}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Previous */}
            <button
              onClick={onPrev}
              disabled={!currentTrack}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white disabled:opacity-20 transition-colors"
              title="Previous (Left Arrow)"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={onTogglePlay}
              disabled={!currentTrack}
              className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 transition-all shadow-md shadow-white/20"
              title="Play / Pause (Space)"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              disabled={!currentTrack}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white disabled:opacity-20 transition-colors"
              title="Next (Right Arrow)"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            {/* Repeat */}
            <button
              onClick={onCycleRepeat}
              className={`p-1.5 rounded-full hover:bg-white/10 transition-colors relative ${
                repeatMode !== 'off' ? 'text-rose-500 font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode} (L)`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && (
                <span className="absolute top-0 right-0 text-[8px] font-bold bg-rose-500 text-white rounded-full w-2.5 h-2.5 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Row 2: Progress Bar & Timestamps */}
          <AudioSeeker
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            layout="inline"
            accentColor="rose"
            className="w-full"
          />
        </div>

        {/* Mobile Compact Play & Next Controls (sm:hidden) */}
        <div className="sm:hidden flex items-center gap-1.5 shrink-0">
          <button
            onClick={onPrev}
            disabled={!currentTrack}
            className="p-2 text-zinc-300 hover:text-white disabled:opacity-20 active:scale-95 transition-all touch-manipulation cursor-pointer"
            aria-label="Previous Track"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>

          <button
            onClick={onTogglePlay}
            disabled={!currentTrack}
            className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 active:scale-95 transition-all shadow-md touch-manipulation cursor-pointer"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            disabled={!currentTrack}
            className="p-2 text-zinc-300 hover:text-white disabled:opacity-20 active:scale-95 transition-all touch-manipulation cursor-pointer"
            aria-label="Next Track"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>

          <button
            onClick={onOpenFullscreen}
            disabled={!currentTrack}
            className="p-2 text-zinc-400 hover:text-white disabled:opacity-20 active:scale-95 transition-all touch-manipulation cursor-pointer"
            title="Fullscreen visualizer"
            aria-label="Fullscreen Player"
          >
            <Maximize2 size={16} />
          </button>
        </div>

        {/* C. Right Section (Utility Tools + Subtle Volume) */}
        <div className="hidden sm:flex items-center justify-end gap-3 w-1/4 min-w-[200px] shrink-0 text-zinc-400">
          {/* Playback Speed */}
          <button
            onClick={() => onChangePlaybackRate(nextRate)}
            className="text-xs font-mono px-1.5 py-0.5 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            title="Playback Speed"
          >
            {playbackRate}x
          </button>

          {/* Sleep Timer */}
          <button
            onClick={onOpenSleepTimer}
            className={`p-1.5 rounded-full hover:bg-white/5 transition-colors relative ${
              sleepTimer.isActive
                ? 'text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Sleep & Play Timer (T)"
          >
            <Timer size={16} />
            {sleepTimer.isActive && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            )}
          </button>

          {/* Synchronized Lyrics Button */}
          {onOpenLyrics && (
            <button
              onClick={onOpenLyrics}
              disabled={!currentTrack}
              className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
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
            className="p-1.5 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Immersive Visualizer (F)"
          >
            <Maximize2 size={16} />
          </button>

          {/* Subtle volume slider (thin monochrome line, no loud highlight) */}
          <div 
            className="hidden md:flex items-center gap-1.5 group/volume relative select-none shrink-0"
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY < 0 ? 0.03 : -0.03;
              const currentVal = isMuted ? 0 : volume;
              const nextVal = Math.max(0, Math.min(1, Math.round((currentVal + delta) * 100) / 100));
              onVolumeChange(nextVal);
            }}
          >
            {/* Dynamic Mute/Volume Icon Button */}
            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-full hover:bg-white/5 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer shrink-0"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-zinc-500" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4 text-zinc-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            {/* Ultra-thin Monochrome Slider Track */}
            <div className="w-20 md:w-24 flex items-center relative h-5">
              {/* Track background */}
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden relative cursor-pointer">
                {/* Active Fill */}
                <div
                  className="h-full bg-zinc-400 group-hover/volume:bg-white rounded-full transition-colors"
                  style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                />
              </div>

              {/* Slider Thumb (Tactile Knob) */}
              <div
                className="w-2 h-2 rounded-full bg-zinc-300 shadow-sm absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none group-hover/volume:bg-white transition-colors"
                style={{ left: `${isMuted ? 0 : volume * 100}%` }}
              />

              {/* Hidden Range Input */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full h-full opacity-0 absolute inset-0 cursor-pointer"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                aria-label="Volume slider"
              />
            </div>

            {/* Subdued loudness readout */}
            <span className="text-[10px] font-mono tabular-nums text-zinc-500 group-hover/volume:text-zinc-300 min-w-[24px] text-right transition-colors select-none font-normal">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
