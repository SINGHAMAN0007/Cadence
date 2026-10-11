import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, MoreVertical, Heart, ListPlus, Trash2, 
  Info, Disc3, Music, Plus, ChevronRight, Tag
} from 'lucide-react';
import type { Track, Playlist } from '../types';

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  onPlay: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  onPlayNext?: (track: Track) => void;
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
  activeMenuTrackId?: number | null;
  setActiveMenuTrackId?: (id: number | null) => void;
  onEditClassification?: (track: Track) => void;
}

export const TrackRow: React.FC<TrackRowProps> = ({
  track,
  index,
  isCurrent,
  isPlaying,
  onPlay,
  onToggleFavorite,
  onPlayNext,
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
  activeMenuTrackId,
  setActiveMenuTrackId,
  onEditClassification,
}) => {
  const [localMenuOpen, setLocalMenuOpen] = useState(false);
  const isMenuOpen = setActiveMenuTrackId !== undefined 
    ? activeMenuTrackId === track.id 
    : localMenuOpen;

  const [playlistSubmenuOpen, setPlaylistSubmenuOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    if (setActiveMenuTrackId) {
      setActiveMenuTrackId(null);
    } else {
      setLocalMenuOpen(false);
    }
    setPlaylistSubmenuOpen(false);
  }, [setActiveMenuTrackId]);

  useEffect(() => {
    if (!isMenuOpen) {
      setPlaylistSubmenuOpen(false);
      return;
    }

    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 280);
    }

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };

    const handleScroll = () => {
      closeMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isMenuOpen, closeMenu]);

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
      className={`group w-full max-w-full flex items-center justify-between px-4 py-2.5 transition-colors duration-150 cursor-pointer text-sm rounded-xl ${
        isMenuOpen
          ? 'relative z-30 bg-neutral-900/60 border border-white/10'
          : isCurrent
          ? 'bg-neutral-900/60 border border-white/10 text-white'
          : 'bg-transparent hover:bg-white/[0.04] text-zinc-300'
      }`}
    >
      {/* Left side: Index/Play, Artwork, Title & Artist */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pr-2">
        {/* Index / Play action (40px width matching header) */}
        <div className="w-[40px] text-zinc-400 text-center shrink-0 flex items-center justify-center">
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
            className={`${isCurrent && isPlaying ? 'hidden' : 'hidden group-hover:flex'} p-1 text-zinc-200 hover:text-white transition-colors cursor-pointer`}
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
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            <span 
              title={track.artist}
              className="truncate text-xs text-zinc-400 max-w-[120px] sm:max-w-[160px] block"
            >
              {track.artist}
            </span>
            {(track.category || track.genre) && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/[0.06] text-zinc-300 border border-white/10 shrink-0">
                {track.category && (
                  <span>
                    {track.category === 'Hindi' ? '🇮🇳 Hindi' : track.category === 'English' ? '🌐 English' : track.category === 'Phonk' ? '⚡ Phonk' : track.category}
                  </span>
                )}
                {track.category && track.genre && <span className="opacity-40">•</span>}
                {track.genre && <span className="text-zinc-200">{track.genre}</span>}
              </span>
            )}
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
      <div className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
        {/* Duration (80px width matching desktop grid header) */}
        <span className="text-[11px] sm:text-xs text-zinc-400 font-mono tabular-nums text-right w-12 sm:w-[80px] shrink-0 sm:pr-2">
          {formatDuration(track.duration)}
        </span>

        {/* Favorite Heart (always visible on mobile touch, hover on desktop) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(track);
          }}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
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
              className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 text-xs cursor-pointer"
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
              className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 text-xs cursor-pointer"
              title="Move Down"
            >
              ▼
            </button>
          </div>
        )}

        {/* Context Menu Button & Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Track options"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            onClick={(e) => {
              e.stopPropagation();
              if (setActiveMenuTrackId) {
                setActiveMenuTrackId(activeMenuTrackId === track.id ? null : track.id);
              } else {
                setLocalMenuOpen(prev => !prev);
              }
            }}
            className="p-2 rounded-full hover:bg-white/10 active:scale-95 cursor-pointer relative text-zinc-400 hover:text-zinc-200 transition-colors touch-manipulation flex items-center justify-center"
            title="Options"
          >
            <MoreVertical size={16} />
          </button>

          {isMenuOpen && (
            <>
              {/* Backdrop overlay to close menu cleanly on outside touch / click */}
              <div 
                className="fixed inset-0 z-40 bg-transparent cursor-default"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                }}
              />

              {/* Sleek frosted dark theme dropdown popup */}
              <div 
                className={`absolute right-0 ${
                  openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
                } z-50 min-w-[180px] bg-[#0a0a0a] border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 text-left animate-in fade-in zoom-in-95 duration-100 select-none`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Play Next */}
                {onPlayNext && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayNext(track);
                      closeMenu();
                    }}
                    className="w-full px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 active:bg-white/15 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                  >
                    <Disc3 size={14} className="text-zinc-300 shrink-0" />
                    <span>Play Next</span>
                  </button>
                )}

                {/* Add to Queue */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToQueue(track);
                    closeMenu();
                  }}
                  className="w-full px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 active:bg-white/15 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <ListPlus size={14} className="text-zinc-300 shrink-0" />
                  <span>Add to Queue</span>
                </button>

                {/* Add to Favorites / Remove from Favorites */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(track);
                    closeMenu();
                  }}
                  className="w-full px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 active:bg-white/15 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <Heart
                    size={14}
                    className={`shrink-0 ${track.isFavorite ? 'text-rose-500' : 'text-zinc-300'}`}
                    fill={track.isFavorite ? 'currentColor' : 'none'}
                  />
                  <span>{track.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                </button>

                {/* Add to Playlist */}
                <div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaylistSubmenuOpen(prev => !prev);
                    }}
                    className="w-full px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 active:bg-white/15 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2.5">
                      <Plus size={14} className="text-zinc-300 shrink-0" />
                      <span>Add to Playlist</span>
                    </span>
                    <ChevronRight
                      size={13}
                      className={`text-zinc-400 transition-transform shrink-0 ${playlistSubmenuOpen ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {playlistSubmenuOpen && (
                    <div className="mt-1 pl-2 pr-1 py-1 flex flex-col gap-0.5 max-h-36 overflow-y-auto border-l-2 border-white/10 ml-3">
                      {playlists.length === 0 ? (
                        <div className="px-2 py-1.5 text-[11px] text-zinc-500 italic">
                          No playlists yet
                        </div>
                      ) : (
                        playlists.map((pl) => (
                          <button
                            key={pl.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToPlaylist(track.id, pl.id);
                              closeMenu();
                            }}
                            className="w-full px-2 py-1.5 text-xs text-zinc-200 hover:bg-white/10 active:bg-white/15 rounded-md text-left truncate transition-colors flex items-center gap-2 cursor-pointer"
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
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromPlaylist(track.id, currentPlaylistId);
                      closeMenu();
                    }}
                    className="w-full px-3 py-2 text-xs text-amber-400 hover:bg-white/10 active:bg-white/15 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                  >
                    <Trash2 size={14} className="shrink-0" />
                    <span>Remove from Playlist</span>
                  </button>
                )}

                {/* Edit Category & Genre */}
                {onEditClassification && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClassification(track);
                      closeMenu();
                    }}
                    className="w-full px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 active:bg-white/15 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                  >
                    <Tag size={14} className="text-purple-400 shrink-0" />
                    <span>Edit Category & Genre</span>
                  </button>
                )}

                {/* Listen on YouTube Music */}
                <a
                  href={
                    track.lyrics?.includes('music.youtube.com')
                      ? track.lyrics.match(/https:\/\/music\.youtube\.com[^\s\n]+/)?.[0] || `https://music.youtube.com/search?q=${encodeURIComponent(track.title + ' ' + track.artist)}`
                      : `https://music.youtube.com/search?q=${encodeURIComponent(track.title + ' ' + track.artist)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeMenu();
                  }}
                  className="w-full px-3 py-2 text-xs text-rose-300 hover:text-white hover:bg-white/10 active:bg-white/15 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <Music size={14} className="text-rose-400 shrink-0" />
                  <span>Listen on YouTube Music</span>
                </a>

                {/* Track Details */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspect(track);
                    closeMenu();
                  }}
                  className="w-full px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 active:bg-white/15 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-left"
                >
                  <Info size={14} className="text-zinc-400 shrink-0" />
                  <span>Track Details</span>
                </button>

                <div className="h-px bg-white/10 my-0.5" />

                {/* Delete Track */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(track);
                    closeMenu();
                  }}
                  className="w-full px-3 py-2 text-xs text-rose-400 hover:bg-white/10 active:bg-white/15 rounded-lg flex items-center gap-2.5 transition-colors cursor-pointer text-left font-medium"
                >
                  <Trash2 size={14} className="shrink-0" />
                  <span>Delete Track</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

