import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Lock, LogIn, LogOut, CheckCircle2, 
  AlertCircle, Cloud, RefreshCw, HardDrive, ShieldCheck,
  UserCheck
} from 'lucide-react';
import { ModalBackdrop } from './ModalBackdrop';
import { 
  auth, 
  syncUserMetadataToCloud, 
  fetchUserCloudMetadata 
} from '../services/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut,
  type User as FirebaseUser 
} from 'firebase/auth';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  onSyncLocalWithCloud?: () => void;
  favoritesCount: number;
  playlistsCount: number;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSyncLocalWithCloud,
  favoritesCount,
  playlistsCount
}) => {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setSuccess('Signed in successfully with Google!');
      if (onSyncLocalWithCloud) onSyncLocalWithCloud();
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setError(err?.message || 'Failed to sign in with Google. Check popup settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'register') {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName.trim()) {
          await updateProfile(userCred.user, { displayName: displayName.trim() });
        }
        setSuccess('Account created successfully!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess('Logged in successfully!');
      }
      if (onSyncLocalWithCloud) onSyncLocalWithCloud();
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Auth error:', err);
      const code = err?.code;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/email-already-in-use') {
        setError('This email is already in use. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err?.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setLoading(true);
    try {
      await signOut(auth);
      setSuccess('Signed out successfully.');
      setTimeout(() => {
        setSuccess(null);
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!currentUser) return;
    setSyncing(true);
    setError(null);
    try {
      if (onSyncLocalWithCloud) {
        await onSyncLocalWithCloud();
      }
      setSuccess('Cloud metadata synchronized!');
      setTimeout(() => setSuccess(null), 1800);
    } catch (err: any) {
      setError(err?.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md bg-black p-6"
      aria-labelledby="account-dialog-title"
    >
      {/* Top Close (X) Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close Account Dialog"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-5 relative">
          <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
            <Cloud size={20} />
          </div>
          <div className="min-w-0 pr-8">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="account-dialog-title" className="text-lg font-bold text-white tracking-tight">
                Cloud Account
              </h2>
              <span className="text-[11px] font-mono text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
                Firebase
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {currentUser ? 'Manage cloud sync, playlists, and session state.' : 'Backup your music metadata & sync across devices.'}
            </p>
          </div>
        </div>

        {/* Notifications / Feedback */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-white/[0.04] border border-white/10 rounded-xl text-zinc-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 size={15} className="shrink-0 text-zinc-300" />
            <span className="leading-snug">{success}</span>
          </div>
        )}

        {currentUser ? (
          /* Authenticated User View */
          <div className="space-y-4">
            {/* Profile Card */}
            <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl flex items-center gap-3.5">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'User'} 
                  className="w-11 h-11 rounded-full ring-1 ring-white/10 object-cover shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white font-medium text-sm shrink-0">
                  {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                  {currentUser.displayName || 'Cadence User'}
                  <ShieldCheck size={14} className="text-zinc-400 shrink-0" />
                </div>
                <div className="text-xs text-zinc-400 truncate mt-0.5">
                  {currentUser.email || 'Anonymous Cloud Session'}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  Synced with secure cloud storage
                </div>
              </div>
            </div>


            {/* Offline-First Architecture Highlight Card */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-start gap-3 text-left">
              <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-zinc-400 mt-0.5">
                <HardDrive size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-white">
                  Local Audio, Cloud Metadata
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Audio files remain safely cached in your local browser storage. Favorites and playlists sync effortlessly across devices.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={syncing}
                className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-medium flex items-center justify-center gap-2 border border-white/10 hover:border-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Unauthenticated / Sign-in Tabs */
          <div className="space-y-4">
            {/* Google Sign In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[11px] text-zinc-500 uppercase tracking-wider">or email</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>

            {/* Tab Selector */}
            <div className="flex p-1 bg-white/[0.04] rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setTab('signin')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  tab === 'signin' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  tab === 'register' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-3">
              {tab === 'register' && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Your Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Aman"
                      className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 active:scale-[0.99] text-black rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <LogIn size={14} />
                {loading ? 'Processing...' : tab === 'signin' ? 'Sign In' : 'Create Free Account'}
              </button>
            </form>

            {/* Guest / Offline Mode Option */}
            <div className="pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-3 text-zinc-400 hover:text-white rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserCheck size={14} />
                Continue as Guest (Offline Mode)
              </button>
            </div>
          </div>
        )}
    </ModalBackdrop>
  );
};
