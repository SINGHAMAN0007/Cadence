import React from 'react';
import { X, Music, Info, FileAudio, Disc, Calendar, HardDrive, Radio } from 'lucide-react';
import type { Track } from '../types';

interface TrackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | null;
}

export const TrackDetailsModal: React.FC<TrackDetailsModalProps> = ({
  isOpen,
  onClose,
  track,
}) => {
  if (!isOpen || !track) return null;

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-6 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-white tracking-tight">
            <Info size={18} className="text-rose-500" />
            <span>Track Metadata & Properties</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 flex gap-4 items-start">
          <div className="w-20 h-20 rounded-xl ring-1 ring-white/10 bg-white/[0.04] overflow-hidden shrink-0 flex items-center justify-center shadow-md">
            {track.coverDataUrl ? (
              <img src={track.coverDataUrl} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <Music size={28} className="text-zinc-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-white tracking-tight truncate">{track.title}</h3>
            <p className="text-sm text-rose-400 truncate">{track.artist}</p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{track.album}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <span className="text-zinc-400 flex items-center gap-2">
              <FileAudio size={14} className="text-zinc-500" /> Format & Container
            </span>
            <span className="font-mono font-medium text-white">{track.format}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <span className="text-zinc-400 flex items-center gap-2">
              <HardDrive size={14} className="text-zinc-500" /> File Size
            </span>
            <span className="font-mono font-medium text-white">{formatFileSize(track.size)}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <span className="text-zinc-400 flex items-center gap-2">
              <Disc size={14} className="text-zinc-500" /> Duration
            </span>
            <span className="font-mono font-medium text-white">{formatDuration(track.duration)}</span>
          </div>

          {track.bitrate && (
            <div className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <span className="text-zinc-400 flex items-center gap-2">
                <Radio size={14} className="text-zinc-500" /> Bitrate
              </span>
              <span className="font-mono font-medium text-white">
                {Math.round(track.bitrate / 1000)} kbps
              </span>
            </div>
          )}

          {track.sampleRate && (
            <div className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <span className="text-zinc-400 flex items-center gap-2">
                <Radio size={14} className="text-zinc-500" /> Sample Rate
              </span>
              <span className="font-mono font-medium text-white">
                {track.sampleRate} Hz
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <span className="text-zinc-400 flex items-center gap-2">
              <Calendar size={14} className="text-zinc-500" /> Added to Library
            </span>
            <span className="font-mono text-zinc-300">{formatDate(track.createdAt)}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/15 rounded-full border border-white/10 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
