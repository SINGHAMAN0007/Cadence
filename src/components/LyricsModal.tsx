import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  X, Play, Pause, SkipBack, SkipForward, Music, 
  Upload, Edit3, Check, RotateCcw, FileText, FastForward, Rewind, ChevronLeft
} from 'lucide-react';
import type { Track } from '../types';
import { 
  parseLrc, 
  extractLyricsFromAudioBlob, 
  DEMO_LYRICS, 
  type LyricLine 
} from '../services/lyricsService';
import { getLyricsForTrack } from '../utils/lyricsCleaner';
import { sanitizeMetadata } from '../utils/sanitizeMetadata';
import { AudioSeeker } from './AudioSeeker';

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
      setLyricsSource('Synchronized');
      setIsLoadingMetadata(false);
      return;
    }

    // Check 2: Try to read from demo library if applicable
    if (DEMO_LYRICS[currentTrack.title]) {
      const demoLrc = DEMO_LYRICS[currentTrack.title];
      setRawLyrics(demoLrc);
      setLyricsSource('Synchronized');
      setIsLoadingMetadata(false);
      if (onUpdateTrackLyrics) {
        onUpdateTrackLyrics(currentTrack.id, demoLrc);
      }
      return;
    }

    // Check 3: Read ID3 USLT frame from the track's audio file, with online LRCLib fallback
    setIsLoadingMetadata(true);
    extractLyricsFromAudioBlob(currentTrack.file)
      .then(async (extracted) => {
        if (isCancelled) return;
        if (extracted && extracted.lyrics && extracted.lyrics.trim().length > 0) {
          setRawLyrics(extracted.lyrics);
          setLyricsSource(
            extracted.source === 'id3-uslt'
              ? 'Synchronized'
              : 'Plain Lyrics'
          );
          if (onUpdateTrackLyrics) {
            onUpdateTrackLyrics(currentTrack.id, extracted.lyrics);
          }
          return;
        }

        // Check 4: Fetch online synced LRC / plain lyrics via LRCLib with Hindi/metadata cleaning
        try {
          const onlineLyrics = await getLyricsForTrack(
            currentTrack.id,
            currentTrack.title,
            currentTrack.artist,
            duration
          );
          if (isCancelled) return;
          if (onlineLyrics && onlineLyrics.lines.length > 0) {
            // Reconstruct LRC text format for consistent playback & editing
            let formattedLrc = '';
            if (onlineLyrics.isSynced) {
              formattedLrc = onlineLyrics.lines
                .map((line) => {
                  const mins = Math.floor(line.time / 60);
                  const secs = Math.floor(line.time % 60);
                  const ms = Math.floor((line.time % 1) * 100);
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  return `[${pad(mins)}:${pad(secs)}.${pad(ms)}] ${line.text}`;
                })
                .join('\n');
            } else {
              formattedLrc = onlineLyrics.lines.map((l) => l.text).join('\n');
            }

            setRawLyrics(formattedLrc);
            setLyricsSource(onlineLyrics.isSynced ? 'Synchronized (Online)' : 'Plain Lyrics');
            if (onUpdateTrackLyrics) {
              onUpdateTrackLyrics(currentTrack.id, formattedLrc);
            }
            return;
          }
        } catch (fetchErr) {
          console.warn('LRCLib fetch note:', fetchErr);
        }

        if (!isCancelled) {
          setRawLyrics('');
          setLyricsSource('');
        }
      })
      .catch(async (err) => {
        console.warn('Failed to extract USLT frame:', err);
        if (isCancelled) return;
        // Fallback to online fetch if extraction crashed
        try {
          const onlineLyrics = await getLyricsForTrack(
            currentTrack.id,
            currentTrack.title,
            currentTrack.artist,
            duration
          );
          if (isCancelled) return;
          if (onlineLyrics && onlineLyrics.lines.length > 0) {
            const formattedLrc = onlineLyrics.isSynced
              ? onlineLyrics.lines
                  .map((line) => {
                    const mins = Math.floor(line.time / 60);
                    const secs = Math.floor(line.time % 60);
                    const ms = Math.floor((line.time % 1) * 100);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    return `[${pad(mins)}:${pad(secs)}.${pad(ms)}] ${line.text}`;
                  })
                  .join('\n')
              : onlineLyrics.lines.map((l) => l.text).join('\n');
            setRawLyrics(formattedLrc);
            setLyricsSource(onlineLyrics.isSynced ? 'Synchronized (Online)' : 'Plain Lyrics');
            if (onUpdateTrackLyrics) {
              onUpdateTrackLyrics(currentTrack.id, formattedLrc);
            }
            return;
          }
        } catch {}

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
  }, [isOpen, currentTrack?.id, currentTrack?.lyrics, duration]);

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
    return parsedLines.findIndex((line, i) => {
      const nextTime = parsedLines[i + 1]?.time ?? Infinity;
      return currentTime >= line.time && currentTime < nextTime;
    });
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
    }, 2800);
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

  const handleLoadDemoLyrics = () => {
    const demo = DEMO_LYRICS['Neon Velocity'] || `[00:00.00] Instrument opening\n[00:04.00] Floating through the quiet city night\n[00:09.00] Streetlights blurring in the silver rain\n[00:14.50] Deep bass echoes on the empty road\n[00:20.00] Midnight highway stretching out ahead\n[00:26.00] Signals glowing in the rear mirror\n[00:32.00] Endless rhythm carries us along\n[00:38.00] Lost inside the cadence of the sound`;
    setRawLyrics(demo);
    setLyricsSource('Synchronized');
    if (currentTrack && onUpdateTrackLyrics) {
      onUpdateTrackLyrics(currentTrack.id, demo);
    }
  };

  const handleOpenEditor = () => {
    setEditorText(rawLyrics);
    setIsEditorOpen(true);
  };

  const handleSaveEditor = () => {
    setRawLyrics(editorText);
    setLyricsSource(editorText.includes('[') ? 'Synchronized' : 'Plain Lyrics');
    if (currentTrack && onUpdateTrackLyrics) {
      onUpdateTrackLyrics(currentTrack.id, editorText);
    }
    setIsEditorOpen(false);
  };

  const handleImportLrcFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const text = reader.result;
        setRawLyrics(text);
        setLyricsSource(text.includes('[') ? 'Synchronized' : 'Plain Lyrics');
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between select-none animate-in fade-in duration-150 touch-manipulation overflow-hidden">
      {/* Top Header Bar */}
      <header className="relative z-20 h-16 sm:h-18 px-4 sm:px-8 pt-[max(0.75rem,env(safe-area-inset-top,0px))] flex items-center justify-between border-b border-white/5 bg-black shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 sm:hidden"
            title="Back"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg ring-1 ring-white/10 bg-white/[0.04] overflow-hidden shrink-0 flex items-center justify-center">
            {currentTrack.coverDataUrl ? (
              <img 
                src={currentTrack.coverDataUrl} 
                alt={currentTrack.title} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <Music size={16} className="text-zinc-500" />
            )}
          </div>

          <div className="min-w-0">
            {(() => {
              const clean = sanitizeMetadata(currentTrack.title, currentTrack.artist, currentTrack.album);
              return (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white truncate" title={clean.title}>
                      {clean.title}
                    </h2>
                    {lyricsSource && (
                      <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                        {lyricsSource}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate mt-0.5" title={clean.artist}>
                    {clean.artist}
                  </p>
                </>
              );
            })()}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Offset Adjuster (if lyrics are loaded) */}
          {parsedLines.length > 0 && (
            <div className="hidden md:flex items-center gap-1 bg-white/[0.03] border border-white/5 rounded-lg px-2 py-1 text-xs text-zinc-300">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium px-1">Sync:</span>
              <button
                onClick={() => setTimeOffset((prev) => Math.round((prev - 0.5) * 10) / 10)}
                className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                title="Delay lyrics (-0.5s)"
              >
                <Rewind size={13} />
              </button>
              <span className="font-mono text-[11px] px-1 text-zinc-300 tabular-nums">
                {timeOffset >= 0 ? `+${timeOffset.toFixed(1)}s` : `${timeOffset.toFixed(1)}s`}
              </span>
              <button
                onClick={() => setTimeOffset((prev) => Math.round((prev + 0.5) * 10) / 10)}
                className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
                title="Advance lyrics (+0.5s)"
              >
                <FastForward size={13} />
              </button>
              {timeOffset !== 0 && (
                <button
                  onClick={() => setTimeOffset(0)}
                  className="p-1 text-zinc-500 hover:text-white cursor-pointer"
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
            className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors cursor-pointer"
            title="Edit Lyrics"
          >
            <Edit3 size={13} className="text-zinc-400" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Close"
            aria-label="Close Lyrics Modal"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Main Lyrics Viewport (Pure OLED Black) */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-4 sm:px-8 py-4 sm:py-6 overflow-hidden bg-black">
        {/* Floating Sync Resume Button (when user scrolled away) */}
        {isUserScrolling && activeLineIndex !== -1 && (
          <button
            onClick={handleResumeSync}
            className="absolute top-4 z-30 px-3.5 py-1.5 bg-white text-black text-xs font-semibold rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150 cursor-pointer"
          >
            <span>Resume Auto-Scroll</span>
          </button>
        )}

        {/* State A: Loading Metadata */}
        {isLoadingMetadata && (
          <div className="flex flex-col items-center justify-center gap-2 text-center p-8">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 mb-2">
              <FileText size={20} className="animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-white">Reading Lyrics...</h3>
            <p className="text-xs text-zinc-500 max-w-xs">
              Scanning audio tags for synchronized timestamps.
            </p>
          </div>
        )}

        {/* State B: Empty State (No lyrics available) */}
        {!isLoadingMetadata && parsedLines.length === 0 && (
          <div className="max-w-sm w-full mx-auto p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-normal">
                No lyrics available for this track
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={handleLoadDemoLyrics}
                className="w-full py-2 px-3.5 bg-white text-black font-semibold rounded-xl text-xs hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                Sample Lyrics
              </button>

              <label className="w-full py-2 px-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload size={13} className="text-zinc-400" />
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
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors pt-1 cursor-pointer block mx-auto"
            >
              Or manually paste lyrics
            </button>
          </div>
        )}

        {/* State C: Synchronized Lyric Lines List (OLED Clean) */}
        {!isLoadingMetadata && parsedLines.length > 0 && (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="w-full h-full max-w-2xl overflow-y-auto px-4 py-16 scroll-smooth text-left space-y-3 sm:space-y-4 focus:outline-none scrollbar-none"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)',
            }}
          >
            {parsedLines.map((line, idx) => {
              const isActive = idx === activeLineIndex;

              return (
                <div
                  key={line.id}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleLineClick(line.time)}
                  className={`group transition-all duration-200 cursor-pointer select-none py-1.5 flex items-baseline justify-between gap-4`}
                >
                  <div
                    className={
                      isActive
                        ? 'text-xl sm:text-2xl font-bold text-white transition-all duration-200 scale-[1.02] origin-left'
                        : 'text-base sm:text-lg font-medium text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer py-1.5'
                    }
                  >
                    {line.text}
                  </div>

                  <span
                    className={`font-mono text-[11px] tabular-nums shrink-0 transition-opacity ${
                      isActive
                        ? 'text-zinc-400 font-medium opacity-100'
                        : 'text-zinc-600 opacity-0 group-hover:opacity-100'
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

      {/* Bottom Floating Control Bar (OLED Clean) */}
      <footer className="relative z-20 px-4 sm:px-8 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] border-t border-white/5 bg-black shrink-0">
        <div className="max-w-xl mx-auto space-y-2">
          {/* Scrubber Progress Track */}
          <AudioSeeker
            currentTime={currentTime}
            duration={duration}
            onSeek={onSeek}
            accentColor="white"
            layout="stacked"
          />

          {/* Controls Row */}
          <div className="flex items-center justify-center gap-5 sm:gap-6">
            {onPrev && (
              <button
                onClick={onPrev}
                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Previous Track"
                aria-label="Previous Track"
              >
                <SkipBack size={18} fill="currentColor" />
              </button>
            )}

            <button
              onClick={onTogglePlay}
              className="w-11 h-11 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-sm"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </button>

            {onNext && (
              <button
                onClick={onNext}
                className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Next Track"
                aria-label="Next Track"
              >
                <SkipForward size={18} fill="currentColor" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Lyrics Editor Modal Overlay (OLED Clean) */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-5 text-white flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <h3 className="text-sm font-semibold text-white">Edit / Paste Lyrics</h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 mt-2 shrink-0">
              Paste standard timestamped LRC lines (e.g. <code className="text-zinc-300 font-mono">[00:15.30] Lyric line</code>) or plain text.
            </p>

            <textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              placeholder={`[00:00.00] Intro\n[00:10.50] Verse 1 lyrics\n[00:25.00] Chorus line...`}
              className="mt-3 flex-1 min-h-[220px] w-full rounded-xl bg-white/[0.04] border border-white/10 p-3 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/25 resize-none"
            />

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between shrink-0">
              <label className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer">
                <Upload size={13} className="text-zinc-400" />
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
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditor}
                  className="px-5 h-9 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={13} />
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
