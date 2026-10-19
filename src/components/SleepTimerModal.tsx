import React, { useState, useEffect } from 'react';
import { Timer, X, Play, Volume2 } from 'lucide-react';
import { ModalBackdrop } from './ModalBackdrop';
import type { SleepTimerState } from '../types';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sleepTimer: SleepTimerState;
  onStartTimer: (minutes: number, fadeOut: boolean) => void;
  onCancelTimer: () => void;
  onExtendTimer: (minutes: number) => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  sleepTimer,
  onStartTimer,
  onCancelTimer,
  onExtendTimer,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('');
  const fadeOut = true;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const presets = [15, 30, 45, 60];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMinutesInput, 10);
    if (!isNaN(val) && val > 0 && val <= 480) {
      onStartTimer(val, fadeOut);
      onClose();
    }
  };

  const handleStartPreset = (mins: number) => {
    onStartTimer(mins, fadeOut);
    onClose();
  };

  const formatRemaining = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = sleepTimer.initialSeconds > 0
    ? Math.max(0, Math.min(100, ((sleepTimer.initialSeconds - sleepTimer.remainingSeconds) / sleepTimer.initialSeconds) * 100))
    : 0;

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-sm bg-[#0a0a0a]"
      aria-labelledby="sleep-timer-title"
    >
      {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
              <Timer size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="sleep-timer-title" className="text-white font-semibold text-base tracking-tight leading-tight">
                  Sleep & Play Timer
                </h2>
                {sleepTimer.isActive && (
                  <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/15 leading-none">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close sleep timer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {sleepTimer.isActive ? (
            /* Active Timer State */
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4.5 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  Playback stopping in
                </span>
                <span className="text-zinc-400 font-mono text-[11px] tabular-nums">
                  {sleepTimer.fadeOutEnabled && sleepTimer.remainingSeconds <= 60 ? (
                    <span className="text-zinc-200 font-medium flex items-center gap-1">
                      <Volume2 size={12} className="text-white" /> Fading out
                    </span>
                  ) : (
                    sleepTimer.fadeOutEnabled ? 'Fade enabled' : 'Instant cut'
                  )}
                </span>
              </div>

              {/* Remaining Countdown Display */}
              <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white py-1 text-center tabular-nums">
                {formatRemaining(sleepTimer.remainingSeconds)}
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-300" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onExtendTimer(5)}
                  className="flex-1 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 rounded-xl transition-colors cursor-pointer text-center"
                >
                  +5 min
                </button>
                <button
                  type="button"
                  onClick={() => onExtendTimer(15)}
                  className="flex-1 py-2 text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 rounded-xl transition-colors cursor-pointer text-center"
                >
                  +15 min
                </button>
                <button
                  type="button"
                  onClick={onCancelTimer}
                  className="py-2 px-3.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel Timer
                </button>
              </div>
            </div>
          ) : (
            /* Setup State */
            <div className="space-y-3.5">
              {/* Presets Grid without label */}
              <div className="grid grid-cols-4 gap-2">
                {presets.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setSelectedMinutes(mins);
                      setCustomMinutesInput('');
                    }}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer text-center ${
                      selectedMinutes === mins && !customMinutesInput
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              {/* Compact Custom Minutes Input without label */}
              <form onSubmit={handleCustomSubmit} className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={customMinutesInput}
                  onChange={(e) => {
                    setCustomMinutesInput(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      setSelectedMinutes(val);
                    }
                  }}
                  placeholder="Custom minutes (e.g. 25)..."
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  disabled={!customMinutesInput}
                  className="py-2.5 px-4 bg-white/5 hover:bg-white/10 disabled:opacity-40 text-zinc-200 text-xs font-medium rounded-xl border border-white/10 transition-colors cursor-pointer shrink-0"
                >
                  Set Custom
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 pt-3 flex items-center gap-3 border-t border-white/5">
          {!sleepTimer.isActive ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStartPreset(selectedMinutes)}
                className="flex-1 h-10 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Play size={14} className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Start</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              Keep Running & Close
            </button>
          )}
        </div>
    </ModalBackdrop>
  );
};
