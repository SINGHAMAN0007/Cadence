import React, { useEffect } from 'react';
import { X, Music, Sparkles, ExternalLink, ShieldCheck, Heart } from 'lucide-react';
import { AppLogo } from './AppLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LinkedInIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m1.39 9.74v-8.37H5.07v8.37h2.78z" />
  </svg>
);

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-dialog-title"
    >
      <div
        className="relative bg-[#0a0a0a] border border-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-32 bg-rose-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Close About Dialog"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-4 relative">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-lg shadow-red-500/20 ring-1 ring-white/10">
            <AppLogo className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="about-dialog-title" className="text-lg font-bold text-white tracking-tight">
                Cadence Music
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/25 font-semibold">
                v1.0.0 • Offline-First PWA
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Native High-Fidelity Audio Experience
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
          Cadence Music is an offline-first, native-style Progressive Web App crafted for high-fidelity audio playback. Built with IndexedDB local storage, real-time waveform visualizers, AI-assisted genre categorization, and seamless background song recognition.
        </p>

        {/* Feature Highlights */}
        <div className="space-y-2 mb-5">
          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Key Highlights
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-200">
              <span className="text-base shrink-0">⚡</span>
              <span className="leading-tight">Offline Local Storage & Zero Data Consumption</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-200">
              <span className="text-base shrink-0">🧠</span>
              <span className="leading-tight">AI-Powered Smart Categorization</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-200">
              <span className="text-base shrink-0">🎙️</span>
              <span className="leading-tight">Background Song Recognition via YouTube Music</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-zinc-200">
              <span className="text-base shrink-0">📊</span>
              <span className="leading-tight">Dynamic Audio Spectrum Visualizer</span>
            </div>
          </div>
        </div>

        {/* Creator & Social Credentials */}
        <div className="pt-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-medium text-zinc-300">
              Developed by Aman Singh Kushwaha
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
              <ShieldCheck size={13} className="text-emerald-400" />
              Verified Author
            </span>
          </div>

          <a
            href="https://www.linkedin.com/in/aman-singh-kushwaha-92b752426/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 border border-[#0A66C2]/40 text-[#0A66C2] hover:text-white font-medium transition-all text-sm mt-3 group cursor-pointer shadow-sm hover:shadow-[#0A66C2]/20 hover:scale-[1.01] active:scale-[0.99]"
          >
            <LinkedInIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
            <span>Connect on LinkedIn</span>
            <ExternalLink size={13} className="opacity-70 group-hover:opacity-100 transition-opacity ml-0.5" />
          </a>
        </div>

        {/* Bottom Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full py-2 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white font-medium text-xs border border-white/[0.08] transition-colors cursor-pointer text-center"
        >
          Close
        </button>
      </div>
    </div>
  );
};
