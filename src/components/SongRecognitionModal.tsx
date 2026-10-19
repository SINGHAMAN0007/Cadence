import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Radio, Sparkles, ExternalLink, Copy, 
  Check, BookmarkPlus, BookmarkCheck, Search, RotateCcw, 
  AlertCircle, Disc, Volume2, KeyRound
} from 'lucide-react';
import { 
  captureAudioSnippet, 
  identifyAudioTrack, 
  buildYouTubeMusicUrl,
  buildSpotifyUrl,
  type IdentifiedSongResult 
} from '../services/recognitionService';
import { ModalBackdrop } from './ModalBackdrop';

export const SpotifyIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10s10-4.476 10-10c0-5.523-4.477-10-10-10zm4.587 14.424c-.18.295-.563.387-.857.207-2.35-1.436-5.308-1.76-8.793-.963-.335.077-.67-.133-.746-.469-.077-.334.132-.67.467-.746 3.809-.87 7.077-.497 9.722 1.115.294.18.386.562.207.856zm1.224-2.72c-.227.368-.71.482-1.078.256-2.69-1.654-6.79-2.132-9.972-1.166-.413.125-.85-.107-.975-.521-.125-.413.107-.85.52-.975 3.633-1.103 8.147-.57 11.25 1.339.368.225.48.708.255 1.067zm.105-2.836C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.018-.129-1.168-.623-.15-.495.13-1.018.624-1.168 3.532-1.072 9.404-.866 13.115 1.338.445.264.59.838.327 1.282-.264.444-.838.59-1.28.329z" />
  </svg>
);

export const YouTubeMusicIcon: React.FC<{ className?: string; size?: number }> = ({ className = 'w-4 h-4', size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-13.5c-3.03 0-5.5 2.47-5.5 5.5s2.47 5.5 5.5 5.5 5.5-2.47 5.5-5.5-2.47-5.5-5.5-5.5zm0 9c-1.93 0-3.5-1.57-3.5-3.5S10.07 8.5 12 8.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5zm-1.5-5.25v3.5l3-1.75-3-1.75z" />
  </svg>
);

interface SongRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToWishlist: (song: {
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string | null;
    ytMusicUrl: string;
    spotifyUrl?: string;
  }) => Promise<void>;
}

type RecognitionStage = 'idle' | 'listening' | 'identifying' | 'success' | 'not_found' | 'error';
export type PreferredMusicPlatform = 'yt_music' | 'spotify';

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
  const [spotifyUrl, setSpotifyUrl] = useState<string>('');
  const [manualQuery, setManualQuery] = useState<string>('');
  const [copiedType, setCopiedType] = useState<'yt_music' | 'spotify' | 'default' | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // User's default platform preference: 'yt_music' | 'spotify'
  const [preferredPlatform, setPreferredPlatform] = useState<PreferredMusicPlatform>(() => {
    return (localStorage.getItem('preferred_music_platform') as PreferredMusicPlatform) || 'yt_music';
  });

  const handleTogglePreferredPlatform = (platform: PreferredMusicPlatform) => {
    setPreferredPlatform(platform);
    localStorage.setItem('preferred_music_platform', platform);
  };

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
      setSpotifyUrl('');
      setCopiedType(null);
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
    setSpotifyUrl('');
    setCopiedType(null);
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
        const ytUrl = buildYouTubeMusicUrl(
          track.title,
          track.artist,
          track.youtube_url,
          track.youtube_video_id
        );
        const spUrl = track.spotify_url || buildSpotifyUrl(track.title, track.artist);

        setIdentifiedTrack(track);
        setYtMusicUrl(ytUrl);
        setSpotifyUrl(spUrl);
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

  const handleCopyLink = async (target: 'preferred' | 'yt_music' | 'spotify' = 'preferred') => {
    let targetUrl = '';
    let copyTypeKey: 'yt_music' | 'spotify' | 'default' = 'default';

    if (target === 'yt_music' || (target === 'preferred' && preferredPlatform === 'yt_music')) {
      targetUrl = ytMusicUrl;
      copyTypeKey = 'yt_music';
    } else {
      targetUrl = spotifyUrl;
      copyTypeKey = 'spotify';
    }

    if (!targetUrl) return;

    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedType(copyTypeKey);
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = targetUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedType(copyTypeKey);
      setTimeout(() => setCopiedType(null), 2500);
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
        spotifyUrl,
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
    <ModalBackdrop
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md bg-black p-5 sm:p-6 text-zinc-100 flex flex-col gap-5"
    >
      {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
              <Radio size={16} className={stage === 'listening' ? 'animate-pulse text-white' : 'text-zinc-300'} />
            </div>
            <div>
              <h2 className="text-white font-semibold text-base tracking-tight leading-tight">
                Song Recognition
              </h2>
              <p className="text-zinc-400 text-xs mt-0.5 leading-normal">
                Identify audio playing nearby or search music platforms
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

        {/* Stage 1: Listening (7-Second Snippet Countdown & Live Audio Visualizer) */}
        {stage === 'listening' && (
          <div className="py-6 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
            {/* Live Visualizer Equalizer Pulse Rings */}
            <div className="relative flex items-center justify-center mb-5">
              <div 
                className="absolute w-28 h-28 rounded-full bg-white/[0.04] transition-transform duration-100 ease-out" 
                style={{ transform: `scale(${1 + (audioLevels[0] || 0.1) * 0.7})` }}
              />
              <div 
                className="absolute w-20 h-20 rounded-full bg-white/[0.07] transition-transform duration-100 ease-out" 
                style={{ transform: `scale(${1 + (audioLevels[4] || 0.1) * 0.5})` }}
              />
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-xl z-10">
                <Volume2 size={24} className="animate-pulse" />
              </div>
            </div>

            <h3 className="text-base font-semibold text-white tracking-tight">
              Listening to audio...
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Hold device close to the music source
            </p>

            {/* Live Dynamic Frequency Visualizer Bars */}
            <div className="flex items-end justify-center gap-1.5 h-12 my-3 px-4">
              {audioLevels.map((lvl, i) => (
                <div
                  key={i}
                  className="w-1.5 sm:w-2 bg-white/80 rounded-full transition-all duration-75 ease-out"
                  style={{
                    height: `${Math.max(4, Math.min(48, lvl * 48))}px`,
                    opacity: 0.4 + lvl * 0.6,
                  }}
                />
              ))}
            </div>

            {/* Countdown Badge & Progress Bar */}
            <div className="w-48 bg-white/[0.06] rounded-full h-1.5 overflow-hidden border border-white/10">
              <div 
                className="bg-white h-full transition-all duration-1000 ease-linear"
                style={{ width: `${((7 - secondsRemaining) / 7) * 100}%` }}
              />
            </div>
            <span className="mt-2 text-xs font-mono font-medium text-zinc-300">
              Capturing snippet... {secondsRemaining}s remaining
            </span>
          </div>
        )}

        {/* Stage 2: Identifying (Processing audio fingerprint) */}
        {stage === 'identifying' && (
          <div className="py-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300 mb-4 shadow-xl">
              <Sparkles size={28} className="animate-spin duration-1000 text-zinc-300" />
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              Analyzing audio fingerprint...
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Searching YouTube Music & Spotify song catalogs
            </p>
          </div>
        )}

        {/* Stage 3: Result Card UI & Actions (Dual YouTube Music + Spotify Actions) */}
        {stage === 'success' && identifiedTrack && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Track Info Card */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.04] border border-white/10 flex items-center gap-3.5 shadow-lg">
              {/* Album Art */}
              <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-white/10 overflow-hidden shrink-0 shadow-md flex items-center justify-center relative">
                {identifiedTrack.artwork_url ? (
                  <img 
                    src={identifiedTrack.artwork_url} 
                    alt={identifiedTrack.title}
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <Disc size={26} className="text-zinc-400 animate-spin" />
                )}
              </div>

              {/* Title, Artist, Album */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    Track Identified
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white truncate mt-0.5" title={identifiedTrack.title}>
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

            {/* Platform Preference Toggle Bar */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs">
              <span className="text-zinc-400 text-[11px] font-medium">Default platform:</span>
              <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => handleTogglePreferredPlatform('yt_music')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    preferredPlatform === 'yt_music'
                      ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Set YouTube Music as your default preferred service"
                >
                  <YouTubeMusicIcon className="w-3 h-3 text-zinc-300 shrink-0" />
                  <span>YT Music</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTogglePreferredPlatform('spotify')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    preferredPlatform === 'spotify'
                      ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Set Spotify as your default preferred service"
                >
                  <SpotifyIcon className="w-3 h-3 text-zinc-300 shrink-0" />
                  <span>Spotify</span>
                </button>
              </div>
            </div>

            {/* Direct Platform Action Buttons (Monochrome Dark) */}
            <div className="space-y-2">
              {/* Button 1: Open in YouTube Music */}
              <a
                href={ytMusicUrl || `https://music.youtube.com/search?q=${encodeURIComponent(identifiedTrack.title + ' ' + identifiedTrack.artist)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3 px-4 rounded-xl text-xs font-medium flex items-center justify-between transition-all duration-150 active:scale-[0.99] cursor-pointer group ${
                  preferredPlatform === 'yt_music'
                    ? 'bg-white/10 border border-white/25 text-white shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <YouTubeMusicIcon className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                  <span className="truncate">Open in YouTube Music</span>
                  {preferredPlatform === 'yt_music' && (
                    <span className="text-[9.5px] uppercase font-medium tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-300 shrink-0">
                      Default
                    </span>
                  )}
                </div>
                <ExternalLink size={13} className="text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
              </a>

              {/* Button 2: Open in Spotify */}
              <a
                href={spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(identifiedTrack.title + ' ' + identifiedTrack.artist)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3 px-4 rounded-xl text-xs font-medium flex items-center justify-between transition-all duration-150 active:scale-[0.99] cursor-pointer group ${
                  preferredPlatform === 'spotify'
                    ? 'bg-white/10 border border-white/25 text-white shadow-lg'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <SpotifyIcon className="w-3.5 h-3.5 text-zinc-300" />
                  </div>
                  <span className="truncate">Open in Spotify</span>
                  {preferredPlatform === 'spotify' && (
                    <span className="text-[9.5px] uppercase font-medium tracking-wider px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-300 shrink-0">
                      Default
                    </span>
                  )}
                </div>
                <ExternalLink size={13} className="text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
              </a>
            </div>

            {/* Secondary Actions: [ 📋 Copy Link ]  [ ➕ Save to Wishlist ]  [ ❌ Dismiss ] */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCopyLink('preferred')}
                className="py-2.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title={`Copy ${preferredPlatform === 'spotify' ? 'Spotify' : 'YouTube Music'} link`}
              >
                {copiedType ? (
                  <>
                    <Check size={13} className="text-white shrink-0" />
                    <span className="text-white truncate">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} className="text-zinc-400 shrink-0" />
                    <span className="truncate">Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveToWishlist}
                disabled={isSaved || isSaving}
                className={`py-2.5 px-2 rounded-xl border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate ${
                  isSaved
                    ? 'bg-white/15 border-white/20 text-white cursor-default'
                    : 'bg-white/5 hover:bg-white/10 active:bg-white/15 border-white/10 text-zinc-200'
                }`}
                title="Save to offline Wanted / Identified Tracks playlist with YT Music & Spotify links"
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck size={13} className="text-white shrink-0" />
                    <span className="truncate">Saved!</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={13} className="text-zinc-400 shrink-0" />
                    <span className="truncate">{isSaving ? 'Saving...' : '+ Wishlist'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-2 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-zinc-300 hover:text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer truncate"
                title="Dismiss dialog"
              >
                <X size={13} className="text-zinc-400 shrink-0" />
                <span className="truncate">Dismiss</span>
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
                Opens native apps or web players
              </span>
            </div>
          </div>
        )}

        {/* Stage 4: Not Found / Error Feedback & Manual Search Fallback */}
        {(stage === 'not_found' || stage === 'error') && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Neutral state box */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <AlertCircle size={22} className="text-zinc-400 mb-2" />
              <h3 className="text-sm font-medium text-white">
                Couldn't identify track
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {errorMessage || 'Try searching directly on YouTube Music or Spotify'}
              </p>
            </div>

            {/* Manual Search Fallback (Both YT Music & Spotify) */}
            <div className="space-y-2">
              <label className="block text-xs text-zinc-400">
                Search directly on music platforms:
              </label>
              <div>
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const q = manualQuery.trim() || 'trending';
                      if (preferredPlatform === 'spotify') {
                        window.open(`https://open.spotify.com/search/${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
                      } else {
                        window.open(`https://music.youtube.com/search?q=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
                      }
                    }
                  }}
                  placeholder="Type song title, artist, or lyrics..."
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
                />
              </div>

              {/* Direct Platform Search Buttons (YouTube Music & Spotify) */}
              <div className="flex gap-2 pt-1">
                <a
                  href={`https://music.youtube.com/search?q=${encodeURIComponent(manualQuery || 'trending songs')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium transition-colors"
                >
                  <YouTubeMusicIcon className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Search YT Music</span>
                </a>
                <a
                  href={`https://open.spotify.com/search/${encodeURIComponent(manualQuery || 'trending songs')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-medium transition-colors"
                >
                  <SpotifyIcon className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Search Spotify</span>
                </a>
              </div>
            </div>

            {/* Action Controls: High-contrast pill 'Try Again' and text button 'Dismiss' */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={startListening}
                className="bg-white text-black font-semibold hover:bg-zinc-200 text-xs py-2 px-4 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-white py-2 px-3 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Discreet AudD API Key Setting */}
        <div className="pt-2 border-t border-white/[0.08]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer py-1"
            >
              <KeyRound size={12} className="text-zinc-400" />
              <span>{showTokenInput ? 'Hide AudD Token' : 'AudD API Token (Optional)'}</span>
            </button>
            {auddToken && (
              <span className="text-[10px] text-zinc-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/10 font-mono">
                Saved
              </span>
            )}
          </div>

          {showTokenInput && (
            <div className="mt-2 p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 animate-in fade-in duration-150">
              <label className="block text-xs text-zinc-400 font-medium">
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
                placeholder="Paste token or leave empty for demo & Gemini"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-white/30"
              />
              <p className="text-[10px] text-zinc-400 leading-tight">
                Leave empty to use shared demo quota and Gemini acoustic search. Get your free personal token at <a href="https://audd.io" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white underline">audd.io</a>.
              </p>
            </div>
          )}
        </div>
    </ModalBackdrop>
  );
};
