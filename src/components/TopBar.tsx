import React from 'react';
import { 
  Search, UploadCloud, Keyboard, Filter, 
  ChevronDown, Menu
} from 'lucide-react';
import type { SortField, SortOrder } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenImportModal: () => void;
  onOpenShortcuts: () => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField) => void;
  viewTitle: string;
  viewSubtitle?: string;
  isImporting: boolean;
  importProgress?: { current: number; total: number } | null;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenImportModal,
  onOpenShortcuts,
  sortField,
  sortOrder,
  onSortChange,
  viewTitle,
  viewSubtitle,
  isImporting,
  importProgress,
  onToggleMobileMenu,
}) => {
  const [sortDropdownOpen, setSortDropdownOpen] = React.useState(false);

  const sortOptions: { label: string; field: SortField }[] = [
    { label: 'Date Added', field: 'createdAt' },
    { label: 'Title', field: 'title' },
    { label: 'Artist', field: 'artist' },
    { label: 'Album', field: 'album' },
    { label: 'Duration', field: 'duration' },
  ];

  return (
    <header className="h-14 sm:h-16 border-b border-white/[0.08] bg-white/[0.02] backdrop-blur-2xl px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-20 shrink-0 select-none">
      {/* Zone 1: Mobile Hamburger + View Header */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-zinc-300 hover:text-white rounded-full bg-white/[0.06] border border-white/[0.08] transition-colors shrink-0"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate flex items-center gap-1.5">
            <span className="truncate">{viewTitle}</span>
            {viewSubtitle && (
              <span className="hidden md:inline text-xs font-normal text-zinc-400 truncate">
                · {viewSubtitle}
              </span>
            )}
          </h2>
        </div>
      </div>

      {/* Zone 2: Global Search & Sort */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 flex-1 max-w-xs sm:max-w-md mx-1">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search library..."
            className="w-full bg-white/[0.06] hover:bg-white/[0.08] focus:bg-white/[0.1] border border-white/[0.08] focus:border-white/20 rounded-full py-1.5 pl-8 sm:pl-9 pr-7 text-xs text-white placeholder-zinc-400/80 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs p-0.5"
            >
              ×
            </button>
          )}
        </div>

        {/* Sort Menu (Apple Pill Button) */}
        <div className="relative shrink-0">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-full text-xs font-medium text-zinc-200 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Sort Tracks"
          >
            <Filter size={12} className="text-zinc-400" />
            <span className="hidden md:inline">Sort</span>
            <ChevronDown size={11} className="text-zinc-500 hidden sm:inline" />
          </button>

          {sortDropdownOpen && (
            <div 
              className="absolute right-0 top-9 w-36 sm:w-40 bg-[#1c1c1e]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setSortDropdownOpen(false)}
            >
              {sortOptions.map((opt) => (
                <button
                  key={opt.field}
                  onClick={() => onSortChange(opt.field)}
                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between rounded-lg hover:bg-white/10 transition-colors ${
                    sortField === opt.field ? 'text-rose-500 font-semibold' : 'text-zinc-300'
                  }`}
                >
                  <span>{opt.label}</span>
                  {sortField === opt.field && (
                    <span className="text-[10px] font-mono">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Zone 3: Actions (Pill-shaped action buttons) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Import Music Button (Apple Pill Button with subtle translucency) */}
        <button
          onClick={onOpenImportModal}
          disabled={isImporting}
          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 active:scale-95 text-white rounded-full text-xs font-medium border border-white/10 shadow-sm backdrop-blur-md transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 min-h-[34px]"
          title="Import music files or web URLs"
        >
          <UploadCloud size={13} className="text-zinc-300" />
          <span>{isImporting ? 'Importing...' : '+ Import'}</span>
        </button>

        {/* Shortcuts button */}
        <button
          onClick={onOpenShortcuts}
          className="hidden sm:flex p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.08] rounded-full transition-colors shrink-0"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={16} />
        </button>
      </div>

      {/* Progress banner if importing */}
      {isImporting && importProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-200"
            style={{ width: `${(importProgress.current / Math.max(1, importProgress.total)) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
};
