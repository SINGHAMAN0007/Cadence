import React, { useEffect } from 'react';
import { 
  X, ExternalLink, ShieldCheck, 
  HardDrive, Activity, Users, Radio 
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { ModalBackdrop } from './ModalBackdrop';

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
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md sm:max-w-lg max-h-[90vh] flex flex-col"
      aria-labelledby="about-dialog-title"
    >
      {/* Fixed Sticky Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 sticky top-0 bg-[#0a0a0a] z-20 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <AppLogo className="w-10 h-10 rounded-xl shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 id="about-dialog-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Cadence Music
                </h2>
                <span className="text-[11px] font-mono text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 truncate">
                A lightweight, ad-free player made for your local music.
              </p>
            </div>
          </div>

          {/* Close (X) Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close About Dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {/* Humanized Description */}
          <p className="text-xs text-zinc-400 leading-relaxed">
            Cadence was built to bring back the simplicity of playing downloaded music without ads, tracking, or network requirements. Your files stay entirely on your device, load instantly through offline caching, and play with real-time audio visualization.
          </p>

          {/* Key Highlights Grid */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Key Highlights
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Card 1: 100% Offline Playback */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-start gap-3 text-left">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-400 mt-0.5">
                  <HardDrive size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white">
                    100% Offline Playback
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    Music stays stored locally in your browser storage. Zero data needed.
                  </div>
                </div>
              </div>

              {/* Card 2: Real-Time Visualizer */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-start gap-3 text-left">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-400 mt-0.5">
                  <Activity size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white">
                    Real-Time Visualizer
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    Live audio spectrum rendered cleanly at 60 FPS.
                  </div>
                </div>
              </div>

              {/* Card 3: Listen Together */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-start gap-3 text-left">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-400 mt-0.5">
                  <Users size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white">
                    Listen Together
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    Room sync to listen along with friends in real time.
                  </div>
                </div>
              </div>

              {/* Card 4: Song Identification */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-start gap-3 text-left">
                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-400 mt-0.5">
                  <Radio size={14} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white">
                    Song Identification
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                    Quickly detect songs and jump straight to Spotify or YouTube Music.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Author Row */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs text-zinc-400">
            <span className="font-medium text-zinc-300">
              Developed by Aman Singh Kushwaha
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
              <ShieldCheck size={13} className="text-zinc-400" />
              Verified Author
            </span>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 border-t border-white/5 bg-[#0a0a0a] flex flex-col gap-2.5 shrink-0">
          <a
            href="https://www.linkedin.com/in/aman-singh-kushwaha-92b752426/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all text-xs group cursor-pointer"
          >
            <LinkedInIcon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110 text-zinc-300 group-hover:text-white" />
            <span>Connect on LinkedIn</span>
            <ExternalLink size={13} className="opacity-70 group-hover:opacity-100 transition-opacity ml-0.5 text-zinc-400" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-white/5 text-zinc-400 hover:text-white font-medium text-xs border border-white/10 transition-colors cursor-pointer text-center"
          >
            Close
          </button>
        </div>
    </ModalBackdrop>
  );
};
