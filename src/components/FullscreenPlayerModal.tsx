import React, { useState, useEffect } from 'react';
import { 
  X, Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX, 
  Repeat, Shuffle, Maximize2, Minimize2, Music, Quote
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { AudioSeeker } from './AudioSeeker';
import { sanitizeMetadata } from '../utils/sanitizeMetadata';
import type { Track, RepeatMode, SleepTimerState } from '../types';

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
  onToggleFavorite?: (track: Track, nextFav?: boolean) => void;
  analyser: AnalyserNode | null;
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
  onToggleFavorite,
  analyser,
  sleepTimer,
  onOpenLyrics,
}) => {
  const [optimisticFav, setOptimisticFav] = useState<boolean | null>(null);

  // Sync with currentTrack.isFavorite changes
  useEffect(() => {
    setOptimisticFav(null);
  }, [currentTrack?.id, currentTrack?.isFavorite]);

  const isFav = optimisticFav !== null ? optimisticFav : !!currentTrack?.isFavorite;

  const handleToggleFavorite = () => {
    if (!currentTrack || !onToggleFavorite) return;
    const nextFav = !isFav;
    setOptimisticFav(nextFav);
    onToggleFavorite(currentTrack, nextFav);
  };

  if (!isOpen || !currentTrack) return null;

  const { title: cleanTitle, artist: cleanArtist, album: cleanAlbum } = sanitizeMetadata(
    currentTrack.title,
    currentTrack.artist,
    currentTrack.album
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 sm:p-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] select-none animate-in fade-in duration-200 touch-manipulation overflow-hidden">
      {/* Background ambient subtle art */}
      {currentTrack.coverDataUrl && (
        <div 
          className="absolute -inset-10 bg-cover bg-center filter blur-3xl opacity-15 scale-125 pointer-events-none transform-gpu"
          style={{ backgroundImage: `url(${currentTrack.coverDataUrl})` }}
        />
      )}
      <div className="absolute inset-0 bg-black/90 pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sleepTimer.isActive && (
            <div className="px-3.5 py-1.5 bg-white/[0.06] backdrop-blur-2xl border border-white/10 text-zinc-300 text-xs font-mono rounded-full tabular-nums flex items-center gap-2 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Timer: {Math.floor(sleepTimer.remainingSeconds / 60)}:{(sleepTimer.remainingSeconds % 60).toString().padStart(2, '0')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpenLyrics && (
            <button
              onClick={onOpenLyrics}
              className="h-10 px-3.5 sm:px-4 flex items-center gap-2 text-zinc-200 hover:text-white bg-white/[0.06] hover:bg-white/12 border border-white/10 rounded-full transition-all active:scale-95 shadow-lg backdrop-blur-2xl text-xs font-semibold group cursor-pointer"
              title="Synchronized Lyrics"
              aria-label="Open Synchronized Lyrics"
            >
              <Quote size={15} className="text-zinc-400 rotate-180 group-hover:scale-110 transition-transform" />
              <span>Lyrics</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 rounded-full transition-colors active:scale-95 shadow-lg backdrop-blur-2xl cursor-pointer"
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
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                <Music size={64} className="text-zinc-500" />
              </div>
            )}
          </div>
        </div>

        {/* Track Title, Artist, and Favorite Button */}
        <div className="w-full max-w-sm mx-auto px-6 flex items-center justify-between gap-3 mt-4 shrink-0">
          <div className="min-w-0 flex-1 text-left">
            <h1 
              className="text-lg font-bold text-white tracking-tight truncate block"
              title={cleanTitle}
            >
              {cleanTitle}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium truncate block mt-0.5" title={cleanArtist}>
              {cleanArtist}
            </p>
          </div>

          <button
            type="button"
            aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleToggleFavorite();
            }}
            className="w-9 h-9 rounded-full hover:bg-white/5 active:scale-90 transition-all flex items-center justify-center shrink-0 cursor-pointer"
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            {isFav ? (
              <svg className="w-5 h-5 fill-rose-500 stroke-rose-500 hover:scale-105 active:scale-90 transition-all duration-150" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 stroke-zinc-500 fill-transparent hover:stroke-zinc-300 hover:scale-105 stroke-[1.75] transition-all duration-150" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            )}
          </button>
        </div>

        {/* Live Audio Visualizer Equalizer (28-32 slender bars, width 3px, gap 3px, max-height 44px, monochrome silver-white) */}
        <div className="w-full h-12 sm:h-14 max-w-xl px-4 min-h-[44px] mx-auto flex justify-center items-end">
          <AudioVisualizer
            analyser={analyser}
            isPlaying={isPlaying}
            variant="equalizer"
            className="w-full h-11"
          />
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="relative z-10 max-w-2xl mx-auto w-full space-y-3 sm:space-y-4 shrink-0">
        {/* Interactive Seeker Slider */}
        <AudioSeeker
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          accentColor="white"
        />

        {/* Playback & Volume row - Perfectly centered across all screen sizes */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full">
          {/* Shuffle & Repeat (Left Group) */}
          <div className="flex items-center justify-start gap-1 sm:gap-2">
            <button
              onClick={onToggleShuffle}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors active:scale-95 ${
                isShuffle ? 'text-white bg-white/15 ring-1 ring-white/20' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
              aria-label="Toggle Shuffle"
            >
              <Shuffle size={18} />
            </button>
            <button
              onClick={onCycleRepeat}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors relative active:scale-95 ${
                repeatMode !== 'off' ? 'text-white bg-white/15 ring-1 ring-white/20' : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
              title={`Repeat: ${repeatMode}`}
              aria-label="Cycle Repeat"
            >
              <Repeat size={18} />
              {repeatMode === 'one' && (
                <span className="absolute top-2 right-2 text-[8px] font-bold bg-white text-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Main Controls: Previous, Play/Pause, Next (Dead-center on all device formats) */}
          <div className="flex items-center justify-center gap-3 sm:gap-6 shrink-0">
            <button
              onClick={onPrev}
              disabled={!currentTrack}
              className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Previous Track"
            >
              <SkipBack size={24} fill="currentColor" />
            </button>
            <button
              onClick={onTogglePlay}
              disabled={!currentTrack}
              className="w-14 h-14 sm:w-16 sm:h-16 min-w-[56px] min-h-[56px] bg-white text-zinc-950 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 shadow-xl shadow-white/20 transition-transform disabled:opacity-30"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={26} fill="currentColor" />
              ) : (
                <Play size={26} fill="currentColor" className="ml-1" />
              )}
            </button>
            <button
              onClick={onNext}
              disabled={!currentTrack}
              className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next Track"
            >
              <SkipForward size={24} fill="currentColor" />
            </button>
          </div>

          {/* Subtle Mute Button (Right Group) */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <button
              onClick={onToggleMute}
              className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] rounded-full transition-colors active:scale-95"
              aria-label="Toggle Mute"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={18} />
              ) : volume < 0.5 ? (
                <Volume1 size={18} />
              ) : (
                <Volume2 size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Discreet Low-Contrast Volume Bar (Secondary & Understated) */}
        <div className="w-full max-w-[260px] mx-auto flex items-center gap-3 px-2 py-1 opacity-70 hover:opacity-100 transition-opacity group/fvol select-none">
          <button
            onClick={onToggleMute}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer shrink-0"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label="Toggle Mute"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-zinc-600" />
            ) : (
              <Volume1 className="w-3.5 h-3.5 text-zinc-600" />
            )}
          </button>

          <div className="flex-1 relative flex items-center h-4 cursor-pointer">
            {/* Track background */}
            <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden relative">
              {/* Active Fill - strictly monochrome zinc-400, no rose highlights */}
              <div
                className="h-full bg-zinc-400 group-hover/fvol:bg-white rounded-full transition-colors"
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              />
            </div>

            {/* Slider Thumb (Subtle tactile dot) */}
            <div
              className="w-2 h-2 rounded-full bg-zinc-300 shadow-sm absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none group-hover/fvol:bg-white transition-colors"
              style={{ left: `${isMuted ? 0 : volume * 100}%` }}
            />

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              aria-label="Volume slider"
            />
          </div>

          <button
            onClick={() => onVolumeChange(1.0)}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer shrink-0"
            title="Max Volume"
            aria-label="Max Volume"
          >
            <Volume2 className="w-3.5 h-3.5 text-zinc-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
