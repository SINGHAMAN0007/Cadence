import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  X, Play, Pause, SkipBack, SkipForward, Quote, Music, 
  Sparkles, Upload, Edit3, Check, RotateCcw, AlertCircle, FileText, FastForward, Rewind
} from 'lucide-react';
import type { Track } from '../types';
import { 
  parseLrc, 
  extractLyricsFromAudioBlob, 
  DEMO_LYRICS, 
  type LyricLine 
} from '../services/lyricsService';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onUpdateTrackLyrics?: (trackId: number, lyrics: string) => Promise<void> | void;
}

export const LyricsModal: React.FC<LyricsModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  duration,
  isPlaying,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  onUpdateTrackLyrics,
}) => {
  const [rawLyrics, setRawLyrics] = useState<string>('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(false);
  const [lyricsSource, setLyricsSource] = useState<string>('');
  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [isUserScrolling, setIsUserScrolling] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [editorText, setEditorText] = useState<string>('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load lyrics whenever currentTrack changes or modal opens
  useEffect(() => {
    if (!isOpen || !currentTrack) return;

    let isCancelled = false;

    // Check 1: Already has lyrics on track object
    if (currentTrack.lyrics && currentTrack.lyrics.trim().length > 0) {
      setRawLyrics(currentTrack.lyrics);
      setLyricsSource('ID3 / Saved Lyrics');
      setIsLoadingMetadata(false);
      return;
    }

    // Check 2: Try to read from demo library if applicable
    if (DEMO_LYRICS[currentTrack.title]) {
      const demoLrc = DEMO_LYRICS[currentTrack.title];
      setRawLyrics(demoLrc);
      setLyricsSource('Synchronized Demo Lyrics');
      setIsLoadingMetadata(false);
      if (onUpdateTrackLyrics) {
        onUpdateTrackLyrics(currentTrack.id, demoLrc);
      }
      return;
    }

    // Check 3: Read ID3 USLT frame from the track's audio file
    setIsLoadingMetadata(true);
    extractLyricsFromAudioBlob(currentTrack.file)
      .then((extracted) => {
        if (isCancelled) return;
        if (extracted && extracted.lyrics) {
          setRawLyrics(extracted.lyrics);
          setLyricsSource(
            extracted.source === 'id3-uslt'
              ? "ID3 'USLT' Frame (Synchronized)"
              : extracted.source === 'id3-sylt'
              ? "ID3 'SYLT' Frame"
              : 'Embedded Metadata'
          );
          if (onUpdateTrackLyrics) {
            onUpdateTrackLyrics(currentTrack.id, extracted.lyrics);
          }
        } else {
          setRawLyrics('');
          setLyricsSource('');
        }
      })
      .catch((err) => {
        console.warn('Failed to extract USLT frame:', err);
        if (!isCancelled) {
          setRawLyrics('');
          setLyricsSource('');
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingMetadata(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, currentTrack?.id, currentTrack?.lyrics]);

  // Parse lines with active offset
  const parsedLines = useMemo<LyricLine[]>(() => {
    if (!rawLyrics.trim()) return [];
    const lines = parseLrc(rawLyrics, duration);
    if (timeOffset !== 0) {
      return lines.map((l) => ({
        ...l,
        time: Math.max(0, l.time + timeOffset),
      }));
    }
    return lines;
  }, [rawLyrics, duration, timeOffset]);

  // Find active line index based on currentTime
  const activeLineIndex = useMemo(() => {
    if (parsedLines.length === 0) return -1;
    // Find the last line whose time <= currentTime
    let activeIdx = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      if (currentTime >= parsedLines[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [parsedLines, currentTime]);

  // Auto-scroll to active line if user is not actively scrolling
  useEffect(() => {
    if (isUserScrolling || activeLineIndex === -1) return;
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, isUserScrolling]);

  // Handle manual scroll detection to prevent fighting the user
  const handleScroll = () => {
    setIsUserScrolling(true);
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 2500);
  };

  const handleResumeSync = () => {
    setIsUserScrolling(false);
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const handleLineClick = (lineTime: number) => {
    onSeek(lineTime);
    setIsUserScrolling(false);
  };

  // Preset sample lyrics loader
  const handleLoadDemoLyrics = () => {
    const demo =
      (currentTrack && DEMO_LYRICS[currentTrack.title]) ||
      `[00:00.00]♫ (Intro melody begins) ♫
[00:04.00]Rhythm moving to the digital beat
[00:08.50]Synchronized frequencies feeling the heat
[00:13.00]Glow of the city under midnight skies
[00:17.50]Nothing to hold us, watching starlight rise
[00:22.00]♫ (Interlude beat drops) ♫
[00:26.50]Turn the volume up and let the music play
[00:31.00]Drifting far away into a brand new day
[00:35.50]♫ (Outro melody softly fades) ♫`;

    setRawLyrics(demo);
    setLyricsSource('Preset Synchronized Lyrics');
    if (currentTrack && onUpdateTrackLyrics) {
      onUpdateTrackLyrics(currentTrack.id, demo);
    }
  };

  // Open inline editor
  const handleOpenEditor = () => {
    setEditorText(rawLyrics);
    setIsEditorOpen(true);
  };

  const handleSaveEditor = () => {
    setRawLyrics(editorText);
    setLyricsSource('Custom User Lyrics');
    if (currentTrack && onUpdateTrackLyrics) {
      onUpdateTrackLyrics(currentTrack.id, editorText);
    }
    setIsEditorOpen(false);
  };

  // Import .lrc / .txt file from device
  const handleImportLrcFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const text = reader.result;
        setRawLyrics(text);
        setLyricsSource(`Imported: ${file.name}`);
        if (currentTrack && onUpdateTrackLyrics) {
          onUpdateTrackLyrics(currentTrack.id, text);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d0f] flex flex-col justify-between select-none animate-in fade-in duration-200 touch-manipulation overflow-hidden">
      {/* Dynamic blurred album art backdrop */}
      {currentTrack.coverDataUrl ? (
        <div 
          className="absolute -inset-10 bg-cover bg-center filter blur-3xl opacity-30 scale-125 pointer-events-none transform-gpu"
          style={{ backgroundImage: `url(${currentTrack.coverDataUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-950/20 via-[#0d0d0f] to-[#0d0d0f] pointer-events-none" />
      )}
      <div className="absolute inset-0 bg-[#0d0d0f]/65 backdrop-blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-20 h-16 sm:h-20 px-4 sm:px-8 pt-[max(0.75rem,env(safe-area-inset-top,0px))] flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl ring-1 ring-white/15 bg-white/[0.06] overflow-hidden shrink-0 shadow-lg flex items-center justify-center">
            {currentTrack.coverDataUrl ? (
              <img 
                src={currentTrack.coverDataUrl} 
                alt={currentTrack.title} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <Music size={20} className="text-rose-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                {currentTrack.title}
              </h2>
              {lyricsSource && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 border border-rose-500/20 text-rose-400">
                  <Quote size={9} className="rotate-180" />
                  {lyricsSource}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              {currentTrack.artist} • {currentTrack.album}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Offset Adjuster (if lyrics are loaded) */}
          {parsedLines.length > 0 && (
            <div className="hidden md:flex items-center gap-1 bg-white/[0.04] border border-white/10 rounded-full px-2 py-1 text-xs text-zinc-300">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium px-1">Sync:</span>
              <button
                onClick={() => setTimeOffset((prev) => Math.round((prev - 0.5) * 10) / 10)}
                className="p-1 hover:text-white rounded-full transition-colors"
                title="Delay lyrics (-0.5s)"
              >
                <Rewind size={13} />
              </button>
              <span className="font-mono text-[11px] px-1 text-rose-400 tabular-nums">
                {timeOffset >= 0 ? `+${timeOffset.toFixed(1)}s` : `${timeOffset.toFixed(1)}s`}
              </span>
              <button
                onClick={() => setTimeOffset((prev) => Math.round((prev + 0.5) * 10) / 10)}
                className="p-1 hover:text-white rounded-full transition-colors"
                title="Advance lyrics (+0.5s)"
              >
                <FastForward size={13} />
              </button>
              {timeOffset !== 0 && (
                <button
                  onClick={() => setTimeOffset(0)}
                  className="p-1 text-zinc-400 hover:text-white"
                  title="Reset offset to 0.0s"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>
          )}

          {/* Edit / Add Lyrics Button */}
          <button
            onClick={handleOpenEditor}
            className="h-9 px-3 flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-full transition-colors active:scale-95 shadow-sm"
            title="Edit or Paste Lyrics"
          >
            <Edit3 size={14} className="text-rose-400" />
            <span className="hidden sm:inline">Edit Lyrics</span>
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-zinc-300 hover:text-white bg-white/[0.06] hover:bg-white/10 border border-white/10 rounded-full transition-colors active:scale-95 shadow-md"
            title="Close Lyrics (Esc)"
            aria-label="Close Lyrics Modal"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Lyrics Viewport */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-4 sm:px-8 py-4 sm:py-6 overflow-hidden">
        {/* Floating Sync Resume Button (when user scrolled away) */}
        {isUserScrolling && activeLineIndex !== -1 && (
          <button
            onClick={handleResumeSync}
            className="absolute top-6 z-30 px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-full shadow-xl shadow-rose-500/25 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150 active:scale-95"
          >
            <Quote size={12} className="rotate-180" />
            <span>Resume Auto-Scroll</span>
          </button>
        )}

        {/* State A: Loading ID3 Metadata */}
        {isLoadingMetadata && (
          <div className="flex flex-col items-center justify-center gap-3 text-center p-8 animate-pulse">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-rose-500">
              <Quote size={24} className="rotate-180 animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-white">Reading ID3 'USLT' Frame...</h3>
            <p className="text-xs text-zinc-400 max-w-xs">
              Scanning audio metadata tags for synchronized lyrics and timestamps.
            </p>
          </div>
        )}

        {/* State B: Empty State (No ID3 USLT lyrics found) */}
        {!isLoadingMetadata && parsedLines.length === 0 && (
          <div className="max-w-md w-full mx-auto p-6 sm:p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <FileText size={26} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                No ID3 'USLT' Lyrics Found
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                This audio file does not contain an embedded ID3v2 <code className="text-rose-400 font-mono">USLT</code> frame. You can load sample synchronized lyrics or import an <code className="text-rose-400 font-mono">.lrc</code> file.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={handleLoadDemoLyrics}
                className="w-full py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full text-xs font-semibold shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Sparkles size={14} />
                <span>Load Sample Synced Lyrics</span>
              </button>

              <label className="w-full py-2.5 px-4 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-white rounded-full text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                <Upload size={14} className="text-rose-400" />
                <span>Import .lrc / .txt</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".lrc,.txt"
                  className="hidden"
                  onChange={handleImportLrcFile}
                />
              </label>
            </div>

            <button
              onClick={handleOpenEditor}
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 transition-colors pt-1"
            >
              Or manually paste lyrics text
            </button>
          </div>
        )}

        {/* State C: Synchronized Lyric Lines List */}
        {!isLoadingMetadata && parsedLines.length > 0 && (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="w-full h-full max-w-3xl overflow-y-auto px-4 py-12 scroll-smooth text-left space-y-4 sm:space-y-6 focus:outline-none scrollbar-none"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
            }}
          >
            {parsedLines.map((line, idx) => {
              const isActive = idx === activeLineIndex;
              const isPast = activeLineIndex !== -1 && idx < activeLineIndex;

              return (
                <div
                  key={line.id}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleLineClick(line.time)}
                  className={`group transition-all duration-300 cursor-pointer rounded-2xl px-4 py-3 select-none flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4 ${
                    isActive
                      ? 'bg-white/[0.08] backdrop-blur-xl border border-white/15 scale-[1.02] shadow-2xl shadow-rose-500/10'
                      : isPast
                      ? 'opacity-40 hover:opacity-80 hover:bg-white/[0.03]'
                      : 'opacity-65 hover:opacity-100 hover:bg-white/[0.04]'
                  }`}
                >
                  <div
                    className={`font-semibold tracking-tight transition-all duration-300 leading-snug ${
                      isActive
                        ? 'text-white text-xl sm:text-2xl md:text-3xl font-extrabold drop-shadow-[0_0_24px_rgba(255,255,255,0.35)]'
                        : 'text-zinc-200 text-base sm:text-lg md:text-xl group-hover:text-white'
                    }`}
                  >
                    {line.text}
                  </div>

                  <span
                    className={`font-mono text-xs tabular-nums shrink-0 transition-opacity ${
                      isActive
                        ? 'text-rose-400 font-bold opacity-100'
                        : 'text-zinc-400 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {formatTime(line.time)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Bottom Floating Control Bar */}
      <footer className="relative z-20 px-4 sm:px-8 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] border-t border-white/[0.08] bg-[#141416]/90 backdrop-blur-2xl shrink-0">
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Scrubber Progress Track */}
          <div className="space-y-1">
            <div
              className="h-1.5 w-full bg-white/15 rounded-full cursor-pointer relative overflow-hidden group touch-manipulation hover:h-2 transition-all"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                onSeek(pct * duration);
              }}
            >
              <div
                className="h-full bg-rose-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400 font-mono tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {onPrev && (
              <button
                onClick={onPrev}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
                title="Previous Track"
                aria-label="Previous Track"
              >
                <SkipBack size={20} fill="currentColor" />
              </button>
            )}

            <button
              onClick={onTogglePlay}
              className="w-12 h-12 min-w-[48px] min-h-[48px] bg-white text-zinc-950 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 shadow-xl shadow-white/20 transition-transform"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={22} fill="currentColor" />
              ) : (
                <Play size={22} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            {onNext && (
              <button
                onClick={onNext}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
                title="Next Track"
                aria-label="Next Track"
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Lyrics Editor Modal Overlay */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#1c1c1e]/98 border border-white/15 rounded-3xl shadow-2xl p-6 text-white flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Quote size={18} className="text-rose-400 rotate-180" />
                <h3 className="text-base font-bold text-white">Edit / Paste Lyrics</h3>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mt-2 shrink-0">
              Paste standard timestamped LRC lines (e.g. <code className="text-rose-400 font-mono">[00:15.30] Lyric line</code>) or plain text.
            </p>

            <textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              placeholder={`[00:00.00] Intro\n[00:10.50] Verse 1 lyrics\n[00:25.00] Chorus line...`}
              className="mt-3 flex-1 min-h-[220px] w-full rounded-2xl bg-white/[0.04] border border-white/10 p-3 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/50 resize-none"
            />

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
              <label className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer">
                <Upload size={14} className="text-rose-400" />
                <span>Import .lrc file</span>
                <input
                  type="file"
                  accept=".lrc,.txt"
                  className="hidden"
                  onChange={handleImportLrcFile}
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditor}
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/25 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Check size={14} />
                  <span>Save Lyrics</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
