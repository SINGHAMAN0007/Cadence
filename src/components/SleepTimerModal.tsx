import React, { useState } from 'react';
import { Timer, X, Play, Volume2, AlertCircle } from 'lucide-react';
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
  const [fadeOut, setFadeOut] = useState<boolean>(true);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-6 text-zinc-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-rose-500">
              <Timer size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Sleep & Play Timer</h2>
              <p className="text-xs text-zinc-400">Automatically stop playback and fade audio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close sleep timer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Active Timer Status */}
        {sleepTimer.isActive ? (
          <div className="my-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-rose-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Active Sleep Timer
              </span>
              <span className="text-xs text-zinc-400 font-mono tabular-nums">
                {sleepTimer.fadeOutEnabled && sleepTimer.remainingSeconds <= 60 ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Volume2 size={12} /> Fading out...
                  </span>
                ) : (
                  sleepTimer.fadeOutEnabled ? 'Fade enabled' : 'Instant cut'
                )}
              </span>
            </div>

            <div className="text-3xl font-bold font-mono tracking-tight text-white mb-3 text-center tabular-nums">
              {formatRemaining(sleepTimer.remainingSeconds)}
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-rose-500 transition-all duration-300" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExtendTimer(5)}
                className="flex-1 py-1.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-full transition-colors"
              >
                +5 min
              </button>
              <button
                onClick={() => onExtendTimer(15)}
                className="flex-1 py-1.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-full transition-colors"
              >
                +15 min
              </button>
              <button
                onClick={onCancelTimer}
                className="py-1.5 px-3.5 text-xs font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-full transition-colors"
              >
                Cancel Timer
              </button>
            </div>
          </div>
        ) : (
          <div className="my-5 space-y-4">
            {/* Presets Grid */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2">Preset Durations</label>
              <div className="grid grid-cols-4 gap-2">
                {presets.map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSelectedMinutes(mins)}
                    className={`py-2 px-3 rounded-full text-xs font-medium transition-all ${
                      selectedMinutes === mins
                        ? 'bg-rose-500 text-white shadow-md ring-1 ring-white/20'
                        : 'bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/10'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Minutes */}
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2">Or Custom Duration (minutes)</label>
              <form onSubmit={handleCustomSubmit} className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={customMinutesInput}
                  onChange={(e) => setCustomMinutesInput(e.target.value)}
                  placeholder="e.g. 20, 90..."
                  className="flex-1 bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
                <button
                  type="submit"
                  disabled={!customMinutesInput}
                  className="px-4 py-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-xs font-medium rounded-full border border-white/10 transition-colors"
                >
                  Set Custom
                </button>
              </form>
            </div>

            {/* Fade Out Toggle */}
            <div className="p-3 bg-white/[0.04] rounded-xl border border-white/10 flex items-center justify-between">
              <div className="flex items-start gap-2.5">
                <Volume2 size={16} className="text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-zinc-200">Fade out audio</div>
                  <div className="text-[11px] text-zinc-400">Gradually lower volume over the final 60 seconds</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={fadeOut}
                  onChange={(e) => setFadeOut(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        {!sleepTimer.isActive ? (
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleStartPreset(selectedMinutes)}
              className="px-5 py-2 text-xs font-medium text-white bg-rose-500 hover:bg-rose-400 rounded-full shadow-md shadow-rose-500/30 transition-colors flex items-center gap-1.5"
            >
              <Play size={13} fill="currentColor" /> Start {selectedMinutes}m Timer
            </button>
          </div>
        ) : (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 rounded-full transition-colors"
            >
              Keep Running & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
