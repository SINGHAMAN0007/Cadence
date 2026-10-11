import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Radio, Sparkles, Music, ExternalLink, Copy, 
  Check, BookmarkPlus, BookmarkCheck, Search, RotateCcw, 
  AlertCircle, Disc, Volume2, KeyRound
} from 'lucide-react';
import { 
  captureAudioSnippet, 
  identifyAudioTrack, 
  buildYouTubeMusicUrl,
  type IdentifiedSongResult 
} from '../services/recognitionService';

interface SongRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToWishlist: (song: {
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string | null;
    ytMusicUrl: string;
  }) => Promise<void>;
}

type RecognitionStage = 'idle' | 'listening' | 'identifying' | 'success' | 'not_found' | 'error';

export const SongRecognitionModal: React.FC<SongRecognitionModalProps> = ({
  isOpen,
  onClose,
  onSaveToWishlist,
}) => {
  const [stage, setStage] = useState<RecognitionStage>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(7);
  const [audioLevels, setAudioLevels] = useState<number[]>(() => new Array(16).fill(0.12));
  const [auddToken, setAuddToken] = useState<string>(() => localStorage.getItem('audd_api_token') || '');
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);
  const [identifiedTrack, setIdentifiedTrack] = useState<IdentifiedSongResult | null>(null);
  const [ytMusicUrl, setYtMusicUrl] = useState<string>('');
  const [manualQuery, setManualQuery] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // When modal opens, start listening automatically
  useEffect(() => {
    if (!isOpen) {
      setStage('idle');
      setIdentifiedTrack(null);
      setYtMusicUrl('');
      setCopied(false);
      setIsSaved(false);
      setManualQuery('');
      setErrorMessage('');
      setAudioLevels(new Array(16).fill(0.12));
      return;
    }

    startListening();
  }, [isOpen]);

  const startListening = async () => {
    setStage('listening');
    setSecondsRemaining(7);
    setAudioLevels(new Array(16).fill(0.12));
    setIdentifiedTrack(null);
    setYtMusicUrl('');
    setCopied(false);
    setIsSaved(false);
    setErrorMessage('');

    try {
      const { blob, base64, mimeType } = await captureAudioSnippet(
        7000,
        (sec) => {
          if (isMountedRef.current) {
            setSecondsRemaining(sec);
          }
        },
        (levels) => {
          if (isMountedRef.current) {
            setAudioLevels(levels);
          }
        }
      );

      if (!isMountedRef.current) return;

      setStage('identifying');

      const response = await identifyAudioTrack(blob, base64, mimeType, auddToken.trim() || undefined);

      if (!isMountedRef.current) return;

      if (response.status === 'success' && response.result) {
        const track = response.result;
        const url = buildYouTubeMusicUrl(
          track.title,
          track.artist,
          track.youtube_url,
          track.youtube_video_id
        );
        setIdentifiedTrack(track);
        setYtMusicUrl(url);
        setManualQuery(`${track.title} ${track.artist}`);
        setStage('success');
      } else {
        setStage('not_found');
      }
    } catch (err: unknown) {
      console.warn('Recognition error:', err);
      if (isMountedRef.current) {
        const message = (err as Error)?.message || 'Microphone error or recognition failed';
        setErrorMessage(message);
        setStage(message.includes('Microphone') || message.includes('getUserMedia') ? 'error' : 'not_found');
      }
    }
  };

  const handleCopyLink = async () => {
    if (!ytMusicUrl) return;
    try {
      await navigator.clipboard.writeText(ytMusicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = ytMusicUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSaveToWishlist = async () => {
    if (!identifiedTrack || isSaved || isSaving) return;
    setIsSaving(true);
    try {
      await onSaveToWishlist({
        title: identifiedTrack.title,
        artist: identifiedTrack.artist,
        album: identifiedTrack.album,
        artworkUrl: identifiedTrack.artwork_url,
        ytMusicUrl,
      });
      setIsSaved(true);
    } catch (err) {
      console.error('Failed to save track to wishlist:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0a0a0a] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-5 sm:p-6 text-zinc-100 flex flex-col gap-5 select-none relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dynamic header gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-amber-500" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Radio size={16} className={stage === 'listening' ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Song Recognition</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  YouTube Music
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Identify music playing nearby and open in YouTube Music
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stage 1: Listening (7-Second Snippet Countdown & Live Audio Visualizer) */}
        {stage === 'listening' && (
          <div className="py-6 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
            {/* Live Visualizer Equalizer Bars & Pulse Ring */}
            <div className="relative flex items-center justify-center mb-5">
              <div 
                className="absolute w-28 h-28 rounded-full bg-rose-500/10 transition-transform duration-100 ease-out" 
                style={{ transform: `scale(${1 + (audioLevels[0] || 0.1) * 0.7})` }}
              />
              <div 
                className="absolute w-20 h-20 rounded-full bg-rose-500/20 transition-transform duration-100 ease-out" 
                style={{ transform: `scale(${1 + (audioLevels[4] || 0.1) * 0.5})` }}
              />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/40 z-10">
                <Volume2 size={26} className="animate-pulse" />
              </div>
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">
              Listening to song...
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Hold device close to the audio source
            </p>

            {/* Live Dynamic Frequency Visualizer Bars */}
            <div className="flex items-end justify-center gap-1.5 h-12 my-3 px-4">
              {audioLevels.map((lvl, i) => (
                <div
                  key={i}
                  className="w-1.5 sm:w-2 bg-gradient-to-t from-rose-600 via-rose-500 to-amber-400 rounded-full transition-all duration-75 ease-out"
                  style={{
                    height: `${Math.max(4, Math.min(48, lvl * 48))}px`,
                    opacity: 0.6 + lvl * 0.4,
                  }}
                />
              ))}
            </div>

            {/* Countdown Badge & Progress Bar */}
            <div className="w-48 bg-white/[0.06] rounded-full h-2 overflow-hidden border border-white/10">
              <div 
                className="bg-gradient-to-r from-rose-500 to-red-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${((7 - secondsRemaining) / 7) * 100}%` }}
              />
            </div>
            <span className="mt-2 text-xs font-mono font-medium text-rose-400">
              Listening... {secondsRemaining}s remaining
            </span>
          </div>
        )}

        {/* Stage 2: Identifying (Processing audio fingerprint) */}
        {stage === 'identifying' && (
          <div className="py-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-rose-400 mb-4 shadow-xl">
              <Sparkles size={28} className="animate-spin duration-1000 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Analyzing audio fingerprint...
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Matching pattern against song database
            </p>
          </div>
        )}

        {/* Stage 3: Result Card UI & Actions */}
        {stage === 'success' && identifiedTrack && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Track Info Card */}
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3.5 shadow-lg">
              {/* Album Art */}
              <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0 shadow-md flex items-center justify-center relative">
                {identifiedTrack.artwork_url ? (
                  <img 
                    src={identifiedTrack.artwork_url} 
                    alt={identifiedTrack.title}
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Disc size={26} className="text-rose-400 animate-spin" />
                )}
              </div>

              {/* Title, Artist, Album */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    Track Identified
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white truncate mt-0.5" title={identifiedTrack.title}>
                  {identifiedTrack.title}
                </h3>
                <p className="text-xs text-zinc-300 truncate mt-0.5" title={identifiedTrack.artist}>
                  {identifiedTrack.artist}
                </p>
                <p className="text-[11px] text-zinc-500 truncate" title={identifiedTrack.album}>
                  {identifiedTrack.album || 'Single'}
                </p>
              </div>
            </div>

            {/* Primary Button: [ 🎵 Listen on YouTube Music ] */}
            <a
              href={ytMusicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Music size={15} />
              <span>🎵 Listen on YouTube Music</span>
              <ExternalLink size={13} className="opacity-80" />
            </a>

            {/* Secondary Actions: [ 📋 Copy Link ]  [ ➕ Save to Wishlist ]  [ ❌ Dismiss ] */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/10 text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Copy YouTube Music link"
              >
                {copied ? (
                  <>
                    <Check size={13} className="text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 truncate">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} className="text-zinc-400 shrink-0" />
                    <span className="truncate">📋 Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveToWishlist}
                disabled={isSaved || isSaving}
                className={`py-2.5 px-2 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                  isSaved
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 cursor-default'
                    : 'bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.12] border-white/10 text-zinc-200'
                }`}
                title="Save to offline Wanted / Identified Tracks playlist"
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck size={13} className="text-emerald-400 shrink-0" />
                    <span className="truncate">Saved!</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={13} className="text-zinc-400 shrink-0" />
                    <span className="truncate">{isSaving ? 'Saving...' : '➕ Save'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Dismiss dialog"
              >
                <X size={13} className="text-zinc-400 shrink-0" />
                <span className="truncate">❌ Dismiss</span>
              </button>
            </div>

            {/* Listen again footer */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={startListening}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1"
              >
                <RotateCcw size={12} />
                <span>Identify Another Song</span>
              </button>

              <span className="text-[11px] text-zinc-500">
                Tap YouTube Music to play in app
              </span>
            </div>
          </div>
        )}

        {/* Stage 4: Not Found / Manual Search Fallback */}
        {(stage === 'not_found' || stage === 'error') && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <AlertCircle size={24} className="text-amber-400 mx-auto mb-2" />
              <h3 className="text-xs font-semibold text-amber-200">
                Couldn't identify track
              </h3>
              <p className="text-[11px] text-zinc-300 mt-1">
                Couldn't identify track. Try searching directly on YouTube Music
              </p>
            </div>

            {/* Manual YouTube Music Search Fallback */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1.5">
                Search directly on YouTube Music:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      window.open(
                        `https://music.youtube.com/search?q=${encodeURIComponent(manualQuery.trim() || 'trending')}`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }
                  }}
                  placeholder="Type song title, artist, or lyrics..."
                  className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <a
                  href={`https://music.youtube.com/search?q=${encodeURIComponent(manualQuery || 'trending songs')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-md"
                >
                  <Search size={13} />
                  <span>Search</span>
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={startListening}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <X size={13} />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        )}

        {/* Discreet AudD API Key Setting (Option 4) */}
        <div className="pt-2 border-t border-white/[0.08]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer py-1"
            >
              <KeyRound size={12} className="text-rose-400" />
              <span>{showTokenInput ? 'Hide AudD Token' : 'AudD API Token (Optional)'}</span>
            </button>
            {auddToken && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                Saved
              </span>
            )}
          </div>

          {showTokenInput && (
            <div className="mt-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1.5 animate-in fade-in duration-150">
              <label className="block text-[11px] font-medium text-zinc-300">
                AudD API Token (Optional)
              </label>
              <input
                type="text"
                value={auddToken}
                onChange={(e) => {
                  const val = e.target.value;
                  setAuddToken(val);
                  if (val.trim()) {
                    localStorage.setItem('audd_api_token', val.trim());
                  } else {
                    localStorage.removeItem('audd_api_token');
                  }
                }}
                placeholder="Paste token or leave empty for free demo & Gemini"
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <p className="text-[10px] text-zinc-400 leading-tight">
                Leave empty to use shared demo quota and Gemini acoustic search. Get your free personal token at <a href="https://audd.io" target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:underline">audd.io</a>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
