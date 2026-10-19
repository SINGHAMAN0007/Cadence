import React from 'react';
import { X, Sparkles } from 'lucide-react';
import type { MusicCategory } from '../types';
import { CATEGORIES, CATEGORY_GENRES } from '../services/classifierService';

interface CategoryFilterBarProps {
  selectedCategory: string; // 'All' | 'Hindi' | 'English' | 'Phonk'
  onSelectCategory: (cat: string) => void;
  selectedGenre: string; // 'All' | genre
  onSelectGenre: (genre: string) => void;
  categoryCounts?: Record<string, number>;
  genreCounts?: Record<string, number>;
  totalCount: number;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedGenre,
  onSelectGenre,
  categoryCounts = {},
  genreCounts = {},
  totalCount,
}) => {
  // Determine available genre chips based on selectedCategory
  const currentGenres: string[] = React.useMemo(() => {
    if (selectedCategory !== 'All' && (selectedCategory in CATEGORY_GENRES)) {
      return CATEGORY_GENRES[selectedCategory as MusicCategory];
    }
    // If 'All', return distinct genres present in genreCounts or common genres
    const presentGenres = Object.keys(genreCounts).filter(g => g && g !== 'All');
    if (presentGenres.length > 0) {
      return presentGenres;
    }
    return [
      'Bollywood', 'Pop', 'Drift Phonk', 'Lo-Fi', 'EDM', 
      'Hip-Hop/Rap', 'Sufi/Ghazal', 'Rock'
    ];
  }, [selectedCategory, genreCounts]);

  const hasActiveFilter = selectedCategory !== 'All' || selectedGenre !== 'All';

  return (
    <div className="w-full flex flex-col gap-2 pt-1 pb-3 select-none">
      {/* Row 1: Category Chips: [ All ] [ 🇮🇳 Hindi ] [ 🌐 English ] [ ⚡ Phonk ] */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
        <button
          type="button"
          onClick={() => {
            onSelectCategory('All');
            onSelectGenre('All');
          }}
          className={`px-3 py-1.5 rounded-full text-xs shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
            selectedCategory === 'All'
              ? 'bg-white text-black font-semibold border-white shadow-sm'
              : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
          }`}
        >
          <span>All</span>
          <span className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full font-mono ${
            selectedCategory === 'All' ? 'bg-black/10 text-black font-bold' : 'bg-white/10 text-neutral-400'
          }`}>
            {totalCount}
          </span>
        </button>

        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                const nextCat = isSelected ? 'All' : cat.id;
                onSelectCategory(nextCat);
                onSelectGenre('All');
              }}
              className={`px-3 py-1.5 rounded-full text-xs shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-white text-black font-semibold border-white shadow-sm'
                  : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
              }`}
            >
              <span>{cat.label}</span>
              {count > 0 && (
                <span className={`text-[10px] tabular-nums px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-black/10 text-black font-bold' : 'bg-white/10 text-neutral-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Clear filter indicator */}
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => {
              onSelectCategory('All');
              onSelectGenre('All');
            }}
            className="px-2.5 py-1 text-[11px] text-neutral-400 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 rounded-full border border-neutral-800 shrink-0 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
            title="Reset Category and Genre filters"
          >
            <X size={11} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Row 2: Dynamic Genre Sub-Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 pl-1">
        <button
          type="button"
          onClick={() => onSelectGenre('All')}
          className={`px-2.5 py-1 rounded-lg text-[11px] shrink-0 transition-colors cursor-pointer border ${
            selectedGenre === 'All'
              ? 'bg-white text-black font-semibold border-white shadow-sm'
              : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
          }`}
        >
          All Genres
        </button>

        {currentGenres.map((genre) => {
          const isSelected = selectedGenre === genre;
          const count = genreCounts[genre] || 0;

          return (
            <button
              key={genre}
              type="button"
              onClick={() => {
                onSelectGenre(isSelected ? 'All' : genre);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] shrink-0 transition-all cursor-pointer flex items-center gap-1 border ${
                isSelected
                  ? 'bg-white text-black font-semibold border-white shadow-sm'
                  : 'bg-neutral-900/80 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
              }`}
            >
              <span>{genre}</span>
              {count > 0 && (
                <span className={`text-[10px] tabular-nums ${isSelected ? 'text-black/70' : 'text-neutral-400'}`}>
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
