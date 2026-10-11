import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current || duration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return ratio * duration;
    },
    [duration]
  );

  // Active displayed time and progress percentage
  const activeTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (activeTime / duration) * 100)) : 0;

  // Handle pointer down (mouse or mobile touch)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture isn't available
    }

    const newTime = calculateTimeFromClientX(e.clientX);
    setIsScrubbing(true);
    setScrubTime(newTime);
  };

  // Handle pointer move during drag/scrub
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current || duration <= 0) return;

    if (isScrubbing) {
      e.preventDefault();
      const newTime = calculateTimeFromClientX(e.clientX);
      setScrubTime(newTime);
    } else if (showTooltip && layout !== 'minimal') {
      const rect = trackRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      setHoverX(x);
      setHoverTime(calculateTimeFromClientX(clientX));
    }
  };

  // Handle pointer release - commit final seek time
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    const finalTime = calculateTimeFromClientX(e.clientX);
    setIsScrubbing(false);
    onSeek(finalTime);
  };

  const handlePointerCancel = () => {
    if (isScrubbing) {
      setIsScrubbing(false);
      onSeek(scrubTime);
    }
  };

  // Explicit touch events fallback
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (duration <= 0 || !e.touches[0]) return;
    const touch = e.touches[0];
    const newTime = calculateTimeFromClientX(touch.clientX);
    setIsScrubbing(true);
    setScrubTime(newTime);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isScrubbing || !e.touches[0]) return;
    const touch = e.touches[0];
    const newTime = calculateTimeFromClientX(touch.clientX);
    setScrubTime(newTime);
  };

  const handleTouchEnd = () => {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    onSeek(scrubTime);
  };

  // Global safety listener in case pointer capture is dropped
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
        onSeek(scrubTime);
      }
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isScrubbing, scrubTime, onSeek]);

  // Track component
  const trackElement = (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseLeave={() => setHoverTime(null)}
      className={`relative w-full cursor-pointer group touch-none select-none flex items-center ${
        layout === 'minimal'
          ? 'h-4 -top-2 py-0 pt-[7px]'
          : layout === 'inline'
          ? 'py-2.5 h-7'
          : 'py-3'
      }`}
      style={layout === 'minimal' ? { paddingTop: '7px' } : undefined}
      role="slider"
      aria-label="Audio progress slider"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={activeTime}
      aria-valuetext={`${formatTime(activeTime)} of ${formatTime(duration)}`}
    >
      {/* Track Line: Sleek 3px to 4px resting, subtly expanding to 5px–6px on interaction */}
      <div
        className={`w-full bg-white/20 rounded-full overflow-hidden relative transition-all duration-150 ${
          isScrubbing
            ? 'h-[5px] bg-white/30'
            : layout === 'minimal'
            ? 'h-[2.5px] group-hover:h-[4px]'
            : 'h-[3.5px] group-hover:h-[5px]'
        }`}
      >
        {/* Progress Fill */}
        <div
          className={`h-full rounded-full transition-[width] ease-out ${
            isScrubbing ? 'duration-0' : 'duration-100'
          } ${
            accentColor === 'rose'
              ? 'bg-rose-500'
              : 'bg-white group-hover:bg-rose-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Scrubber Thumb / Handle: Circular thumb with active glow ring */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-white shadow-lg pointer-events-none transition-transform duration-150 ${
          layout === 'minimal' ? 'w-3 h-3' : 'w-3.5 h-3.5'
        } ${
          isScrubbing
            ? 'scale-125 ring-4 ring-white/25 shadow-rose-500/40'
            : 'scale-0 group-hover:scale-100 group-active:scale-125'
        }`}
        style={{ left: `${progressPercent}%` }}
      />

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
            className={`text-[10px] font-mono tabular-nums w-8 text-right shrink-0 transition-colors ${
              isScrubbing ? 'text-rose-400 font-semibold' : 'text-zinc-400'
            }`}
          >
            {formatTime(activeTime)}
          </span>
        )}
        <div className="flex-1">{trackElement}</div>
        {showTimestamps && (
          <span className="text-[10px] text-zinc-400 font-mono tabular-nums w-8 shrink-0">
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
        <div className="flex justify-between items-center text-xs font-mono text-zinc-400 mt-1 select-none tabular-nums">
          <span
            className={`transition-colors ${
              isScrubbing ? 'text-rose-400 font-semibold scale-105' : 'text-zinc-400'
            }`}
          >
            {formatTime(activeTime)}
          </span>
          <span className="text-zinc-400">{formatTime(duration)}</span>
        </div>
      )}
    </div>
  );
};
