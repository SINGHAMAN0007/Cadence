import React, { useState, useEffect } from 'react';
import { 
  X, Radio, Users, Copy, Check, Play, Pause, 
  Volume2, Share2, Sparkles, AlertCircle, LogOut,
  Headphones, Disc3, Music, ShieldCheck, ArrowRight
} from 'lucide-react';
import type { Track } from '../types';
import type { PlaybackSessionData } from '../services/firebase';
import { 
  createPlaybackSession, 
  findSessionByRoomCode, 
  endPlaybackSession,
  DEVICE_ID
} from '../services/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-rose-500 to-amber-500" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Radio size={20} className={activeSession ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Listen Together
                <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Live Sync
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Synchronize playback real-time across friends & devices
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!currentUser && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-amber-400 shrink-0" />
                <span>Sign in with your Cloud Account to host or join live rooms.</span>
              </div>
              <button
                onClick={onRequireAuth}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg text-xs shrink-0 transition-colors"
              >
                Sign In
              </button>
            </div>
          )}

          {activeSession ? (
            /* Active Session View */
            <div className="space-y-4">
              {/* Room Card */}
              <div className="p-4 bg-white/[0.04] border border-cyan-500/30 rounded-xl relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Live
                  </span>
                </div>

                <div className="text-xs text-zinc-400 font-medium">
                  {isHost ? 'You are Hosting' : `Listening with ${activeSession.hostDisplayName}`}
                </div>

                {/* Big Room Code with Copy */}
                <div className="mt-2 flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Room Code</div>
                    <div className="text-2xl font-mono font-bold tracking-widest text-cyan-400">
                      {activeSession.roomCode}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopyCode(activeSession.roomCode)}
                    className="p-2 bg-white/10 hover:bg-white/15 text-zinc-200 hover:text-white rounded-lg flex items-center gap-1.5 text-xs transition-all"
                  >
                    {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Now Playing in Session */}
                <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <Disc3 size={13} className="text-cyan-400 animate-spin" />
                    Now Playing in Session:
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          syncWithHostEnabled
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-white/10 text-zinc-400 border border-white/10'
                        }`}
                      >
                        {syncWithHostEnabled ? 'Enabled' : 'Paused'}
                      </button>
                    </div>
                  )}

                  {!isHost && matchedLocalTrackTitle && (
                    <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                      <Check size={12} />
                      Matched local offline audio file: "{matchedLocalTrackTitle}"
                    </div>
                  )}
                  {!isHost && !matchedLocalTrackTitle && activeSession.trackTitle && (
                    <div className="text-[10px] text-zinc-400">
                      (Playing in cloud sync mode. Add "{activeSession.trackTitle}" to your local library for full audio mirroring).
                    </div>
                  )}
                </div>
              </div>

              {/* Leave / End button */}
              <button
                onClick={onLeaveSession}
                className="w-full py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-red-500/20 transition-all"
              >
                <LogOut size={15} />
                {isHost ? 'End Live Session' : 'Leave Room'}
              </button>
            </div>
          ) : (
            /* No Active Session - Host or Join */
            <div className="space-y-5">
              {/* Option 1: Host a New Room */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
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
                  className="w-full py-2 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 active:scale-[0.98] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  <Headphones size={14} />
                  {loading ? 'Creating...' : 'Create Live Room'}
                </button>
              </div>

              {/* Option 2: Join an Existing Room */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
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
                    className="flex-1 px-3 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-xs font-mono tracking-wider uppercase text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50"
                  />
                  <button
                    type="submit"
                    disabled={loading || !currentUser || !joinCodeInput.trim()}
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 border border-white/10 transition-all disabled:opacity-50"
                  >
                    <span>Join</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
