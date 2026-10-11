import React from 'react';
import { Music, Heart, Folder, Timer, Radio } from 'lucide-react';
import type { SleepTimerState } from '../types';

interface MobileBottomNavProps {
  currentView: 'library' | 'favorites' | 'recent' | { playlistId: number };
  onSelectView: (view: 'library' | 'favorites' | 'recent' | { playlistId: number }) => void;
  onOpenPlaylistsDrawer: () => void;
  onOpenSleepTimer: () => void;
  onOpenQueue?: () => void;
  onOpenIdentifyModal?: () => void;
  sleepTimer: SleepTimerState;
  queueCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  onOpenPlaylistsDrawer,
  onOpenSleepTimer,
  onOpenIdentifyModal,
  sleepTimer,
}) => {
  const isLibrary = currentView === 'library' || currentView === 'recent';
  const isFavorites = currentView === 'favorites';
  const isPlaylist = typeof currentView === 'object';

  return (
    <nav className="sm:hidden h-[calc(3.75rem+env(safe-area-inset-bottom,16px))] pb-[env(safe-area-inset-bottom,16px)] bg-black border-t border-neutral-900/80 px-3 flex items-center justify-around z-30 select-none shrink-0 backdrop-blur-2xl touch-manipulation">
      {/* Library (>= 48x48 tap target) */}
      <button
        onClick={() => onSelectView('library')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-xl active:bg-white/10 transition-colors ${
          isLibrary ? 'text-rose-500 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        aria-label="Library"
      >
        <Music size={19} />
        <span className="text-[10px] mt-0.5 tracking-tight">Library</span>
      </button>

      {/* Favorites (>= 48x48 tap target) */}
      <button
        onClick={() => onSelectView('favorites')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-xl active:bg-white/10 transition-colors ${
          isFavorites ? 'text-rose-500 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        aria-label="Favorites"
      >
        <Heart size={19} fill={isFavorites ? 'currentColor' : 'none'} />
        <span className="text-[10px] mt-0.5 tracking-tight">Favorites</span>
      </button>

      {/* Playlists (>= 48x48 tap target) */}
      <button
        onClick={onOpenPlaylistsDrawer}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-xl active:bg-white/10 transition-colors ${
          isPlaylist ? 'text-rose-500 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        aria-label="Playlists"
      >
        <Folder size={19} />
        <span className="text-[10px] mt-0.5 tracking-tight">Playlists</span>
      </button>

      {/* Identify Song (>= 48x48 tap target) */}
      {onOpenIdentifyModal && (
        <button
          onClick={onOpenIdentifyModal}
          className="flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-xl active:bg-white/10 transition-colors text-rose-400 hover:text-rose-300 relative"
          aria-label="Identify Song"
        >
          <Radio size={19} className="animate-pulse" />
          <span className="text-[10px] mt-0.5 tracking-tight font-medium text-rose-300">Identify</span>
        </button>
      )}

      {/* Sleep Timer (>= 48x48 tap target) */}
      <button
        onClick={onOpenSleepTimer}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-2 rounded-xl active:bg-white/10 transition-colors relative ${
          sleepTimer.isActive ? 'text-rose-500 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
        }`}
        aria-label="Sleep Timer"
      >
        <Timer size={19} />
        {sleepTimer.isActive && (
          <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        )}
        <span className="text-[10px] mt-0.5 tracking-tight">Timer</span>
      </button>
    </nav>
  );
};
