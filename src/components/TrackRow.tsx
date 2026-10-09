import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, MoreVertical, Heart, ListPlus, Trash2, 
  Info, Disc3, Music, Plus
} from 'lucide-react';
import type { Track, Playlist } from '../types';

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  onInspect: (track: Track) => void;
  onDelete: (track: Track) => void;
  playlists: Playlist[];
  onAddToPlaylist: (trackId: number, playlistId: number) => void;
  currentPlaylistId?: number | null;
  onRemoveFromPlaylist?: (trackId: number, playlistId: number) => void;
  isReorderable?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  onToggleFavorite,
  onAddToQueue,
  onInspect,
  onDelete,
  playlists,
  onAddToPlaylist,
  currentPlaylistId,
  onRemoveFromPlaylist,
  isReorderable,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playlistSubmenuOpen, setPlaylistSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setPlaylistSubmenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ trackId: track.id, index }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onPlay(track)}
      className={`group w-full max-w-full flex items-center justify-between px-3 py-2.5 overflow-hidden transition-colors duration-150 cursor-pointer text-sm rounded-xl ${
        isCurrent ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
      }`}
    >
      {/* Left side: Index/Play, Artwork, Title & Artist */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pr-2">
        {/* Index / Play action */}
        <div className="w-6 sm:w-8 text-zinc-400 text-center shrink-0 flex items-center justify-center">
          {isCurrent && isPlaying ? (
            <div className="flex items-end justify-center gap-[2px] w-3.5 h-3.5" title="Playing">
              <span className="w-[2px] bg-rose-500 rounded-full animate-pulse h-3.5" />
              <span className="w-[2px] bg-rose-500 rounded-full animate-pulse delay-100 h-2" />
              <span className="w-[2px] bg-rose-500 rounded-full animate-pulse delay-200 h-3" />
            </div>
          ) : (
            <span className="group-hover:hidden font-mono text-[11px] sm:text-xs tabular-nums text-zinc-400">
              {index + 1}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(track);
            }}
            className={`${isCurrent && isPlaying ? 'hidden' : 'hidden group-hover:flex'} p-1 text-zinc-200 hover:text-white transition-colors`}
          >
            {isCurrent && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          </button>
        </div>

        {/* Artwork */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-md ring-1 ring-white/10 bg-white/[0.04] overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
          {track.coverDataUrl ? (
            <img src={track.coverDataUrl} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <Music size={16} className={isCurrent ? 'text-rose-500' : 'text-zinc-500'} />
          )}
        </div>

        {/* Title and Artist with strict flex-1 min-w-0 and ellipsis */}
        <div className="flex-1 min-w-0 pr-2">
          <div 
            title={track.title}
            className={`truncate text-sm font-medium max-w-full block overflow-hidden whitespace-nowrap text-ellipsis ${
              isCurrent ? 'text-rose-500 font-semibold' : 'text-white'
            }`}
          >
            {track.title}
          </div>
          <div 
            title={track.artist}
            className="truncate text-xs text-zinc-400 max-w-full block overflow-hidden whitespace-nowrap text-ellipsis mt-0.5"
          >
            {track.artist}
          </div>
        </div>
      </div>

      {/* Album (hidden on smaller screens) */}
      <div 
        title={track.album}
        className="text-xs text-zinc-400 hidden md:block truncate max-w-[150px] shrink-0 px-3"
      >
        {track.album}
      </div>

      {/* Right-side actions: duration, heart, and three dots pinned to right edge */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {/* Duration */}
        <span className="text-[11px] sm:text-xs text-zinc-400 font-mono tabular-nums text-right w-12 sm:w-14">
          {formatDuration(track.duration)}
        </span>

        {/* Favorite Heart (always visible on mobile touch, hover on desktop) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(track);
          }}
          className={`p-1.5 rounded-md transition-colors ${
            track.isFavorite
              ? 'text-rose-500'
              : 'text-zinc-500 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:text-zinc-300'
          }`}
          title={track.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={14} fill={track.isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Up/Down buttons if reordering inside playlist */}
        {isReorderable && (
          <div className="hidden group-hover:flex items-center">
            <button
              type="button"
              disabled={isFirst}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 text-xs"
              title="Move Up"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 text-xs"
              title="Move Down"
            >
              ▼
            </button>
          </div>
        )}

        {/* Context Menu Button */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] rounded-md transition-colors"
          >
            <MoreVertical size={15} />
          </button>

          {/* Dropdown Menu (Apple macOS frosted glass popover) */}
          {menuOpen && (
            <div 
              className="absolute right-0 top-8 z-30 w-44 sm:w-48 bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1 text-left animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  onAddToQueue(track);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 rounded-lg flex items-center gap-2.5 transition-colors"
              >
                <ListPlus size={14} className="text-white" />
                Add to Queue
              </button>

              {/* Add to Playlist */}
              <div className="relative">
                <button
                  onClick={() => setPlaylistSubmenuOpen(!playlistSubmenuOpen)}
                  className="w-full px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 rounded-lg flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Plus size={14} className="text-white" />
                    Add to Playlist
                  </span>
                  <span className="text-[10px] text-zinc-500">›</span>
                </button>

                {playlistSubmenuOpen && (
                  <div className="absolute right-full top-0 mr-1 w-40 sm:w-44 bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1 max-h-48 overflow-y-auto">
                    {playlists.length === 0 ? (
                      <div className="px-3 py-2 text-[11px] text-zinc-500">
                        No playlists yet
                      </div>
                    ) : (
                      playlists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => {
                            onAddToPlaylist(track.id, pl.id);
                            setMenuOpen(false);
                            setPlaylistSubmenuOpen(false);
                          }}
                          className="w-full px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10 rounded-md text-left truncate transition-colors flex items-center gap-2"
                        >
                          <span 
                            className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/10" 
                            style={{ backgroundColor: pl.coverColor || '#fa2d48' }} 
                          />
                          <span className="truncate">{pl.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Remove from current playlist if viewing one */}
              {currentPlaylistId && onRemoveFromPlaylist && (
                <button
                  onClick={() => {
                    onRemoveFromPlaylist(track.id, currentPlaylistId);
                    setMenuOpen(false);
                  }}
                  className="w-full px-3 py-2 text-xs text-amber-400 hover:bg-white/10 rounded-lg flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 size={14} />
                  Remove from Playlist
                </button>
              )}

              <button
                onClick={() => {
                  onInspect(track);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 rounded-lg flex items-center gap-2.5 transition-colors"
              >
                <Info size={14} className="text-zinc-400" />
                Track Details
              </button>

              <div className="h-px bg-white/10 my-1" />

              <button
                onClick={() => {
                  onDelete(track);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-xs text-rose-400 hover:bg-white/10 rounded-lg flex items-center gap-2.5 transition-colors"
              >
                <Trash2 size={14} />
                Delete from Library
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
