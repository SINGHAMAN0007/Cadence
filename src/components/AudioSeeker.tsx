import React, { useState, useRef, useEffect } from 'react';

interface AudioSeekerProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
  showTimestamps?: boolean;
  layout?: 'stacked' | 'inline' | 'minimal';
  accentColor?: 'rose' | 'white';
  showTooltip?: boolean;
}

export const AudioSeeker: React.FC<AudioSeekerProps> = ({
  currentTime,
  duration,
  onSeek,
  className = '',
  showTimestamps = true,
  layout = 'stacked',
  accentColor = 'rose',
  showTooltip = true,
}) => {
  // Explicit dragging state to eliminate lag & snapback
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPercent, setScrubPercent] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const progressBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage (0-100) strictly from client coordinates
  const calculatePercentFromEvent = (e: React.PointerEvent | PointerEvent | Touch) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const pos = (e.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(100, pos * 100));
  };

  // Optimistic display position immediately during dragging
  const displayPercent =
    isScrubbing && scrubPercent !== null
      ? scrubPercent
      : duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;

  // Active time for timestamps (optimistic while scrubbing)
  const displayTime =
    isScrubbing && scrubPercent !== null
      ? (scrubPercent / 100) * (duration || 0)
      : currentTime;

  // Unified Pointer Handlers for precision drag & click
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Fallback if capture not available
    }

    setIsScrubbing(true);
    const pct = calculatePercentFromEvent(e);
    setScrubPercent(pct);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;

    if (isScrubbing) {
      e.preventDefault();
      const pct = calculatePercentFromEvent(e);
      setScrubPercent(pct);
    } else if (showTooltip && layout !== 'minimal') {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      setHoverX(x);
      if (duration > 0 && rect.width > 0) {
        setHoverTime((x / rect.width) * duration);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const pct = calculatePercentFromEvent(e);
    const targetTime = (pct / 100) * (duration || 0);

    if (isFinite(targetTime)) {
      onSeek(targetTime);
    }
    setIsScrubbing(false);
    setScrubPercent(null);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      if (scrubPercent !== null) {
        const targetTime = (scrubPercent / 100) * (duration || 0);
        if (isFinite(targetTime)) {
          onSeek(targetTime);
        }
      }
      setIsScrubbing(false);
      setScrubPercent(null);
    }
  };

  // Window fallback safety to guarantee release of scrubbing state
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isScrubbing) {
        if (scrubPercent !== null) {
          const targetTime = (scrubPercent / 100) * (duration || 0);
          if (isFinite(targetTime)) {
            onSeek(targetTime);
          }
        }
        setIsScrubbing(false);
        setScrubPercent(null);
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('mouseup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('mouseup', handleGlobalPointerUp);
    };
  }, [isScrubbing, scrubPercent, duration, onSeek]);

  // Track component
  const trackElement = (
    <div
      ref={progressBarRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseLeave={() => setHoverTime(null)}
      className={`relative w-full cursor-pointer group touch-none select-none flex items-center ${
        layout === 'minimal'
          ? 'h-[2px] py-0'
          : layout === 'inline'
          ? 'h-3'
          : 'py-2 h-6'
      }`}
      role="slider"
      aria-label="Audio progress slider"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={displayTime}
      aria-valuetext={`${formatTime(displayTime)} of ${formatTime(duration)}`}
    >
      {/* Track Background Line */}
      <div
        className={`w-full relative overflow-hidden ${
          layout === 'minimal'
            ? 'h-[2px] bg-white/10'
            : layout === 'inline'
            ? 'h-1 group-hover:h-1.5 bg-white/10 rounded-full transition-all'
            : isScrubbing
            ? 'h-1.5 bg-white/20 rounded-full'
            : 'h-1 group-hover:h-1.5 bg-white/15 rounded-full transition-all'
        }`}
      >
        {/* Progress Fill: Bound strictly to displayPercent with no lag during scrubbing */}
        <div
          className={`h-full ${
            isScrubbing ? 'transition-none' : 'transition-[width] duration-100 ease-linear'
          } ${accentColor === 'white' ? 'bg-white' : 'bg-rose-500'}`}
          style={{ width: `${displayPercent}%` }}
        />
      </div>

      {/* Scrubber Thumb / Handle: Bound strictly to displayPercent with zero desync */}
      {layout !== 'minimal' && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)] pointer-events-none ${
            isScrubbing
              ? 'transition-none opacity-100 scale-125 ring-4 ring-white/25'
              : 'transition-[transform,opacity] duration-150 opacity-100 scale-100 group-hover:scale-125'
          } ${layout === 'inline' ? 'w-2.5 h-2.5' : 'w-3 h-3 sm:w-3.5 sm:h-3.5'}`}
          style={{ left: `${displayPercent}%` }}
        />
      )}

      {/* Hover Tooltip (Desktop) */}
      {showTooltip && layout !== 'minimal' && !isScrubbing && hoverTime !== null && (
        <div
          className="absolute -top-7 px-2 py-0.5 bg-[#0a0a0a] border border-white/10 rounded-md text-[10px] font-mono text-white shadow-xl -translate-x-1/2 pointer-events-none backdrop-blur-md"
          style={{ left: `${hoverX}px` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
    </div>
  );

  if (layout === 'minimal') {
    return <div className={`relative w-full ${className}`}>{trackElement}</div>;
  }

  if (layout === 'inline') {
    return (
      <div className={`w-full flex items-center gap-2.5 select-none ${className}`}>
        {showTimestamps && (
          <span
            className={`text-[11px] font-mono tabular-nums w-8 text-right shrink-0 select-none transition-colors ${
              isScrubbing ? 'text-white font-semibold' : 'text-zinc-400'
            }`}
          >
            {formatTime(displayTime)}
          </span>
        )}
        <div className="flex-1 min-w-0 relative flex items-center">{trackElement}</div>
        {showTimestamps && (
          <span className="text-[11px] text-zinc-400 font-mono tabular-nums w-8 text-left shrink-0 select-none">
            {formatTime(duration)}
          </span>
        )}
      </div>
    );
  }

  // Default: stacked
  return (
    <div className={`w-full select-none ${className}`}>
      {trackElement}
      {showTimestamps && (
        <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-mono text-zinc-400 mt-1 select-none tabular-nums">
          <span
            className={`transition-colors ${
              isScrubbing ? 'text-white font-semibold scale-105' : 'text-zinc-400'
            }`}
          >
            {formatTime(displayTime)}
          </span>
          <span className="text-zinc-400">{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
};
