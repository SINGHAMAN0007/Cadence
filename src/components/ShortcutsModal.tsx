import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { ModalBackdrop } from './ModalBackdrop';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause playback' },
    { key: '← / →', desc: 'Seek 5 seconds backward / forward' },
    { key: 'Shift + ← / →', desc: 'Seek 15 seconds backward / forward' },
    { key: '↑ / ↓', desc: 'Increase / decrease volume by 5%' },
    { key: 'M', desc: 'Toggle audio mute' },
    { key: 'L', desc: 'Cycle loop mode (Off → All → One)' },
    { key: 'S', desc: 'Toggle shuffle playback' },
    { key: 'F', desc: 'Toggle fullscreen immersive visualizer' },
    { key: 'Y', desc: 'Open synchronized lyrics (ID3 USLT)' },
    { key: 'Q', desc: 'Toggle Up Next queue drawer' },
    { key: 'I', desc: 'Identify song playing nearby (YT Music & Spotify)' },
    { key: 'T', desc: 'Open sleep & play timer' },
    { key: 'Esc', desc: 'Close open dialogs and drawers' },
  ];

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md bg-[#0a0a0a] p-6 text-zinc-100"
    >
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-rose-500">
              <Keyboard size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Keyboard Shortcuts</h2>
              <p className="text-xs text-zinc-400">Quick keys for rapid audio control</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-1.5 text-xs max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
              <span className="text-zinc-300">{sc.desc}</span>
              <kbd className="px-2 py-1 bg-white/[0.08] border border-white/10 rounded-lg text-[11px] font-mono text-white shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 rounded-full transition-colors"
          >
            Done
          </button>
        </div>
    </ModalBackdrop>
  );
};
