import React, { useState } from 'react';
import { 
  X, Radio, Users, Copy, Check, Play, Pause, 
  Volume2, Share2, Sparkles, AlertCircle, LogOut,
  Headphones, Disc3, Music, ShieldCheck, ArrowRight
} from 'lucide-react';
import type { Track } from '../types';
import type { PlaybackSessionData } from '../services/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { ModalBackdrop } from './ModalBackdrop';

interface ListenTogetherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  activeSession: PlaybackSessionData | null;
  isHost: boolean;
  syncWithHostEnabled: boolean;
  onSetSyncWithHostEnabled: (enabled: boolean) => void;
  onStartHosting: () => Promise<void>;
  onJoinSession: (roomCode: string) => Promise<boolean>;
  onLeaveSession: () => Promise<void>;
  onRequireAuth: () => void;
  matchedLocalTrackTitle?: string;
}

export const ListenTogetherModal: React.FC<ListenTogetherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentTrack,
  isPlaying,
  currentTime,
  activeSession,
  isHost,
  syncWithHostEnabled,
  onSetSyncWithHostEnabled,
  onStartHosting,
  onJoinSession,
  onLeaveSession,
  onRequireAuth,
  matchedLocalTrackTitle
}) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHostClick = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onStartHosting();
    } catch (err: any) {
      setError(err?.message || 'Failed to start session.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    const clean = joinCodeInput.trim().toUpperCase();
    if (clean.length < 4) {
      setError('Please enter a valid 6-character room code.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const ok = await onJoinSession(clean);
      if (!ok) {
        setError('No active session found with this room code. Verify code with host.');
      } else {
        setJoinCodeInput('');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to join session.');
    } finally {
      setLoading(false);
    }
  };

  const formatSec = (s: number) => {
    if (isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md bg-black"
    >
      {/* Modal Top Bar */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
              <Radio size={16} className={activeSession ? 'animate-pulse text-white' : 'text-zinc-300'} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-semibold text-base tracking-tight leading-tight">
                  Listen Together
                </h2>
                {activeSession && (
                  <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded-full bg-white/10 text-zinc-300 border border-white/15 leading-none">
                    Live
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-xs mt-0.5 leading-normal">
                Synchronize playback real-time across friends & devices
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-white/[0.04] border border-white/10 rounded-xl text-zinc-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="text-zinc-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!currentUser && (
            <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-zinc-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-zinc-400 shrink-0" />
                <span>Sign in with your Cloud Account to host or join live rooms.</span>
              </div>
              <button
                onClick={onRequireAuth}
                className="px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded-lg text-xs shrink-0 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}

          {activeSession ? (
            /* Active Session View */
            <div className="space-y-4">
              {/* Room Card */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-400 font-medium">
                    {isHost ? 'You are Hosting' : `Listening with ${activeSession.hostDisplayName}`}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white border border-white/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Live Room
                  </span>
                </div>

                {/* Room Code Display with Copy */}
                <div className="mt-3 flex items-center justify-between bg-black/60 p-3 rounded-xl border border-white/10">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Room Code</div>
                    <div className="text-2xl font-mono font-bold tracking-widest text-white mt-0.5">
                      {activeSession.roomCode}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyCode(activeSession.roomCode)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white rounded-lg flex items-center gap-1.5 text-xs transition-all border border-white/10 cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-white" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Now Playing in Session */}
                <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <Disc3 size={13} className="text-zinc-400 animate-spin" />
                    <span>Now Playing in Session:</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
                      <Music size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white truncate">
                        {activeSession.trackTitle || 'No track selected yet'}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {activeSession.trackArtist || 'Waiting for host to pick music'}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-zinc-400 shrink-0">
                      {formatSec(activeSession.timestamp)}
                    </div>
                  </div>

                  {/* Sync Status Badge for Listener */}
                  {!isHost && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Sync with Host Playhead:</span>
                      <button
                        onClick={() => onSetSyncWithHostEnabled(!syncWithHostEnabled)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          syncWithHostEnabled
                            ? 'bg-white text-black font-semibold'
                            : 'bg-white/10 text-zinc-400 border border-white/10 hover:text-white'
                        }`}
                      >
                        {syncWithHostEnabled ? 'Enabled' : 'Paused'}
                      </button>
                    </div>
                  )}

                  {!isHost && matchedLocalTrackTitle && (
                    <div className="text-[11px] text-zinc-300 flex items-center gap-1.5 pt-1">
                      <Check size={12} className="text-white" />
                      <span>Matched local audio file: "{matchedLocalTrackTitle}"</span>
                    </div>
                  )}
                  {!isHost && !matchedLocalTrackTitle && activeSession.trackTitle && (
                    <div className="text-[11px] text-zinc-400 pt-1">
                      (Playing in cloud sync mode. Add "{activeSession.trackTitle}" to your local library for full audio mirroring).
                    </div>
                  )}
                </div>
              </div>

              {/* Leave / End button */}
              <button
                onClick={onLeaveSession}
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
              >
                <LogOut size={14} />
                <span>{isHost ? 'End Live Session' : 'Leave Room'}</span>
              </button>
            </div>
          ) : (
            /* No Active Session - Host or Join */
            <div className="space-y-4">
              {/* Option 1: Host a New Room */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-zinc-300 flex items-center justify-center shrink-0">
                    <Radio size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Start a Room as Host</h3>
                    <p className="text-[11px] text-zinc-400">Friends can join with your code and listen along</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading || !currentUser}
                  onClick={handleHostClick}
                  className="w-full py-2.5 px-4 bg-white text-black font-semibold hover:bg-zinc-200 active:scale-[0.98] text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Headphones size={14} />
                  <span>{loading ? 'Creating...' : 'Create Live Room'}</span>
                </button>
              </div>

              {/* Option 2: Join an Existing Room */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-zinc-300 flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white">Join a Friend's Room</h3>
                    <p className="text-[11px] text-zinc-400">Enter their 6-character room code</p>
                  </div>
                </div>

                <form onSubmit={handleJoinClick} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ABC123"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs font-mono tracking-wider uppercase text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                  />
                  <button
                    type="submit"
                    disabled={loading || !currentUser || !joinCodeInput.trim()}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 border border-white/10 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>Join</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
    </ModalBackdrop>
  );
};
