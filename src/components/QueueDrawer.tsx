import React from 'react';
import { X, Music, Trash2, ArrowUp, ArrowDown, Play, Disc3, Clock } from 'lucide-react';
import type { Track } from '../types';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queue: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  onPlayTrack: (track: Track, newQueue?: Track[]) => void;
  onRemoveFromQueue: (index: number) => void;
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void;
  onClearQueue: () => void;
  history: Track[];
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  queue,
  currentTrack,
  isPlaying,
  onPlayTrack,
  onRemoveFromQueue,
  onMoveQueueItem,
  onClearQueue,
  history,
}) => {
  const [activeTab, setActiveTab] = React.useState<'upnext' | 'history'>('upnext');

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-[#16161a]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-full">
          <button
            onClick={() => setActiveTab('upnext')}
            className={`px-3.5 py-1 text-xs font-medium rounded-full transition-colors ${
              activeTab === 'upnext'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Up Next ({queue.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1 text-xs font-medium rounded-full transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            History ({history.length})
          </button>
        </div>

        <div className="flex items-center gap-1">
          {activeTab === 'upnext' && queue.length > 0 && (
            <button
              onClick={onClearQueue}
              className="p-1.5 text-xs text-zinc-400 hover:text-rose-400 hover:bg-white/[0.06] rounded-full transition-colors"
              title="Clear Queue"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-full transition-colors"
            title="Close drawer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Now Playing Mini Header */}
      {currentTrack && (
        <div className="p-4 bg-white/[0.02] border-b border-white/[0.08]">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Now Playing
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg ring-1 ring-white/10 bg-white/[0.04] overflow-hidden shrink-0 flex items-center justify-center">
              {currentTrack.coverDataUrl ? (
                <img
                  src={currentTrack.coverDataUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music size={20} className="text-violet-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-zinc-100 truncate">
                {currentTrack.title}
              </div>
              <div className="text-xs text-zinc-400 truncate">
                {currentTrack.artist}
              </div>
            </div>
            <span className="text-xs text-zinc-500 font-mono tabular-nums">
              {formatDuration(currentTrack.duration)}
            </span>
          </div>
        </div>
      )}

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-zinc-800/40">
        {activeTab === 'upnext' ? (
          queue.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <Music size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium text-zinc-400">Queue is empty</p>
              <p className="text-xs text-zinc-500 mt-1">
                Add songs from your library or playlists to build your session queue.
              </p>
            </div>
          ) : (
            queue.map((track, idx) => (
              <div
                key={`${track.id}-${idx}`}
                className="group flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                <div className="w-6 text-xs text-zinc-500 font-mono text-center shrink-0">
                  {idx + 1}
                </div>

                <div className="w-9 h-9 rounded bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {track.coverDataUrl ? (
                    <img src={track.coverDataUrl} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music size={14} className="text-zinc-500" />
                  )}
                </div>

                <div 
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() => {
                    const remainingQueue = queue.slice(idx + 1);
                    onPlayTrack(track, remainingQueue);
                  }}
                >
                  <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-violet-400 transition-colors">
                    {track.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {track.artist}
                  </div>
                </div>

                <span className="text-[11px] text-zinc-500 font-mono tabular-nums shrink-0">
                  {formatDuration(track.duration)}
                </span>

                {/* Queue Controls */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    disabled={idx === 0}
                    onClick={() => onMoveQueueItem(idx, idx - 1)}
                    className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-20 transition-opacity"
                    title="Move up"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    disabled={idx === queue.length - 1}
                    onClick={() => onMoveQueueItem(idx, idx + 1)}
                    className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-20 transition-opacity"
                    title="Move down"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    onClick={() => onRemoveFromQueue(idx)}
                    className="p-1 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          history.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <Clock size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium text-zinc-400">No playback history</p>
              <p className="text-xs text-zinc-500 mt-1">Tracks you finish or play will appear here.</p>
            </div>
          ) : (
            history.map((track, idx) => (
              <div
                key={`hist-${track.id}-${idx}`}
                className="group flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/60 transition-colors cursor-pointer"
                onClick={() => onPlayTrack(track)}
              >
                <div className="w-9 h-9 rounded bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {track.coverDataUrl ? (
                    <img src={track.coverDataUrl} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <Music size={14} className="text-zinc-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-zinc-200 truncate group-hover:text-violet-400 transition-colors">
                    {track.title}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {track.artist}
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-300 hover:text-violet-400"
                  title="Play track"
                >
                  <Play size={14} fill="currentColor" />
                </button>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
