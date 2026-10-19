import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { Track, RepeatMode } from '../types';
import { db } from '../services/db';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import { sanitizeMetadata } from '../utils/sanitizeMetadata';

export interface PlayerState {
  // playback
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0.0 to 1.0
  isMuted: boolean;
  playbackRate: number; // default 1.0

  // queue
  queue: Track[];
  queueIndex: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;

  // library & collections
  tracks: Track[];
  favoriteIds: string[];
  playlists: Record<string, string[]>; // playlistName -> trackIds

  // activeModals
  isLyricsOpen: boolean;
  isAboutOpen: boolean;
  isImportOpen: boolean;
  isTimerOpen: boolean;
}

export interface PlayerActions {
  // Essential Player Actions
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (seconds: number) => void;
  setVolume: (level: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleFavorite: (trackId: string | number) => void;

  // State Setters
  setCurrentTrack: React.Dispatch<React.SetStateAction<Track | null>>;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setQueue: React.Dispatch<React.SetStateAction<Track[]>>;
  setQueueIndex: React.Dispatch<React.SetStateAction<number>>;
  setIsShuffle: React.Dispatch<React.SetStateAction<boolean>>;
  setRepeatMode: React.Dispatch<React.SetStateAction<RepeatMode>>;
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  setFavoriteIds: React.Dispatch<React.SetStateAction<string[]>>;
  setPlaylists: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;

  // Modal Setters
  setIsLyricsOpen: (open: boolean) => void;
  setIsAboutOpen: (open: boolean) => void;
  setIsImportOpen: (open: boolean) => void;
  setIsTimerOpen: (open: boolean) => void;

  // Database reload helper
  loadLibrary: () => Promise<void>;
}

export type PlayerContextValue = PlayerState & PlayerActions & {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  analyser: AnalyserNode | null;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export interface PlayerProviderProps {
  children: React.ReactNode;
  initialTracks?: Track[];
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children, initialTracks = [] }) => {
  // --- 1. Playback State ---
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cadence_volume');
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.85;
    } catch {
      return 0.85;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRateState] = useState<number>(1.0);

  // --- 2. Queue State ---
  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isShuffle, setIsShuffleState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cadence_shuffle') === 'true';
    } catch {
      return false;
    }
  });
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(() => {
    try {
      const saved = localStorage.getItem('cadence_repeat');
      if (saved === 'all' || saved === 'one' || saved === 'off') return saved;
      return 'off';
    } catch {
      return 'off';
    }
  });

  // --- 3. Library & Collections State ---
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [favoriteIds, setFavoriteIdsState] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cadence_favorites') || localStorage.getItem('cadence_favorite_ids');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.map(String);
      }
      return [];
    } catch {
      return [];
    }
  });
  const [playlists, setPlaylists] = useState<Record<string, string[]>>({});

  // --- 4. Active Modals State ---
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [isTimerOpen, setIsTimerOpen] = useState<boolean>(false);

  // --- Audio Pipeline ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const { analyser, setupAnalyser } = useAudioVisualizer(audioRef, isPlaying);

  // Helper ref to avoid stale closure during native audio event dispatch
  const nextTrackRef = useRef<() => void>(() => {});

  // Synchronize shuffle in localStorage
  const setIsShuffle = useCallback<React.Dispatch<React.SetStateAction<boolean>>>((action) => {
    setIsShuffleState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('cadence_shuffle', next.toString());
      } catch {}
      return next;
    });
  }, []);

  // Synchronize repeatMode in localStorage
  const setRepeatMode = useCallback<React.Dispatch<React.SetStateAction<RepeatMode>>>((action) => {
    setRepeatModeState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('cadence_repeat', next);
      } catch {}
      return next;
    });
  }, []);

  // Synchronize favoriteIds in state, localStorage, and window event
  const setFavoriteIds = useCallback<React.Dispatch<React.SetStateAction<string[]>>>((action) => {
    setFavoriteIdsState(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('cadence_favorites', JSON.stringify(next));
        localStorage.setItem('cadence_favorite_ids', JSON.stringify(next));
        window.dispatchEvent(new Event('cadence_favorites_updated'));
      } catch (err) {
        console.warn('Failed saving favorites to localStorage:', err);
      }
      return next;
    });
  }, []);

  // Listen for cross-component favorites sync events
  useEffect(() => {
    const handleFavoritesUpdated = () => {
      try {
        const stored = localStorage.getItem('cadence_favorites') || localStorage.getItem('cadence_favorite_ids');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setFavoriteIdsState(parsed.map(String));
          }
        }
      } catch {}
    };

    window.addEventListener('cadence_favorites_updated', handleFavoritesUpdated);
    return () => window.removeEventListener('cadence_favorites_updated', handleFavoritesUpdated);
  }, []);

  // Load Library & Collections from IndexedDB
  const loadLibrary = useCallback(async () => {
    try {
      const rawTracks = await db.tracks.toArray();
      const hydratedTracks: Track[] = rawTracks.map(t => {
        const isFav = favoriteIds.includes(String(t.id));
        const sanitized = sanitizeMetadata(t.title, t.artist, t.album);
        return {
          ...t,
          title: sanitized.title,
          artist: sanitized.artist,
          album: sanitized.album,
          blob: t.blob || (t.file as Blob),
          file: t.blob || t.file,
          addedAt: t.addedAt || t.createdAt || Date.now(),
          createdAt: t.addedAt || t.createdAt || Date.now(),
          isFavorite: isFav,
        };
      });
      setTracks(hydratedTracks);

      const rawPlaylists = await db.playlists.toArray();
      const playlistMap: Record<string, string[]> = {};
      rawPlaylists.forEach(pl => {
        playlistMap[pl.name] = (pl.trackIds || []).map(String);
      });
      setPlaylists(playlistMap);
    } catch (err) {
      console.warn('Could not load library from IndexedDB:', err);
    }
  }, [favoriteIds]);

  // Keep queueIndex up-to-date when currentTrack or queue changes
  useEffect(() => {
    if (!currentTrack) {
      setQueueIndex(-1);
      return;
    }
    const idx = queue.findIndex(t => String(t.id) === String(currentTrack.id));
    setQueueIndex(idx);
  }, [currentTrack, queue]);

  // --- Essential Player Action: playTrack ---
  const playTrack = useCallback((track: Track, newQueue?: Track[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    setupAnalyser();

    // Revoke previous blob URL to prevent memory leaks
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    try {
      const audioBlob = track.blob || track.file;
      const audioUrl = (track as any).audioUrl;

      if ((!audioBlob || audioBlob.size === 0) && !audioUrl) {
        console.warn('Track file is missing or empty:', track.title);
        return;
      }

      const url = audioUrl || URL.createObjectURL(audioBlob);
      if (!audioUrl) {
        currentBlobUrlRef.current = url;
      }

      // 1. Reset time & load source
      audio.src = url;
      audio.currentTime = 0;
      setCurrentTime(0);
      audio.playbackRate = playbackRate;
      audio.volume = isMuted ? 0 : volume;

      // 2. Set current track & play state
      setCurrentTrack(track);
      setIsPlaying(true);

      if (newQueue !== undefined) {
        setQueue(newQueue);
      }

      // 3. Trigger playback
      audio.play().then(() => {
        setIsPlaying(true);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Auto-play blocked or interrupted:', err);
          setIsPlaying(false);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
        }
      });

      // Update MediaSession metadata
      if ('mediaSession' in navigator) {
        try {
          const artwork = track.coverDataUrl
            ? [{ src: track.coverDataUrl, sizes: '512x512', type: 'image/jpeg' }]
            : [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }];

          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
            artwork,
          });
        } catch {}
      }
    } catch (err) {
      console.error('Failed to play track:', err);
      setIsPlaying(false);
    }
  }, [setupAnalyser, playbackRate, isMuted, volume]);

  // --- Essential Player Action: togglePlay ---
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack && tracks.length > 0) {
      playTrack(tracks[0]);
      return;
    }

    if (!currentTrack) return;

    setupAnalyser();

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Error starting audio playback:', err);
        }
      });
    }
  }, [currentTrack, tracks, isPlaying, playTrack, setupAnalyser]);

  // --- Essential Player Action: nextTrack ---
  const nextTrack = useCallback(() => {
    const audio = audioRef.current;

    // 1. Single-track repeat check: replays current track from start
    if (repeatMode === 'one' && audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
      audio.play().catch(console.error);
      setIsPlaying(true);
      return;
    }

    // 2. Check if manual queue has upcoming tracks
    if (queue.length > 0) {
      const nextSong = queue[0];
      const remainingQueue = queue.slice(1);
      playTrack(nextSong, remainingQueue);
      return;
    }

    // 3. Resolve active list
    const currentList = tracks;
    if (currentList.length === 0) {
      setIsPlaying(false);
      return;
    }

    const currentIndex = currentList.findIndex(t => String(t.id) === String(currentTrack?.id));
    if (currentIndex === -1) {
      playTrack(currentList[0]);
      return;
    }

    // 4. Shuffle logic
    if (isShuffle) {
      let randomIndex = Math.floor(Math.random() * currentList.length);
      if (currentList.length > 1 && randomIndex === currentIndex) {
        randomIndex = (randomIndex + 1) % currentList.length;
      }
      playTrack(currentList[randomIndex]);
      return;
    }

    // 5. Sequential next track
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentList.length) {
      playTrack(currentList[nextIndex]);
    } else if (repeatMode === 'all') {
      // Loop back to start if repeat 'all' is enabled
      playTrack(currentList[0]);
    } else {
      // Reached the end of list
      setIsPlaying(false);
    }
  }, [repeatMode, queue, tracks, currentTrack, isShuffle, playTrack]);

  // Keep nextTrackRef up-to-date for native audio event handling
  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  // --- Essential Player Action: prevTrack ---
  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!currentTrack || !audio) return;

    // If played more than 3 seconds, restart current track from beginning
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    // Otherwise jump to previous track in list (index - 1)
    const currentList = tracks;
    if (currentList.length > 0) {
      const currentIndex = currentList.findIndex(t => String(t.id) === String(currentTrack.id));
      if (currentIndex > 0) {
        playTrack(currentList[currentIndex - 1]);
      } else if (repeatMode === 'all') {
        playTrack(currentList[currentList.length - 1]);
      } else {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
    }
  }, [currentTrack, tracks, repeatMode, playTrack]);

  // --- Essential Player Action: seek ---
  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  // --- Essential Player Action: setVolume ---
  const setVolume = useCallback((level: number) => {
    const clamped = Math.max(0, Math.min(1, level));
    setVolumeState(clamped);

    try {
      localStorage.setItem('cadence_volume', clamped.toString());
    } catch {}

    if (audioRef.current && !isMuted) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  // Set Playback Rate
  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  // --- Essential Player Action: toggleFavorite ---
  const toggleFavorite = useCallback((trackId: string | number) => {
    const strId = String(trackId);
    setFavoriteIds((prev) => {
      const exists = prev.some(id => String(id) === strId);
      const next = exists
        ? prev.filter(id => String(id) !== strId)
        : Array.from(new Set([...prev.map(String), strId]));
      
      // Update IndexedDB record
      const numericId = typeof trackId === 'number' ? trackId : parseInt(strId, 10);
      if (!isNaN(numericId)) {
        db.tracks.update(numericId, { isFavorite: !exists }).catch(console.warn);
      }

      // Also update in tracks state
      setTracks(currentTracks =>
        currentTracks.map(t =>
          String(t.id) === strId ? { ...t, isFavorite: !exists } : t
        )
      );

      // Also update currentTrack if active
      setCurrentTrack(curr =>
        curr && String(curr.id) === strId ? { ...curr, isFavorite: !exists } : curr
      );

      return next;
    });
  }, [setFavoriteIds]);

  // Audio element event handlers
  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  }, []);

  const handlePlayEvent = useCallback(() => {
    setIsPlaying(true);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  }, []);

  const handlePauseEvent = useCallback(() => {
    setIsPlaying(false);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }, []);

  const handleEndedEvent = useCallback(() => {
    nextTrackRef.current();
  }, []);

  const value: PlayerContextValue = {
    // playback
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,

    // queue
    queue,
    queueIndex,
    isShuffle,
    repeatMode,

    // library & collections
    tracks,
    favoriteIds,
    playlists,

    // activeModals
    isLyricsOpen,
    isAboutOpen,
    isImportOpen,
    isTimerOpen,

    // Essential Player Actions
    playTrack,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    toggleFavorite,

    // Setters
    setCurrentTrack,
    setIsPlaying,
    setQueue,
    setQueueIndex,
    setIsShuffle,
    setRepeatMode,
    setTracks,
    setFavoriteIds,
    setPlaylists,

    // Modal Setters
    setIsLyricsOpen,
    setIsAboutOpen,
    setIsImportOpen,
    setIsTimerOpen,

    // Load helper
    loadLibrary,

    // Refs
    audioRef,
    analyser,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Master HTML5 Audio Element controlled by PlayerProvider */}
      <audio
        ref={audioRef}
        onEnded={handleEndedEvent}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlayEvent}
        onPause={handlePauseEvent}
        className="hidden"
        preload="auto"
      />
    </PlayerContext.Provider>
  );
};

export const usePlayer = (): PlayerContextValue => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
