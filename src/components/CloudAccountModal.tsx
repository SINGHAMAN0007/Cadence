import React, { useState, useEffect } from 'react';
import { 
  X, Cloud, RefreshCw, LogOut, CheckCircle2, 
  AlertCircle, ShieldCheck, Heart, ListMusic, UserCheck,
  Copy, Check, Mail, Lock, LogIn, ExternalLink
} from 'lucide-react';
import { auth, googleProvider } from '../firebase';
import { 
  onAuthStateChanged, 
  signInWithRedirect, 
  getRedirectResult, 
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  type User 
} from 'firebase/auth';

export interface CloudAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onSyncLocalWithCloud?: () => void;
  favoritesCount?: number;
  playlistsCount?: number;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export const CloudAccountModal: React.FC<CloudAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser: initialUser = null,
  onSyncLocalWithCloud,
  favoritesCount = 0,
  playlistsCount = 0,
}) => {
  const [user, setUser] = useState<User | null>(initialUser || auth.currentUser);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  // Prevent background scrolling while modal is active
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Listen to active session changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (activeUser) => {
      setUser(activeUser);
    });
    return () => unsubscribe();
  }, []);

  // Handle returning redirect result (if returning from redirect sign-in)
  useEffect(() => {
    let isMounted = true;
    getRedirectResult(auth)
      .then((result) => {
        if (!isMounted) return;
        if (result && result.user) {
          setUser(result.user);
          setSuccess('Signed in successfully with Google!');
          if (onSyncLocalWithCloud) onSyncLocalWithCloud();
          setTimeout(() => setSuccess(null), 2500);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err?.code && err.code !== 'auth/null-user') {
          console.warn('Redirect sign-in handler error:', err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [onSyncLocalWithCloud]);

  if (!isOpen) return null;

  const handleCopyHostname = () => {
    if (!currentHostname) return;
    navigator.clipboard.writeText(currentHostname);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    const isIframe = typeof window !== 'undefined' && window.self !== window.top;

    try {
      if (isIframe) {
        // Inside iframes (such as the AI Studio Build preview), signInWithRedirect fails 
        // because accounts.google.com has X-Frame-Options: DENY. signInWithPopup opens 
        // a clean external popup window.
        const res = await signInWithPopup(auth, googleProvider);
        if (res.user) {
          setUser(res.user);
          setSuccess('Signed in successfully with Google!');
          if (onSyncLocalWithCloud) onSyncLocalWithCloud();
          setTimeout(() => setSuccess(null), 2000);
        }
      } else {
        // Standalone PWA / normal top-level window
        try {
          const res = await signInWithPopup(auth, googleProvider);
          if (res.user) {
            setUser(res.user);
            setSuccess('Signed in successfully with Google!');
            if (onSyncLocalWithCloud) onSyncLocalWithCloud();
            setTimeout(() => setSuccess(null), 2000);
          }
        } catch (popupErr: any) {
          if (popupErr?.code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw popupErr;
          }
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      const code = err?.code || '';

      if (code === 'auth/unauthorized-domain') {
        setError(
          `Unauthorized Domain: "${currentHostname}" is not listed in your Firebase Authorized Domains.`
        );
      } else if (code === 'auth/operation-not-allowed') {
        setError(
          'Google Provider Disabled: Enable Google under Firebase Console > Authentication > Sign-in method.'
        );
      } else if (code === 'auth/popup-blocked') {
        setError('Popup Blocked: Your browser blocked the sign-in popup. Please allow popups for this site and try again.');
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled before completing.');
      } else if (code === 'auth/cancelled-popup-request') {
        setError('Another sign-in window was already open.');
      } else {
        setError(err?.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        setUser(res.user);
        setSuccess('Account created and logged in!');
      } else {
        const res = await signInWithEmailAndPassword(auth, email, password);
        setUser(res.user);
        setSuccess('Logged in successfully!');
      }
      if (onSyncLocalWithCloud) onSyncLocalWithCloud();
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err?.message || 'Authentication failed.');
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
      setUser(null);
      setSuccess('Signed out successfully.');
      setTimeout(() => setSuccess(null), 1800);
    } catch (err: any) {
      setError(err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!user) return;
    setSyncing(true);
    setError(null);
    try {
      if (onSyncLocalWithCloud) {
        await onSyncLocalWithCloud();
      }
      setSuccess('Cloud metadata synchronized!');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err?.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-account-title"
    >
      {/* Professional Studio-Graded Frosted Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Modal Dialog Body */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden transition-all duration-200 animate-in zoom-in-95 text-zinc-100 max-h-[90vh] overflow-y-auto"
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
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-200 shrink-0">
              <Cloud size={18} />
            </div>
            <div className="min-w-0 pr-6">
              <h2 id="cloud-account-title" className="text-sm font-semibold text-white tracking-tight leading-tight">
                Cloud Account
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight truncate">
                Sync favorites, playlists, and tags
              </p>
            </div>
          </div>

          {/* Error Banner with Domain Copy Assistant if unauthorized domain */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex flex-col gap-2 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span className="flex-1 leading-relaxed text-[11px]">{error}</span>
              </div>
              {error.includes('Unauthorized Domain') && currentHostname && (
                <div className="mt-1 pt-2 border-t border-rose-500/20 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-zinc-300 truncate">{currentHostname}</span>
                  <button
                    type="button"
                    onClick={handleCopyHostname}
                    className="px-2 py-1 bg-white/10 hover:bg-white/15 text-white rounded text-[10px] flex items-center gap-1 font-mono shrink-0 cursor-pointer"
                  >
                    {copiedDomain ? <Check size={10} /> : <Copy size={10} />}
                    <span>{copiedDomain ? 'Copied' : 'Copy Domain'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-white/10 border border-white/15 text-zinc-200 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={15} className="shrink-0 text-white" />
              <span className="flex-1 text-[11px]">{success}</span>
            </div>
          )}

          {/* Conditional UI States */}
          {user ? (
            /* ================= Authenticated State ================= */
            <div className="space-y-4">
              {/* User Profile Card */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.04] border border-white/10">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-10 h-10 rounded-full border border-white/10 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">
                    {user.displayName || user.email?.split('@')[0] || 'Account'}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {user.email || 'Signed in'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  Logout
                </button>
              </div>

              {/* Cloud Synchronization Status & Metrics */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-zinc-400" />
                    Cloud Backup
                  </span>
                  <span className="font-mono text-zinc-300">Active</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                    <Heart size={13} className="text-zinc-400" />
                    <div>
                      <div className="text-[10px] text-zinc-500">Favorites</div>
                      <div className="text-xs font-semibold text-white">{favoritesCount}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
                    <ListMusic size={13} className="text-zinc-400" />
                    <div>
                      <div className="text-[10px] text-zinc-500">Playlists</div>
                      <div className="text-xs font-semibold text-white">{playlistsCount}</div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={syncing}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                  <span>{syncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* ================= Unauthenticated State ================= */
            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect your account to synchronize playlists and favorites across devices with Firebase.
              </p>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 p-1 bg-white/[0.04] border border-white/5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setAuthMode('google')}
                  className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    authMode === 'google' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Google Sign-In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('email')}
                  className={`py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    authMode === 'email' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Email & Password
                </button>
              </div>

              {authMode === 'google' ? (
                /* Google Authentication Action */
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="h-10 w-full rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2.5 shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <GoogleIcon className="w-4 h-4 shrink-0" />
                    <span>{loading ? 'Connecting...' : 'Sign in with Google'}</span>
                  </button>

                  <div className="text-[10px] text-zinc-500 text-center leading-tight">
                    Opens Google authentication popup window.
                  </div>
                </div>
              ) : (
                /* Email & Password Authentication Form */
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      required
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min 6 characters)"
                      required
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-10 w-full rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <LogIn size={14} />
                    <span>{loading ? 'Authenticating...' : isRegistering ? 'Create Account' : 'Sign In'}</span>
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                    >
                      {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                    </button>
                  </div>
                </form>
              )}

              {/* Offline / Guest Mode Action */}
              <div className="pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 px-3 text-zinc-400 hover:text-white rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserCheck size={14} />
                  <span>Continue as Guest (Local Offline Storage)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
