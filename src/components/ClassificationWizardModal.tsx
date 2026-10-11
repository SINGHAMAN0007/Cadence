import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Check, ArrowRight, ArrowLeft, 
  Music, Loader2, Tag, Layers
} from 'lucide-react';
import type { Track, MusicCategory } from '../types';
import { 
  CATEGORIES, CATEGORY_GENRES, 
  classifyTrackWithAI 
} from '../services/classifierService';

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
  onConfirmEdit?: (trackId: number, category?: string, genre?: string) => Promise<void>;
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

  // Track currently being previewed in wizard
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [applyToAll, setApplyToAll] = useState(true);

  // Wizard state
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCategory, setSelectedCategory] = useState<MusicCategory | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [isDetectingAI, setIsDetectingAI] = useState(false);
  const [aiResultBadge, setAiResultBadge] = useState<string | null>(null);

  // Internal per-track assignments when applyToAll is false
  const [assignedTags, setAssignedTags] = useState<Array<{ category?: string; genre?: string }>>([]);

  const activeTrackMeta = isEditMode
    ? { title: editingTrack.title, artist: editingTrack.artist }
    : pendingTracks[currentTrackIndex]?.meta || { title: 'Unknown Title', artist: 'Unknown Artist' };

  // Initialize when opened
  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setIsDetectingAI(false);
    setAiResultBadge(null);

    if (isEditMode && editingTrack) {
      const initialCat = (editingTrack.category as MusicCategory) || null;
      setSelectedCategory(initialCat);
      setSelectedGenre(editingTrack.genre || null);
    } else if (pendingTracks.length > 0) {
      setCurrentTrackIndex(0);
      setApplyToAll(true);
      setSelectedCategory(null);
      setSelectedGenre(null);
      setAssignedTags(pendingTracks.map(t => ({ category: t.category, genre: t.genre })));
    }
  }, [isOpen, editingTrack, pendingTracks, isEditMode]);

  if (!isOpen) return null;

  // Handle AI Auto-Detect (Step 1 or Step 2)
  const handleAutoDetectAI = async (target: 'both' | 'genre-only') => {
    setIsDetectingAI(true);
    setAiResultBadge(null);

    try {
      const result = await classifyTrackWithAI(
        activeTrackMeta.title,
        activeTrackMeta.artist
      );

      if (target === 'both') {
        setSelectedCategory(result.category);
        setSelectedGenre(result.genre);
        setAiResultBadge(`Detected: ${result.category} • ${result.genre} (${result.source === 'gemini' ? 'Gemini AI' : 'Smart Offline Fallback'})`);
        // Smoothly auto-advance to Step 2 so user sees the verified genre
        setTimeout(() => {
          setStep(2);
        }, 350);
      } else {
        // Genre only
        setSelectedGenre(result.genre);
        setAiResultBadge(`Auto-tagged: ${result.genre} (${result.source === 'gemini' ? 'Gemini AI' : 'Smart Offline Fallback'})`);
      }
    } catch (err) {
      console.warn('Auto-detect error:', err);
    } finally {
      setIsDetectingAI(false);
    }
  };

  // Select category
  const handleSelectCategory = (cat: MusicCategory) => {
    setSelectedCategory(cat);
    // If current genre does not belong to new category, reset genre
    const validGenres = CATEGORY_GENRES[cat];
    if (selectedGenre && !validGenres.includes(selectedGenre)) {
      setSelectedGenre(null);
    }
    setStep(2);
  };

  // Finalize and save
  const handleFinalize = async () => {
    if (isEditMode && editingTrack && onConfirmEdit) {
      await onConfirmEdit(
        editingTrack.id,
        selectedCategory || undefined,
        selectedGenre || undefined
      );
      onClose();
      return;
    }

    if (onConfirmImport) {
      let finalItems: PendingImportItem[] = [];

      if (applyToAll || pendingTracks.length === 1) {
        finalItems = pendingTracks.map(item => ({
          ...item,
          category: selectedCategory || undefined,
          genre: selectedGenre || undefined,
        }));
      } else {
        finalItems = pendingTracks.map((item, idx) => ({
          ...item,
          category: (idx === currentTrackIndex ? selectedCategory : assignedTags[idx]?.category) || undefined,
          genre: (idx === currentTrackIndex ? selectedGenre : assignedTags[idx]?.genre) || undefined,
        }));
      }

      await onConfirmImport(finalItems);
      onClose();
    }
  };

  // Skip tagging altogether
  const handleSkip = async () => {
    setSelectedCategory(null);
    setSelectedGenre(null);

    if (isEditMode && editingTrack && onConfirmEdit) {
      await onConfirmEdit(editingTrack.id, undefined, undefined);
      onClose();
      return;
    }

    if (onConfirmImport) {
      await onConfirmImport(pendingTracks);
      onClose();
    }
  };

  const currentAvailableGenres = selectedCategory
    ? CATEGORY_GENRES[selectedCategory]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 text-zinc-100 flex flex-col gap-5 select-none relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle accent glow top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-purple-500 to-rose-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-rose-400 shrink-0">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>{isEditMode ? 'Edit Category & Genre' : 'Classify Music Track'}</span>
                {isBatch && (
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                    {pendingTracks.length} tracks
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-400">
                Tag language style and primary genre for smart filtering
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Track Banner */}
        <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-zinc-400 shrink-0">
              <Music size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate max-w-[280px]">
                {activeTrackMeta.title}
              </div>
              <div className="text-[11px] text-zinc-400 truncate max-w-[280px]">
                {activeTrackMeta.artist || 'Unknown Artist'}
              </div>
            </div>
          </div>

          {/* Stepper indicators */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setStep(1)}
              className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                step === 1
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : selectedCategory
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-white/10 text-zinc-400 hover:bg-white/15'
              }`}
            >
              1
            </button>
            <div className="w-3 h-0.5 bg-white/10" />
            <button
              onClick={() => {
                if (selectedCategory) setStep(2);
              }}
              disabled={!selectedCategory}
              className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                step === 2
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 cursor-pointer'
                  : selectedGenre
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 cursor-pointer'
                  : 'bg-white/10 text-zinc-500 opacity-60'
              }`}
            >
              2
            </button>
          </div>
        </div>

        {/* AI Result Notification Banner */}
        {aiResultBadge && (
          <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <Sparkles size={14} className="text-purple-400 shrink-0" />
            <span className="truncate">{aiResultBadge}</span>
          </div>
        )}

        {/* Step 1: Select Music Category */}
        {step === 1 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
                  Step 1: Select Music Category
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Choose the broad music tradition or sound style
                </p>
              </div>

              {selectedCategory && (
                <span className="text-[11px] text-rose-400 font-medium">
                  Selected: {selectedCategory}
                </span>
              )}
            </div>

            {/* Category Options: [ 🇮🇳 Hindi ]  [ 🌐 English ]  [ ⚡ Phonk ] */}
            <div className="grid grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg shadow-rose-500/20 scale-[1.02]'
                        : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-xs font-semibold">{cat.label}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] text-rose-400 mt-0.5">
                        <Check size={10} /> Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Smart Action Buttons: Auto-Detect with AI and Skip */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => handleAutoDetectAI('both')}
                disabled={isDetectingAI}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-rose-500/20 hover:from-purple-500/30 hover:to-rose-500/30 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isDetectingAI ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-purple-300" />
                    <span>Detecting with AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} className="text-purple-300" />
                    <span>🤖 Auto-Detect with AI</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Specific Genre Tag */}
        {step === 2 && (
          <div className="space-y-3.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
                  Step 2: Select Genre {selectedCategory ? `(${selectedCategory})` : ''}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Pick the primary sub-genre tag for this track
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ArrowLeft size={12} />
                <span>Change Category</span>
              </button>
            </div>

            {/* Genre Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {currentAvailableGenres.map((genre) => {
                const isSelected = selectedGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-rose-500 border-rose-400 text-white shadow-md shadow-rose-500/25 scale-105'
                        : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <span>{genre}</span>
                  </button>
                );
              })}
            </div>

            {/* Option: [ 🤖 Auto-Tag Genre with Gemini ] */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleAutoDetectAI('genre-only')}
                disabled={isDetectingAI}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-500/15 to-rose-500/15 hover:from-purple-500/25 hover:to-rose-500/25 border border-purple-500/30 text-purple-200 hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isDetectingAI ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-purple-300" />
                    <span>Auto-tagging Genre...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-purple-300" />
                    <span>🤖 Auto-Tag Genre with Gemini</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Batch multi-track toggle */}
        {isBatch && (
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-zinc-400" />
              <span>Apply to all {pendingTracks.length} imported tracks</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500" />
            </label>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2.5">
          <div>
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Skip Tagging
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && selectedCategory && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next: Genre</span>
                <ArrowRight size={13} />
              </button>
            )}

            <button
              type="button"
              onClick={handleFinalize}
              className="px-5 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Check size={14} />
              <span>{isEditMode ? 'Done / Save Tags' : 'Done / Import'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
