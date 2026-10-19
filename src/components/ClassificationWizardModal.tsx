import React, { useState, useEffect } from 'react';
import { X, Layers } from 'lucide-react';
import type { Track, MusicCategory } from '../types';
import { CATEGORIES, CATEGORY_GENRES } from '../services/classifierService';
import { sanitizeMetadata } from '../utils/sanitizeMetadata';
import { ModalBackdrop } from './ModalBackdrop';

export interface PendingImportItem {
  file: Blob;
  meta: {
    title: string;
    artist: string;
    album: string;
    duration: number;
    format: string;
    size: number;
    coverDataUrl?: string;
    bitrate?: number;
    sampleRate?: number;
    lyrics?: string;
  };
  category?: MusicCategory | string;
  genre?: string;
}

interface ClassificationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Batch import mode:
  pendingTracks?: PendingImportItem[];
  onConfirmImport?: (items: PendingImportItem[]) => Promise<void>;
  // Single track edit mode:
  editingTrack?: Track | null;
  onConfirmEdit?: (
    trackId: number, 
    category?: string, 
    genre?: string,
    title?: string,
    artist?: string,
    album?: string
  ) => Promise<void>;
}

export const ClassificationWizardModal: React.FC<ClassificationWizardModalProps> = ({
  isOpen,
  onClose,
  pendingTracks = [],
  onConfirmImport,
  editingTrack = null,
  onConfirmEdit,
}) => {
  const isEditMode = !!editingTrack;
  const isBatch = !isEditMode && pendingTracks.length > 1;

  // Single track edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MusicCategory | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [applyToAll, setApplyToAll] = useState(true);

  // Initialize when opened
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && editingTrack) {
      const clean = sanitizeMetadata(editingTrack.title || '', editingTrack.artist || '', editingTrack.album || '');
      setEditTitle(clean.title);
      setEditArtist(clean.artist);
      setEditAlbum(clean.album);
      setSelectedCategory((editingTrack.category as MusicCategory) || null);
      setSelectedGenre(editingTrack.genre || null);
    } else if (pendingTracks.length > 0) {
      const clean = sanitizeMetadata(
        pendingTracks[0]?.meta?.title || '',
        pendingTracks[0]?.meta?.artist || '',
        pendingTracks[0]?.meta?.album || ''
      );
      setEditTitle(clean.title);
      setEditArtist(clean.artist);
      setEditAlbum(clean.album);
      setSelectedCategory((pendingTracks[0]?.category as MusicCategory) || null);
      setSelectedGenre(pendingTracks[0]?.genre || null);
      setApplyToAll(true);
    }
  }, [isOpen, editingTrack, pendingTracks, isEditMode]);

  if (!isOpen) return null;

  // Get available genres based on selectedCategory
  const currentAvailableGenres = selectedCategory && CATEGORY_GENRES[selectedCategory]
    ? CATEGORY_GENRES[selectedCategory]
    : [
        'Bollywood', 'Pop', 'Drift Phonk', 'Lo-Fi', 'EDM',
        'Hip-Hop/Rap', 'Rock', 'Indie Pop', 'Acoustic', 'Sufi/Ghazal'
      ];

  const handleSave = async () => {
    if (isEditMode && editingTrack && onConfirmEdit) {
      await onConfirmEdit(
        editingTrack.id,
        selectedCategory || undefined,
        selectedGenre || undefined,
        editTitle,
        editArtist,
        editAlbum
      );
      onClose();
    } else if (!isEditMode && onConfirmImport) {
      const finalItems = pendingTracks.map((item) => ({
        ...item,
        category: selectedCategory || item.category,
        genre: selectedGenre || item.genre,
      }));
      await onConfirmImport(finalItems);
      onClose();
    }
  };

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md bg-[#0a0a0a] p-5 text-zinc-100 flex flex-col max-h-[90vh]"
    >
      {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-white font-semibold text-sm">
              {isEditMode ? 'Edit Track Details' : 'Classify Track Metadata'}
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {isEditMode 
                ? 'Update metadata and tags for this track' 
                : isBatch 
                ? `Assign genre and language style to ${pendingTracks.length} tracks` 
                : 'Assign genre and language tags before adding to library'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Title Field (shown in Edit Mode) */}
          {isEditMode && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Track Title"
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-white/25 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Artist Field (shown in Edit Mode) */}
          {isEditMode && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Artist
              </label>
              <input
                type="text"
                value={editArtist}
                onChange={(e) => setEditArtist(e.target.value)}
                placeholder="Artist Name"
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-white/25 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Album Field (shown in Edit Mode) */}
          {isEditMode && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1.5">
                Album
              </label>
              <input
                type="text"
                value={editAlbum}
                onChange={(e) => setEditAlbum(e.target.value)}
                placeholder="Album Name"
                className="w-full h-10 px-3.5 rounded-xl bg-white/[0.04] border border-white/10 focus:border-white/25 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Language / Category Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Language / Tradition
              </label>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCategory(null);
                      } else {
                        setSelectedCategory(cat.id);
                      }
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-white text-black font-medium border-white shadow-sm'
                        : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Genre Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Genre
              </label>
              {selectedGenre && (
                <button
                  type="button"
                  onClick={() => setSelectedGenre(null)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {currentAvailableGenres.map((genre) => {
                const isSelected = selectedGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedGenre(null);
                      } else {
                        setSelectedGenre(genre);
                      }
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-white text-black font-medium border-white shadow-sm'
                        : 'bg-white/[0.03] border-white/5 text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Batch multi-track toggle */}
          {isBatch && (
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-zinc-400" />
                <span className="text-[11px] text-zinc-400">Apply to all {pendingTracks.length} tracks</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-white" />
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 h-9 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          >
            {isEditMode ? 'Save Changes' : 'Confirm'}
          </button>
        </div>
    </ModalBackdrop>
  );
};
