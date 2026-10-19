import React from 'react';
import { 
  Music, Heart, Plus, ListMusic, Trash2, Edit3, 
  Sparkles, Radio, X, Compass, Library, Folder,
  Timer, Cloud, User, Users, ShieldCheck, Info
} from 'lucide-react';
import type { Playlist, SleepTimerState } from '../types';
import type { PlaybackSessionData } from '../services/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { AudioVisualizer } from './AudioVisualizer';
import { SidebarSpectrum } from './SidebarSpectrum';
import { AppLogo } from './AppLogo';

interface SidebarProps {
  currentView: 'library' | 'favorites' | { playlistId: number };
  onSelectView: (view: 'library' | 'favorites' | { playlistId: number }) => void;
  trackCount: number;
  favoritesCount: number;
  playlists: Playlist[];
  onCreatePlaylist: () => void;
  onEditPlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlistId: number) => void;
  onDropTrackToPlaylist: (trackId: number, playlistId: number) => void;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  onLoadDemoTracks?: () => void;
  isLoadingDemo?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenIdentifyModal?: () => void;
  onOpenQueue?: () => void;
  onOpenSleepTimer?: () => void;
  queueCount?: number;
  sleepTimer?: SleepTimerState;
  currentUser?: FirebaseUser | null;
  onOpenAccountModal?: () => void;
  onOpenListenTogether?: () => void;
  activeSession?: PlaybackSessionData | null;
  onOpenAbout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  trackCount,
  favoritesCount,
  playlists,
  onCreatePlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onDropTrackToPlaylist,
  analyser,
  isPlaying,
  onLoadDemoTracks,
  isLoadingDemo,
  isMobileOpen = false,
  onCloseMobile,
  onOpenIdentifyModal,
  onOpenQueue,
  onOpenSleepTimer,
  queueCount = 0,
  sleepTimer,
  currentUser = null,
  onOpenAccountModal,
  onOpenListenTogether,
  activeSession = null,
  onOpenAbout,
}) => {
  const [dragOverPlaylistId, setDragOverPlaylistId] = React.useState<number | null>(null);

  const isViewActive = (view: 'library' | 'favorites' | number) => {
    if (typeof view === 'number') {
      return typeof currentView === 'object' && currentView.playlistId === view;
    }
    return currentView === view;
  };

  const handleDragOver = (e: React.DragEvent, playlistId: number) => {
    e.preventDefault();
    setDragOverPlaylistId(playlistId);
  };

  const handleDragLeave = () => {
    setDragOverPlaylistId(null);
  };

  const handleDrop = (e: React.DragEvent, playlistId: number) => {
    e.preventDefault();
    setDragOverPlaylistId(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data && data.trackId) {
        onDropTrackToPlaylist(data.trackId, playlistId);
      }
    } catch (err) {
      console.warn('Drop error:', err);
    }
  };

  React.useEffect(() => {
    if (isMobileOpen) {
      document.body.classList.add('overflow-hidden');
      return () => {
        document.body.classList.remove('overflow-hidden');
      };
    }
  }, [isMobileOpen]);

  const handleViewClick = (view: 'library' | 'favorites' | { playlistId: number }) => {
    onSelectView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-full select-none overflow-hidden">
      {/* Pinned Top: Brand Header */}
      <div className="px-4 pb-2 pt-5 sm:pt-6 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo className="w-10 h-10" />
            <div className="flex flex-col min-w-0">
              <h1 className="font-bold text-white text-lg tracking-tight leading-tight">
                Cadence Music
              </h1>
              <p className="text-[11px] font-normal tracking-wide text-zinc-500 leading-tight">
                amanwasserene
              </p>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Middle Smoothly Scrollable Container */}
      <div className="flex-1 overflow-y-auto overscroll-contain pr-1 space-y-4 px-3 py-1">
        {/* A. ACCOUNT CARD (Top) */}
        <div>
          <button
            onClick={() => {
              if (onOpenAccountModal) onOpenAccountModal();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between text-left transition-all group cursor-pointer"
            title={currentUser ? "View Cloud Account & Sync" : "Sign In / Offline Account"}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'User'} 
                  className="w-7 h-7 rounded-full ring-1 ring-white/15 object-cover shrink-0" 
                />
              ) : currentUser ? (
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white font-medium text-xs shrink-0">
                  {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white shrink-0 transition-colors">
                  <User size={13} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-white truncate flex items-center gap-1">
                  {currentUser ? (currentUser.displayName || currentUser.email?.split('@')[0] || 'Cloud User') : 'Guest Account'}
                  {currentUser && <ShieldCheck size={12} className="text-zinc-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {currentUser?.email || 'Tap to sign in & sync'}
                </div>
              </div>
            </div>
            <div className="shrink-0 pl-1.5">
              <Cloud size={14} className={currentUser ? "text-zinc-300" : "text-zinc-500 group-hover:text-zinc-300"} />
            </div>
          </button>
        </div>

        {/* B. LIBRARY (Core Audio Navigation) */}
        <div>
          <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 tracking-wider uppercase mb-1">
            Library
          </div>
          <div className="space-y-1">
            <button
              onClick={() => handleViewClick('library')}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] transition-colors cursor-pointer ${
                isViewActive('library')
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Music size={16} className={isViewActive('library') ? 'text-white' : 'text-zinc-400'} />
                <span>Songs</span>
              </span>
            </button>

            <button
              onClick={() => handleViewClick('favorites')}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] transition-colors cursor-pointer ${
                isViewActive('favorites')
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Heart size={16} className={isViewActive('favorites') ? 'text-white' : 'text-zinc-400'} fill={isViewActive('favorites') ? 'currentColor' : 'none'} />
                <span>Favorites</span>
              </span>
            </button>

            {/* Queue (Up Next) */}
            <button
              onClick={() => {
                if (onOpenQueue) onOpenQueue();
                if (onCloseMobile) onCloseMobile();
              }}
              className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] transition-colors text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] cursor-pointer group"
            >
              <span className="flex items-center gap-2.5">
                <ListMusic size={16} className="text-zinc-400 group-hover:text-white transition-colors" />
                <span>Queue</span>
              </span>
              {queueCount > 0 && (
                <span className="text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full min-w-4 text-center">
                  {queueCount}
                </span>
              )}
            </button>

            {/* Sleep Timer */}
            <button
              onClick={() => {
                if (onOpenSleepTimer) onOpenSleepTimer();
                if (onCloseMobile) onCloseMobile();
              }}
              className={`flex items-center justify-between w-full px-3 py-2 text-[13px] transition-colors cursor-pointer group ${
                sleepTimer?.isActive
                  ? 'bg-white/10 text-white font-medium border border-white/10 rounded-xl'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] rounded-lg'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Timer size={16} className={sleepTimer?.isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white transition-colors'} />
                <span className={sleepTimer?.isActive ? 'text-white font-medium' : ''}>Sleep Timer</span>
              </span>
              {sleepTimer?.isActive && (
                <span className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-bold tracking-tight shadow-sm font-mono tabular-nums">
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  {Math.ceil(sleepTimer.remainingSeconds / 60)}m
                </span>
              )}
            </button>
          </div>
        </div>

        {/* C. PLAYLISTS (Collapsible / Clean List) */}
        <div className="mt-5">
          <div className="flex items-center justify-between px-3 py-1 mb-1">
            <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
              Playlists
            </span>
            <button
              onClick={() => {
                onCreatePlaylist();
                if (onCloseMobile) onCloseMobile();
              }}
              className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Create Playlist"
              aria-label="Create Playlist"
            >
              <Plus size={15} />
            </button>
          </div>

          <div className="space-y-0.5">
            {playlists.length === 0 ? (
              <button
                onClick={() => {
                  onCreatePlaylist();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs border border-dashed border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                <Plus size={14} />
                <span>New Playlist</span>
              </button>
            ) : (
              playlists.map((pl) => {
                const active = isViewActive(pl.id);
                const isDragOver = dragOverPlaylistId === pl.id;

                return (
                  <div
                    key={pl.id}
                    onDragOver={(e) => handleDragOver(e, pl.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, pl.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all ${
                      isDragOver
                        ? 'bg-rose-500/20 ring-1 ring-rose-500/50 text-white'
                        : active
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <button
                      onClick={() => handleViewClick({ playlistId: pl.id })}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-1 ring-white/10"
                        style={{ backgroundColor: pl.coverColor || '#fa2d48' }}
                      />
                      <span className="truncate">{pl.name}</span>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] font-mono text-zinc-500 tabular-nums ${active ? 'hidden' : 'group-hover:hidden'}`}>
                        {pl.trackIds.length}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onEditPlaylist(pl);
                        }}
                        className={`p-1 text-zinc-400 hover:text-zinc-200 cursor-pointer ${active ? 'flex' : 'flex md:hidden md:group-hover:flex'}`}
                        title="Edit playlist"
                        aria-label={`Edit ${pl.name}`}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onDeletePlaylist(pl.id);
                        }}
                        className={`p-1 text-zinc-400 hover:text-rose-400 cursor-pointer ${active ? 'flex' : 'flex md:hidden md:group-hover:flex'}`}
                        title="Delete playlist"
                        aria-label={`Delete ${pl.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* D. FEATURES & INFO (Bottom Section Divider) */}
        <div className="border-t border-white/5 my-2 pt-2">
          <div className="px-3 py-1 text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
            Discover & Tools
          </div>
          <div className="space-y-0.5">
            {onOpenIdentifyModal && (
              <button
                onClick={() => {
                  onOpenIdentifyModal();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors group cursor-pointer text-left"
                title="Identify song playing nearby with YouTube Music and Spotify"
              >
                <Radio size={16} className="text-zinc-400 group-hover:text-white transition-colors shrink-0" />
                <span>Identify Song</span>
              </button>
            )}

            {onOpenListenTogether && (
              <button
                onClick={() => {
                  onOpenListenTogether();
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] transition-colors cursor-pointer group text-left ${
                  activeSession
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Users size={16} className={activeSession ? 'text-white' : 'text-zinc-400 group-hover:text-white transition-colors shrink-0'} />
                <span>Listen Together</span>
              </button>
            )}

            {onOpenAbout && (
              <button
                onClick={() => {
                  onOpenAbout();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-zinc-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer group text-left"
              >
                <Info size={16} className="text-zinc-400 group-hover:text-rose-400 transition-colors shrink-0" />
                <span>About Cadence</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Spectrum Box at Sidebar Bottom */}
      <SidebarSpectrum analyser={analyser} isPlaying={isPlaying} />
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (>= md) */}
      <aside className="hidden md:flex w-64 bg-black border-r border-white/5 flex-col shrink-0 select-none h-full z-20 overflow-hidden">
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet Offcanvas Drawer (< md) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-xl z-40 transition-opacity duration-300"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-72 sm:w-80 bg-black border-r border-white/5 flex flex-col shadow-2xl z-50 animate-in slide-in-from-left duration-200 overflow-hidden">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
