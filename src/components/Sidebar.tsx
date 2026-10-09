import React from 'react';
import { 
  Music, Heart, Plus, ListMusic, Trash2, Edit3, 
  Sparkles, Radio, Disc, X, Compass, Library, Folder
} from 'lucide-react';
import type { Playlist, VisualizerMode } from '../types';
import { AudioVisualizer } from './AudioVisualizer';

interface SidebarProps {
  currentView: 'library' | 'favorites' | 'recent' | { playlistId: number };
  onSelectView: (view: 'library' | 'favorites' | 'recent' | { playlistId: number }) => void;
  trackCount: number;
  favoritesCount: number;
  playlists: Playlist[];
  onCreatePlaylist: () => void;
  onEditPlaylist: (playlist: Playlist) => void;
  onDeletePlaylist: (playlistId: number) => void;
  onDropTrackToPlaylist: (trackId: number, playlistId: number) => void;
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  visualizerMode: VisualizerMode;
  onLoadDemoTracks: () => void;
  isLoadingDemo: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
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
  visualizerMode,
  onLoadDemoTracks,
  isLoadingDemo,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [dragOverPlaylistId, setDragOverPlaylistId] = React.useState<number | null>(null);

  const isViewActive = (view: 'library' | 'favorites' | 'recent' | number) => {
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

  const handleViewClick = (view: 'library' | 'favorites' | 'recent' | { playlistId: number }) => {
    onSelectView(view);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-full select-none">
      {/* macOS Window dots & Brand */}
      <div className="p-5 pb-3">
        {/* macOS traffic light window dots (desktop decoration) */}
        <div className="hidden lg:flex items-center gap-2 mb-4">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/50" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/50" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/50" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Music size={17} />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                Music
              </h1>
              <p className="text-[10px] text-zinc-400">amanwasserene</p>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Section: LIBRARY */}
      <div className="px-3 mt-3">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
          Library
        </div>
        <div className="space-y-1">
          <button
            onClick={() => handleViewClick('library')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] transition-colors ${
              isViewActive('library')
                ? 'bg-white/10 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Music size={16} className={isViewActive('library') ? 'text-white' : 'text-zinc-400'} />
              <span>Songs</span>
            </span>
            <span className="text-[11px] font-mono tabular-nums text-zinc-400/80">{trackCount}</span>
          </button>

          <button
            onClick={() => handleViewClick('favorites')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] transition-colors ${
              isViewActive('favorites')
                ? 'bg-white/10 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Heart size={16} className={isViewActive('favorites') ? 'text-white' : 'text-zinc-400'} fill={isViewActive('favorites') ? 'currentColor' : 'none'} />
              <span>Favorites</span>
            </span>
            <span className="text-[11px] font-mono tabular-nums text-zinc-400/80">{favoritesCount}</span>
          </button>

          <button
            onClick={() => handleViewClick('recent')}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] transition-colors ${
              isViewActive('recent')
                ? 'bg-white/10 text-white font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Disc size={16} className={isViewActive('recent') ? 'text-white' : 'text-zinc-400'} />
              <span>Recently Added</span>
            </span>
          </button>
        </div>
      </div>

      {/* Navigation Section: PLAYLISTS */}
      <div className="flex-1 overflow-y-auto px-3 mt-6">
        <div className="flex items-center justify-between px-3 py-1.5 mb-1">
          <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
            Playlists
          </span>
          <button
            onClick={() => {
              onCreatePlaylist();
              if (onCloseMobile) onCloseMobile();
            }}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
            title="Create Playlist"
            aria-label="Create Playlist"
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="space-y-1">
          {playlists.length === 0 ? (
            <div className="p-3 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] text-[11px] text-zinc-400 mx-1">
              <p>No playlists yet</p>
              <button
                onClick={() => {
                  onCreatePlaylist();
                  if (onCloseMobile) onCloseMobile();
                }}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-medium border border-white/10 transition-all"
              >
                + New Playlist
              </button>
            </div>
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
                  className={`group flex items-center justify-between px-3 py-1.5 rounded-lg text-[13px] transition-all ${
                    isDragOver
                      ? 'bg-rose-500/20 ring-1 ring-rose-500/50 text-white'
                      : active
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <button
                    onClick={() => handleViewClick({ playlistId: pl.id })}
                    className="flex items-center gap-2.5 min-w-0 flex-1 text-left py-0.5"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-1 ring-white/10"
                      style={{ backgroundColor: pl.coverColor || '#fa2d48' }}
                    />
                    <span className="truncate">{pl.name}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-zinc-500 tabular-nums group-hover:hidden">
                      {pl.trackIds.length}
                    </span>
                    <button
                      onClick={() => onEditPlaylist(pl)}
                      className="hidden group-hover:flex p-1 text-zinc-400 hover:text-zinc-200"
                      title="Edit playlist"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      onClick={() => onDeletePlaylist(pl.id)}
                      className="hidden group-hover:flex p-1 text-zinc-400 hover:text-rose-400"
                      title="Delete playlist"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Apple-style Demo Sample helper */}
        {trackCount < 5 && (
          <div className="mt-5 p-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-center mx-1 backdrop-blur-md">
            <div className="flex items-center justify-center text-rose-400 mb-1">
              <Sparkles size={15} />
            </div>
            <p className="text-[11px] text-zinc-200 font-medium">Sample Audio Available</p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Load 3 royalty-free tracks synthesized via Web Audio.
            </p>
            <button
              onClick={() => {
                onLoadDemoTracks();
                if (onCloseMobile) onCloseMobile();
              }}
              disabled={isLoadingDemo}
              className="mt-2.5 w-full py-1.5 px-3 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-medium transition-all disabled:opacity-50"
            >
              {isLoadingDemo ? 'Synthesizing...' : 'Load Demo Tracks'}
            </button>
          </div>
        )}
      </div>

      {/* Mini Visualizer Dock at Sidebar Bottom */}
      <div className="p-3 border-t border-white/[0.08] bg-black/30 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-medium text-zinc-500 mb-1.5 px-1 uppercase tracking-wider">
          <span>Spectrum</span>
          <span className={isPlaying ? 'text-rose-400 font-semibold' : ''}>
            {isPlaying ? 'Playing' : 'Paused'}
          </span>
        </div>
        <div className="h-12 w-full bg-white/[0.02] border border-white/[0.08] rounded-lg overflow-hidden p-1 backdrop-blur-md">
          <AudioVisualizer
            analyser={analyser}
            isPlaying={isPlaying}
            mode={visualizerMode}
            className="w-full h-full"
            accentColor="#fa2d48"
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop macOS-style Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white/[0.02] backdrop-blur-2xl border-r border-white/[0.08] flex-col shrink-0 select-none h-full z-20">
        {sidebarContent}
      </aside>

      {/* Mobile/Tablet Offcanvas Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={onCloseMobile}
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0d0d0f]/95 backdrop-blur-2xl border-r border-white/[0.08] flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
