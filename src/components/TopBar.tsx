import React from 'react';
import { 
  Search, UploadCloud, Keyboard, Menu, Radio, Users, Cloud, User
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
}

export const TopBar: React.FC<TopBarProps> = ({
  searchQuery,
  onSearchChange,
  onOpenImportModal,
  onOpenShortcuts,
  onOpenIdentifyModal,
  viewTitle,
  viewSubtitle,
  isImporting,
  importProgress,
  onToggleMobileMenu,
  currentUser = null,
  onOpenAccountModal,
  onOpenListenTogether,
  activeSession = null,
}) => {
  return (
    <header className="h-14 sm:h-16 border-b border-neutral-900 bg-black/95 backdrop-blur-2xl px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 z-20 shrink-0 select-none">
      {/* Zone 1: Mobile Hamburger + View Header */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-neutral-300 hover:text-white rounded-full bg-neutral-900/80 border border-neutral-800 transition-colors shrink-0"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="flex items-center">
          <h2 className="text-xs sm:text-sm font-semibold text-white tracking-tight flex items-center gap-1.5 whitespace-nowrap">
            <span>{viewTitle}</span>
            {viewSubtitle && (
              <span className="hidden md:inline text-xs font-normal text-zinc-400 truncate">
                · {viewSubtitle}
              </span>
            )}
          </h2>
        </div>
      </div>

      {/* Zone 2: Global Search */}
      <div className="flex items-center flex-1 min-w-[70px] sm:min-w-[120px] max-w-xs sm:max-w-md mx-1">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={13} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search library..."
            className="w-full bg-neutral-900/80 hover:bg-neutral-900 focus:bg-neutral-900 border border-neutral-800 focus:border-neutral-700 rounded-full py-1.5 pl-8 sm:pl-9 pr-7 text-xs text-white placeholder-neutral-400 focus:outline-none transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 text-xs p-0.5"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Zone 3: Actions (Pill-shaped action buttons) */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Identify Song Button */}
        {onOpenIdentifyModal && (
          <button
            onClick={onOpenIdentifyModal}
            className="px-3 sm:px-3.5 h-[32px] min-h-[32px] bg-gradient-to-r from-red-600/20 via-rose-500/20 to-red-600/20 hover:from-red-600/30 hover:to-rose-500/30 active:scale-95 text-rose-200 hover:text-white rounded-full text-xs font-medium border border-rose-500/30 shadow-sm backdrop-blur-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            title="Identify song playing nearby"
          >
            <Radio size={13} className="text-rose-400 animate-pulse" />
            <span className="hidden xs:inline">Identify</span>
          </button>
        )}

        {/* Import Music Button */}
        <button
          onClick={onOpenImportModal}
          disabled={isImporting}
          className="w-[90px] h-[32px] min-h-[32px] bg-neutral-900/80 hover:bg-neutral-800 active:scale-95 text-neutral-200 hover:text-white rounded-full font-medium border border-neutral-800 shadow-sm backdrop-blur-md transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          title="Import music files or web URLs"
        >
          <UploadCloud className="w-[18px] h-[17px] text-neutral-300 shrink-0" />
          <span className="text-[10px] leading-[12px]">{isImporting ? 'Importing...' : '+ Import'}</span>
        </button>

        {/* Listen Together Button (Hidden on mobile < md, visible on desktop >= md) */}
        {onOpenListenTogether && (
          <button
            onClick={onOpenListenTogether}
            className={`hidden md:flex px-2.5 sm:px-3 h-[32px] min-h-[32px] rounded-full text-xs font-medium border shadow-sm backdrop-blur-md transition-all items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              activeSession
                ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-500/40 shadow-cyan-500/20'
                : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
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
            className="hidden md:flex h-[32px] min-h-[32px] pl-1 pr-2.5 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-200 hover:text-white rounded-full font-medium border border-neutral-800 shadow-sm backdrop-blur-md transition-all items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            title={currentUser ? `Account: ${currentUser.displayName || currentUser.email}` : "Sign In / Offline Account"}
          >
            {currentUser?.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt="Account" 
                className="w-5 h-5 rounded-full object-cover ring-1 ring-rose-500/50" 
              />
            ) : currentUser ? (
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-zinc-400">
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
          className="hidden sm:flex h-[32px] w-[32px] items-center justify-center text-zinc-400 hover:text-white hover:bg-neutral-800 rounded-full transition-colors shrink-0"
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
