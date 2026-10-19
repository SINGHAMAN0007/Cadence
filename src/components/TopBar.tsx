import React, { useState } from 'react';
import { 
  Search, UploadCloud, Keyboard, Menu, Radio, Users, Cloud, User, Edit3, Trash2, ArrowUpDown
} from 'lucide-react';
import type { SortField, SortOrder } from '../types';
import type { PlaybackSessionData } from '../services/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenImportModal: () => void;
  onOpenShortcuts: () => void;
  onOpenIdentifyModal?: () => void;
  sortField?: SortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: SortField) => void;
  viewTitle: string;
  viewSubtitle?: string;
  isImporting: boolean;
  importProgress?: { current: number; total: number } | null;
  onToggleMobileMenu?: () => void;
  currentUser?: FirebaseUser | null;
  onOpenAccountModal?: () => void;
  onOpenListenTogether?: () => void;
  activeSession?: PlaybackSessionData | null;
  onDeleteCurrentPlaylist?: () => void;
  onEditCurrentPlaylist?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenImportModal,
  onOpenShortcuts,
  onOpenIdentifyModal,
  sortField = 'title',
  sortOrder = 'asc',
  onSortChange,
  viewTitle,
  viewSubtitle,
  isImporting,
  importProgress,
  onToggleMobileMenu,
  currentUser = null,
  onOpenAccountModal,
  onOpenListenTogether,
  activeSession = null,
  onDeleteCurrentPlaylist,
  onEditCurrentPlaylist,
}) => {
  const [isSortOpen, setIsSortOpen] = useState<boolean>(false);

  return (
    <header className="h-14 sm:h-16 px-3.5 sm:px-6 flex items-center justify-between gap-2.5 sm:gap-4 bg-black/85 backdrop-blur-xl sticky top-0 z-30 border-b border-white/[0.08] select-none shrink-0">
      {/* Zone 1 (Left): Navigation context, title, sort and playlist actions */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0 text-zinc-300 hover:text-white md:hidden transition-all active:scale-95 cursor-pointer border border-white/10 shadow-sm"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-baseline min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-white whitespace-nowrap shrink-0 truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-[240px] tracking-tight">
              {viewTitle}
            </h2>
            {viewSubtitle && (
              <span className="hidden xl:inline-block text-[11px] font-normal text-zinc-400 pl-2 ml-2 border-l border-white/15 truncate max-w-[140px]">
                {viewSubtitle}
              </span>
            )}
          </div>

          {/* Sort dropdown: hidden on mobile, visible on tablet & desktop */}
          {onSortChange && (
            <div className="hidden sm:inline-flex relative shrink-0">
              <button
                type="button"
                onClick={() => setIsSortOpen(prev => !prev)}
                className={`flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-full border transition-all active:scale-95 cursor-pointer ${
                  isSortOpen
                    ? 'bg-white/15 text-white border-white/25 shadow-sm'
                    : 'text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
                }`}
                title="Sort tracks"
              >
                <ArrowUpDown size={12} className="text-zinc-400" />
                <span>Sort ▾</span>
              </button>

              {isSortOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsSortOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 z-50 min-w-[160px] bg-[#0c0c0c] border border-white/15 backdrop-blur-2xl rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        onSortChange('title');
                        setIsSortOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        sortField === 'title' ? 'bg-white/15 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      <span>By Name</span>
                      {sortField === 'title' && (
                        <span className="text-[10px] text-zinc-400 font-mono">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSortChange('createdAt');
                        setIsSortOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        sortField === 'createdAt' ? 'bg-white/15 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      <span>By Date</span>
                      {sortField === 'createdAt' && (
                        <span className="text-[10px] text-zinc-400 font-mono">{sortOrder === 'desc' ? 'New' : 'Old'}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSortChange('duration');
                        setIsSortOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        sortField === 'duration' ? 'bg-white/15 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      <span>By Duration</span>
                      {sortField === 'duration' && (
                        <span className="text-[10px] text-zinc-400 font-mono">{sortOrder === 'asc' ? 'Short' : 'Long'}</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Playlist Edit / Delete controls */}
          {onDeleteCurrentPlaylist && (
            <div className="flex items-center gap-0.5 shrink-0 bg-white/5 border border-white/10 rounded-lg p-0.5">
              {onEditCurrentPlaylist && (
                <button
                  type="button"
                  onClick={onEditCurrentPlaylist}
                  className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-white rounded hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
                  title="Edit Playlist"
                  aria-label="Edit Playlist"
                >
                  <Edit3 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={onDeleteCurrentPlaylist}
                className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-rose-400 rounded hover:bg-rose-500/10 active:scale-95 transition-colors cursor-pointer"
                title="Delete Playlist"
                aria-label="Delete Playlist"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zone 2 (Center): Balanced Search Library */}
      <div className="flex-1 flex justify-center max-w-sm sm:max-w-md min-w-[110px] mx-1 sm:mx-3">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search library..."
            className="w-full h-8 sm:h-9 pl-8.5 pr-8 rounded-full bg-white/5 hover:bg-white/[0.08] focus:bg-white/[0.12] border border-white/10 focus:border-white/30 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all focus:ring-1 focus:ring-white/20"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-white text-xs rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Zone 3 (Right): Uniformly Sized Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Radio/Broadcast (Identify song) button */}
        {onOpenIdentifyModal && (
          <button
            onClick={onOpenIdentifyModal}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center shrink-0 text-zinc-300 hover:text-white active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Identify song playing nearby"
            aria-label="Identify song playing nearby"
          >
            <Radio size={14} className="text-zinc-300" />
          </button>
        )}

        {/* Import Music Button: compact circle on mobile (<sm), pill with label on desktop (sm:) */}
        <button
          onClick={onOpenImportModal}
          disabled={isImporting}
          className="w-8 h-8 rounded-full bg-white text-black hover:bg-zinc-200 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer disabled:opacity-50 sm:w-auto sm:h-9 sm:px-3.5 sm:rounded-full shadow-sm"
          title="Import music files or web URLs"
        >
          <UploadCloud className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline text-xs font-semibold ml-1.5 whitespace-nowrap">
            {isImporting ? 'Importing...' : '+ Import'}
          </span>
        </button>

        {/* Listen Together Button (Hidden on mobile < md, visible on desktop >= md) */}
        {onOpenListenTogether && (
          <button
            onClick={onOpenListenTogether}
            className={`hidden md:flex h-8 sm:h-9 px-3 rounded-full text-xs font-medium border shadow-sm backdrop-blur-md transition-all items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeSession
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-500/40 shadow-cyan-500/20'
                : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/10'
            }`}
            title="Listen Together with friends"
          >
            <Users size={14} className={activeSession ? 'text-cyan-400 animate-pulse' : 'text-zinc-400'} />
            <span>
              {activeSession ? activeSession.roomCode : 'Listen Together'}
            </span>
          </button>
        )}

        {/* Cloud Account Avatar Button (Hidden on mobile < md, visible on desktop >= md) */}
        {onOpenAccountModal && (
          <button
            onClick={onOpenAccountModal}
            className="hidden md:flex h-8 sm:h-9 pl-1.5 pr-3 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white rounded-full font-medium border border-white/10 shadow-sm backdrop-blur-md transition-all items-center justify-center gap-2 shrink-0 cursor-pointer"
            title={currentUser ? `Account: ${currentUser.displayName || currentUser.email}` : "Sign In / Offline Account"}
          >
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Account" 
                className="w-5 h-5 rounded-full object-cover ring-1 ring-white/15" 
              />
            ) : currentUser ? (
              <div className="w-5 h-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-[10px] font-medium">
                {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400">
                <User size={11} />
              </div>
            )}
            <span className="text-[10px] leading-tight max-w-[80px] truncate">
              {currentUser ? (currentUser.displayName || currentUser.email?.split('@')[0]) : 'Sign In'}
            </span>
          </button>
        )}

        {/* Shortcuts button */}
        <button
          onClick={onOpenShortcuts}
          className="hidden lg:flex w-8 h-8 sm:w-9 sm:h-9 items-center justify-center text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all shrink-0 cursor-pointer"
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
