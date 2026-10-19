import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, Pause, Music, Search, Plus, Trash2, Clock, 
  Sparkles, UploadCloud, AlertCircle, CheckCircle2, 
  FolderPlus, Disc3, Shuffle, ListFilter, ArrowUpDown
} from 'lucide-react';
import { db } from './services/db';
import { parseAudioMetadata } from './services/metadata';
import { sanitizeMetadata } from './utils/sanitizeMetadata';
import { createDemoSynthwaveTrack, createDemoChillAmbientTrack, createDemoCosmicPulseTrack } from './services/demoTracks';
import type { 
  Track, Playlist, RepeatMode, 
  SortField, SortOrder, SleepTimerState,
  MusicCategory
} from './types';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PlayerBar } from './components/PlayerBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { TrackRow } from './components/TrackRow';
import { QueueDrawer } from './components/QueueDrawer';
import { SleepTimerModal } from './components/SleepTimerModal';
import { PlaylistModal } from './components/PlaylistModal';
import { TrackDetailsModal } from './components/TrackDetailsModal';
import { FullscreenPlayerModal } from './components/FullscreenPlayerModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ImportModal } from './components/ImportModal';
import { LyricsModal } from './components/LyricsModal';
import { ClassificationWizardModal, type PendingImportItem } from './components/ClassificationWizardModal';
import { SongRecognitionModal } from './components/SongRecognitionModal';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { CloudAccountModal } from './components/CloudAccountModal';
import { ListenTogetherModal } from './components/ListenTogetherModal';
import { AboutModal } from './components/AboutModal';
import { classifyTrackWithHeuristics } from './services/classifierService';
import { DEMO_LYRICS } from './services/lyricsService';
import { 
  auth, 
  testConnection, 
  syncUserMetadataToCloud, 
  fetchUserCloudMetadata,
  createPlaybackSession,
  updateSessionPlayback,
  findSessionByRoomCode,
  subscribeToSession,
  endPlaybackSession,
  DEVICE_ID,
  type PlaybackSessionData
} from './services/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useAudioVisualizer } from './hooks/useAudioVisualizer';

// Utility to normalize and strictly deduplicate favorite IDs as positive numbers
function normalizeFavoriteIds(raw: any): number[] {
  if (!Array.isArray(raw)) return [];
  const set = new Set<number>();
  for (const item of raw) {
    const num = Number(item);
    if (!isNaN(num) && num > 0) {
      set.add(num);
    }
  }
  return Array.from(set);
}

export default function App() {
  // --- Data State ---
  const [library, setLibrary] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentView, setCurrentView] = useState<'library' | 'favorites' | { playlistId: number }>('library');
  
  // --- Reactive Favorites State ---
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem('cadence_favorites') || localStorage.getItem('cadence_favorite_ids');
      if (raw) {
        return normalizeFavoriteIds(JSON.parse(raw));
      }
    } catch (e) {
      // ignore
    }
    return [];
  });

  // Sync favorites across components if updated elsewhere
  useEffect(() => {
    const handleSyncFavorites = () => {
      try {
        const stored = localStorage.getItem('cadence_favorites') || localStorage.getItem('cadence_favorite_ids');
        if (stored) {
          const parsed = JSON.parse(stored);
          setFavoriteIds(normalizeFavoriteIds(parsed));
        }
      } catch {}
    };
    window.addEventListener('cadence_favorites_updated', handleSyncFavorites);
    return () => window.removeEventListener('cadence_favorites_updated', handleSyncFavorites);
  }, []);

  // --- Playback State ---
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [userVolume, setUserVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cadence_volume');
      return saved ? parseFloat(saved) : 0.85;
    } catch {
      return 0.85;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  
  // --- Queue & History ---
  const [queue, setQueue] = useState<Track[]>([]);
  const [history, setHistory] = useState<Track[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);

  // --- Filtering & Sorting ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  // --- Visualizer & Fullscreen Player ---
  const [isFullscreenOpen, setIsFullscreenOpen] = useState<boolean>(false);

  // --- Sleep Timer ---
  const [sleepTimer, setSleepTimer] = useState<SleepTimerState>({
    isActive: false,
    initialSeconds: 0,
    remainingSeconds: 0,
    fadeOutEnabled: true,
  });
  const [isSleepModalOpen, setIsSleepModalOpen] = useState<boolean>(false);

  // --- Modals & Overlays ---
  const [activeMenuTrackId, setActiveMenuTrackId] = useState<number | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isIdentifyModalOpen, setIsIdentifyModalOpen] = useState<boolean>(false);
  const [isClassificationWizardOpen, setIsClassificationWizardOpen] = useState<boolean>(false);
  const [pendingImportTracks, setPendingImportTracks] = useState<PendingImportItem[]>([]);
  const [editingClassificationTrack, setEditingClassificationTrack] = useState<Track | null>(null);
  const [playlistModalOpen, setPlaylistModalOpen] = useState<boolean>(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [inspectingTrack, setInspectingTrack] = useState<Track | null>(null);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isWindowDragOver, setIsWindowDragOver] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // --- Firebase Cloud Account & Real-Time Sync State ---
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isListenTogetherOpen, setIsListenTogetherOpen] = useState<boolean>(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<PlaybackSessionData | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [syncWithHostEnabled, setSyncWithHostEnabled] = useState<boolean>(true);
  const [mobileSortOpen, setMobileSortOpen] = useState<boolean>(false);

  // --- Confirmation Dialog ---
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- Operation & Loading Indicators ---
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type?: 'success' | 'error' | 'info';
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Audio & Web Audio Pipeline ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const { analyser: analyserNodeState, setupAnalyser: setupWebAudioAnalyser } = useAudioVisualizer(audioRef, isPlaying);

  const showToast = useCallback((
    text: string, 
    type: 'success' | 'error' | 'info' = 'info',
    action?: { label: string; onClick: () => void }
  ) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage({ text, type, action });
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500); // Auto-dismiss cleanly after 2.5 seconds
  }, []);

  // Request persistent local storage on boot to prevent Android or Windows from clearing cached music files
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((isPersisted) => {
        if (isPersisted) {
          console.log('Persistent local storage granted');
        }
      }).catch((err) => {
        console.warn('Storage persistence request note:', err);
      });
    }
  }, []);

  // --- Audio Event Listeners & State Synchronization ---
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

  // Strictly synchronize navigator.mediaSession.playbackState with audio events
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

  const handleAudioError = useCallback(() => {
    console.warn('Audio playback error on track');
    setIsPlaying(false);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
    showToast('Could not play track (unsupported format or corrupted audio)', 'error');
  }, [showToast]);

  const handleTrackEndedRef = useRef<() => void>(() => {});

  // Fallback native listener to ensure audioRef.current dispatches to latest handleTrackEnded
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onNativeEnded = () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      handleTrackEndedRef.current();
    };

    audio.addEventListener('ended', onNativeEnded);

    return () => {
      audio.removeEventListener('ended', onNativeEnded);
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    };
  }, []);

  // --- Load Initial Data from IndexedDB ---
  const loadDatabase = useCallback(async () => {
    try {
      const rawTracks = await db.tracks.toArray();
      // Read localStorage favorites cache if present
      let storedFavIds: (string | number)[] = [];
      const hasStoredFavorites = localStorage.getItem('cadence_favorites') !== null || localStorage.getItem('cadence_favorite_ids') !== null;
      try {
        const stored = localStorage.getItem('cadence_favorites') || localStorage.getItem('cadence_favorite_ids');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) storedFavIds = parsed;
        }
      } catch (e) {
        // ignore
      }

      // Normalize tracks to ensure blob, addedAt, and isFavorite are hydrated, and sanitize metadata
      const tracks: Track[] = rawTracks.map(t => {
        const isFav = hasStoredFavorites 
          ? storedFavIds.some(id => String(id) === String(t.id))
          : !!t.isFavorite;
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

      // Background migration for legacy records with raw downloader watermarks
      rawTracks.forEach(t => {
        const s = sanitizeMetadata(t.title, t.artist, t.album);
        if (s.title !== t.title || s.artist !== t.artist || s.album !== (t.album || 'Single')) {
          db.tracks.update(t.id, { title: s.title, artist: s.artist, album: s.album }).catch(() => {});
        }
      });

      // Keep favoriteIds reactive state and localStorage in sync
      const allFavIds = hasStoredFavorites ? storedFavIds : tracks.filter(t => t.isFavorite).map(t => t.id);
      const normalizedFavIds = normalizeFavoriteIds(allFavIds);
      setFavoriteIds(normalizedFavIds);
      try {
        localStorage.setItem('cadence_favorites', JSON.stringify(normalizedFavIds));
        localStorage.setItem('cadence_favorite_ids', JSON.stringify(normalizedFavIds));
      } catch (e) {
        // ignore
      }

      const loadedPlaylists = await db.playlists.toArray();
      setLibrary(tracks);
      setPlaylists(loadedPlaylists);
    } catch (err) {
      console.error('Failed to load IndexedDB data:', err);
      showToast('Could not load database records', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  // Push current local metadata (favorites & playlists) to Firebase Cloud
  const pushLocalMetadataToCloud = useCallback(async (userToSync?: FirebaseUser | null) => {
    const user = userToSync ?? currentUser;
    if (!user) return;
    try {
      const allLocalTracks = await db.tracks.toArray();
      const allLocalPlaylists = await db.playlists.toArray();
      const favKeys = allLocalTracks.filter(t => t.isFavorite).map(t => `${t.title}:::${t.artist}`);
      const plMetadata = allLocalPlaylists.map(p => ({
        id: p.id,
        name: p.name || 'Playlist',
        description: p.description || '',
        createdAt: p.createdAt || Date.now(),
        coverColor: p.coverColor || '#8b5cf6',
        trackTitles: (p.trackIds || []).map(id => allLocalTracks.find(t => t.id === id)?.title).filter(Boolean) as string[],
      }));

      await syncUserMetadataToCloud({
        favoriteTrackKeys: favKeys,
        playlistMetadata: plMetadata,
      });
    } catch (err) {
      console.warn('Metadata push note:', err);
    }
  }, [currentUser]);

  // Cloud Metadata Synchronization (Favorites & Playlists)
  const syncLocalMetadataWithCloud = useCallback(async (userToSync?: FirebaseUser | null) => {
    const user = userToSync ?? currentUser;
    if (!user) return;
    try {
      const cloud = await fetchUserCloudMetadata();
      if (cloud) {
        let changed = false;
        if (cloud.favoriteTrackKeys && cloud.favoriteTrackKeys.length > 0) {
          const currentTracks = await db.tracks.toArray();
          for (const t of currentTracks) {
            const key = `${t.title}:::${t.artist}`;
            if (cloud.favoriteTrackKeys.includes(key) && !t.isFavorite) {
              await db.tracks.update(t.id, { isFavorite: true });
              changed = true;
            }
          }
        }

        // Avoid resurrecting playlists explicitly deleted by the user
        let deletedNames: string[] = [];
        try {
          deletedNames = JSON.parse(localStorage.getItem('cadence_deleted_playlist_names') || '[]');
        } catch (e) {
          deletedNames = [];
        }

        if (cloud.playlistMetadata && cloud.playlistMetadata.length > 0) {
          const currentPlaylists = await db.playlists.toArray();
          const existingNames = new Set(currentPlaylists.map(p => p.name));
          const allTracks = await db.tracks.toArray();
          for (const pl of cloud.playlistMetadata) {
            if (!existingNames.has(pl.name) && !deletedNames.includes(pl.name)) {
              const matchedIds = allTracks
                .filter(t => pl.trackTitles?.includes(t.title))
                .map(t => t.id);
              await db.playlists.add({
                name: pl.name,
                description: pl.description || '',
                createdAt: pl.createdAt || Date.now(),
                trackIds: matchedIds,
                coverColor: pl.coverColor || '#8b5cf6',
              } as Playlist);
              changed = true;
            }
          }
        }
        if (changed) {
          await loadDatabase();
        }
      }

      // Push latest local metadata to cloud
      await pushLocalMetadataToCloud(user);
    } catch (err) {
      console.warn('Metadata sync note:', err);
    }
  }, [currentUser, loadDatabase, pushLocalMetadataToCloud]);

  // Firebase Auth persistence & connectivity verification
  useEffect(() => {
    testConnection();
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        syncLocalMetadataWithCloud(user);
      }
    });
    return () => unsub();
  }, [syncLocalMetadataWithCloud]);

  // --- Play Track Logic (Zero Data Playback strictly via local Blob URLs) ---
  const playTrack = useCallback((track: Track, newQueue?: Track[]) => {
    const audio = audioRef.current;
    if (!audio) return;

    setupWebAudioAnalyser();

    // Revoke previous Blob URL to prevent memory leaks
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }

    try {
      const audioBlob = track.blob || track.file;
      const audioUrl = (track as any).audioUrl;

      if ((!audioBlob || audioBlob.size === 0) && !audioUrl) {
        if (track.lyrics && track.lyrics.includes('music.youtube.com')) {
          const match = track.lyrics.match(/https:\/\/music\.youtube\.com[^\s\n]+/);
          if (match) {
            window.open(match[0], '_blank');
            showToast('Opening YouTube Music', 'info');
            return;
          }
        }
        showToast('Saved in Wishlist', 'info');
        return;
      }

      const url = audioUrl || URL.createObjectURL(audioBlob);
      if (!audioUrl) {
        currentBlobUrlRef.current = url;
      }

      // 1. Immediately reset playback time and scrubbers to 0:00
      audio.src = url;
      audio.currentTime = 0;
      setCurrentTime(0);
      audio.playbackRate = playbackRate;
      audio.volume = isMuted ? 0 : Math.pow(userVolume, 2);

      // 2. Immediately sync UI metadata (title, artist, cover) & keep playing state
      setCurrentTrack(track);
      setIsPlaying(true);
      if (newQueue !== undefined) {
        setQueue(newQueue);
      }

      // 3. Initiate audio playback reliably on track transition
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

      if (currentTrack && currentTrack.id !== track.id) {
        setHistory(prev => [currentTrack, ...prev.filter(t => t.id !== currentTrack.id)].slice(0, 50));
      }

      // Broadcast to Listen Together session if hosting
      if (isHost && activeSession) {
        updateSessionPlayback(activeSession.id, {
          trackTitle: track.title,
          trackArtist: track.artist,
          trackAlbum: track.album,
          trackDuration: track.duration,
          isPlaying: true,
          timestamp: 0,
        }).catch(console.warn);
      }

      // Android Notification & Media Session API
      if ('mediaSession' in navigator) {
        try {
          const artworkList = track.coverDataUrl
            ? [
                { src: track.coverDataUrl, sizes: '96x96', type: 'image/jpeg' },
                { src: track.coverDataUrl, sizes: '128x128', type: 'image/jpeg' },
                { src: track.coverDataUrl, sizes: '192x192', type: 'image/jpeg' },
                { src: track.coverDataUrl, sizes: '256x256', type: 'image/jpeg' },
                { src: track.coverDataUrl, sizes: '384x384', type: 'image/jpeg' },
                { src: track.coverDataUrl, sizes: '512x512', type: 'image/jpeg' },
              ]
            : [
                { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png' },
              ];

          navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
            artwork: artworkList,
          });
        } catch {}
      }
    } catch (err) {
      console.error('Error creating track URL:', err);
      showToast('Failed to load track file', 'error');
    }
  }, [setupWebAudioAnalyser, playbackRate, isMuted, userVolume, currentTrack, showToast, isHost, activeSession]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!currentTrack && library.length > 0) {
      playTrack(library[0]);
      return;
    }

    if (!currentTrack) return;

    setupWebAudioAnalyser();

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (isHost && activeSession) {
        updateSessionPlayback(activeSession.id, {
          isPlaying: false,
          timestamp: audio.currentTime,
        }).catch(console.warn);
      }
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
        if (isHost && activeSession) {
          updateSessionPlayback(activeSession.id, {
            isPlaying: true,
            timestamp: audio.currentTime,
          }).catch(console.warn);
        }
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Error starting audio:', err);
        }
      });
    }
  }, [currentTrack, library, isPlaying, playTrack, setupWebAudioAnalyser, isHost, activeSession]);

  const prevVolumeRef = useRef<number>(userVolume || 0.7);

  // --- Volume Changes with Logarithmic / Perceptual Scaling ---
  const handleVolumeChange = useCallback((rawLevel: number) => {
    const clamped = Math.max(0, Math.min(1, rawLevel));
    setUserVolume(clamped);
    if (clamped > 0) {
      prevVolumeRef.current = clamped;
    }
    try {
      localStorage.setItem('cadence_volume', clamped.toString());
    } catch {}
    if (audioRef.current && !isMuted) {
      // Squared curve for natural auditory scaling (human hearing is logarithmic)
      audioRef.current.volume = Math.pow(clamped, 2);
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  // --- Mute Memory & Toggle ---
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setIsMuted(false);
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.7;
      setUserVolume(restored);
      if (audioRef.current) {
        audioRef.current.volume = Math.pow(restored, 2);
      }
      try {
        localStorage.setItem('cadence_volume', restored.toString());
      } catch {}
    } else {
      prevVolumeRef.current = userVolume > 0 ? userVolume : 0.7;
      setIsMuted(true);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
    }
  }, [isMuted, userVolume]);

  const handleSeek = useCallback((seekTime: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      if (isHost && activeSession) {
        updateSessionPlayback(activeSession.id, {
          timestamp: seekTime,
          isPlaying,
        }).catch(console.warn);
      }
    }
  }, [isHost, activeSession, isPlaying]);

  const handleChangePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  // --- Listen Together Session Subscription & Control ---
  useEffect(() => {
    if (!activeSession?.id) return;

    const unsub = subscribeToSession(activeSession.id, (remoteSession) => {
      if (!remoteSession || remoteSession.status === 'ended') {
        setActiveSession(null);
        setIsHost(false);
        showToast('Listen Together session ended', 'info');
        return;
      }

      if (isHost) {
        return;
      }

      if (remoteSession.updatedByDeviceId === DEVICE_ID) {
        return;
      }

      setActiveSession(remoteSession);

      if (!syncWithHostEnabled) return;

      const audio = audioRef.current;
      if (!audio) return;

      // Check for local file in IndexedDB matching host's track
      if (remoteSession.trackTitle) {
        const matchingTrack = library.find(t =>
          t.title.toLowerCase() === remoteSession.trackTitle?.toLowerCase() &&
          (!remoteSession.trackArtist || t.artist.toLowerCase() === remoteSession.trackArtist?.toLowerCase())
        ) || library.find(t =>
          t.title.toLowerCase() === remoteSession.trackTitle?.toLowerCase()
        );

        if (matchingTrack) {
          if (!currentTrack || currentTrack.id !== matchingTrack.id) {
            playTrack(matchingTrack);
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.currentTime = remoteSession.timestamp;
                setCurrentTime(remoteSession.timestamp);
                if (remoteSession.isPlaying && audioRef.current.paused) {
                  audioRef.current.play().catch(() => {});
                  setIsPlaying(true);
                } else if (!remoteSession.isPlaying && !audioRef.current.paused) {
                  audioRef.current.pause();
                  setIsPlaying(false);
                }
              }
            }, 300);
            return;
          }
        }
      }

      // Synchronize playhead drift
      if (Math.abs(audio.currentTime - remoteSession.timestamp) > 2.0) {
        audio.currentTime = remoteSession.timestamp;
        setCurrentTime(remoteSession.timestamp);
      }

      // Synchronize play / pause state
      if (remoteSession.isPlaying && audio.paused && currentTrack) {
        audio.play().catch(() => {});
        setIsPlaying(true);
      } else if (!remoteSession.isPlaying && !audio.paused) {
        audio.pause();
        setIsPlaying(false);
      } else if (!currentTrack) {
        // Virtual cloud mirroring
        setIsPlaying(remoteSession.isPlaying);
        setCurrentTime(remoteSession.timestamp);
        if (remoteSession.trackDuration) {
          setDuration(remoteSession.trackDuration);
        }
      }
    });

    return () => unsub();
  }, [activeSession?.id, isHost, syncWithHostEnabled, library, currentTrack, playTrack, showToast]);

  const handleStartHosting = async () => {
    if (!currentUser) {
      setIsAccountModalOpen(true);
      return;
    }
    const session = await createPlaybackSession(
      currentTrack ? {
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        duration: currentTrack.duration,
      } : undefined,
      isPlaying,
      currentTime
    );
    if (session) {
      setActiveSession(session);
      setIsHost(true);
      showToast(`Hosting live room ${session.roomCode}! Code copied to share.`, 'success');
      try {
        navigator.clipboard.writeText(session.roomCode);
      } catch {}
    }
  };

  const handleJoinSession = async (roomCode: string): Promise<boolean> => {
    if (!currentUser) {
      setIsAccountModalOpen(true);
      return false;
    }
    const session = await findSessionByRoomCode(roomCode);
    if (!session) return false;

    setActiveSession(session);
    setIsHost(false);
    setSyncWithHostEnabled(true);
    showToast(`Joined session ${session.roomCode} hosted by ${session.hostDisplayName}`, 'success');
    return true;
  };

  const handleLeaveSession = async () => {
    if (activeSession) {
      if (isHost) {
        await endPlaybackSession(activeSession.id);
        showToast('Ended live session', 'info');
      } else {
        showToast('Left live session', 'info');
      }
      setActiveSession(null);
      setIsHost(false);
    }
  };

  // --- Filtered & Sorted Tracks ---
  const visibleTracks = useMemo(() => {
    let list: Track[] = [];

    if (currentView === 'library') {
      list = [...library];
    } else if (currentView === 'favorites') {
      const seenKeys = new Set<string>();
      list = library.filter(t => {
        const isFav = favoriteIds.some(id => Number(id) === Number(t.id));
        if (!isFav) return false;
        const key = `${t.title.trim().toLowerCase()}:::${(t.artist || '').trim().toLowerCase()}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });
    } else if (typeof currentView === 'object') {
      const pl = playlists.find(p => p.id === currentView.playlistId);
      if (pl) {
        const trackMap = new Map(library.map(t => [t.id, t]));
        list = pl.trackIds.map(id => trackMap.get(id)).filter((t): t is Track => !!t);
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.album.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      list = list.filter(t => t.category === selectedCategory);
    }

    // Genre filter
    if (selectedGenre !== 'All') {
      list = list.filter(t => t.genre === selectedGenre);
    }

    // Sort order
    const isCustomPlaylistOrder = typeof currentView === 'object' && !searchQuery.trim();
    if (!isCustomPlaylistOrder) {
      list.sort((a, b) => {
        let valA: string | number = a[sortField] || '';
        let valB: string | number = b[sortField] || '';

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      });
    }

    return list;
  }, [library, playlists, currentView, searchQuery, sortField, sortOrder, selectedCategory, selectedGenre, favoriteIds]);

  // Aggregate category and genre counts for dynamic filter chips
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Hindi: 0, English: 0, Phonk: 0 };
    for (const t of library) {
      if (t.category && t.category in counts) {
        counts[t.category]++;
      }
    }
    return counts;
  }, [library]);

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of library) {
      if (t.genre) {
        // If a category is selected, only count genres within that category
        if (selectedCategory === 'All' || t.category === selectedCategory) {
          counts[t.genre] = (counts[t.genre] || 0) + 1;
        }
      }
    }
    return counts;
  }, [library, selectedCategory]);

  // --- Queue Navigation & Auto-Play Handler ---
  const handleTrackEnded = useCallback(() => {
    // 1. Single-track repeat mode check
    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
      return;
    }

    // Check if manual queue has upcoming tracks
    if (queue.length > 0) {
      const nextSong = queue[0];
      const remainingQueue = queue.slice(1);
      playTrack(nextSong, remainingQueue);
      return;
    }

    // 2. Locate active index in the current queue / playlist
    const currentQueue = visibleTracks.length > 0 ? visibleTracks : library;
    if (currentQueue.length === 0) {
      setIsPlaying(false);
      return;
    }

    const currentIndex = currentQueue.findIndex((t) => String(t.id) === String(currentTrack?.id));
    if (currentIndex === -1) {
      playTrack(currentQueue[0]);
      return;
    }

    // 3. Shuffle logic
    if (isShuffle) {
      let randomIndex = Math.floor(Math.random() * currentQueue.length);
      if (currentQueue.length > 1 && randomIndex === currentIndex) {
        randomIndex = (randomIndex + 1) % currentQueue.length;
      }
      playTrack(currentQueue[randomIndex]);
      return;
    }

    // 4. Sequential next track
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentQueue.length) {
      // Play next track in sequence
      playTrack(currentQueue[nextIndex]);
    } else if (repeatMode === 'all') {
      // Loop back to start if loop queue is enabled
      playTrack(currentQueue[0]);
    } else {
      // Reached the end of the queue
      setIsPlaying(false);
    }
  }, [repeatMode, queue, visibleTracks, library, currentTrack, isShuffle, playTrack]);

  // Keep ref synchronized so any native audio listeners always call the latest handler
  useEffect(() => {
    handleTrackEndedRef.current = handleTrackEnded;
  }, [handleTrackEnded]);

  const handleNext = useCallback(() => {
    if (!currentTrack) {
      const currentQueue = visibleTracks.length > 0 ? visibleTracks : library;
      if (currentQueue.length > 0) {
        playTrack(currentQueue[0]);
      }
      return;
    }

    // When manual next button is pressed during repeat 'one', advance to next track
    if (repeatMode === 'one') {
      if (queue.length > 0) {
        const nextSong = queue[0];
        const remainingQueue = queue.slice(1);
        playTrack(nextSong, remainingQueue);
        return;
      }
      const currentQueue = visibleTracks.length > 0 ? visibleTracks : library;
      if (currentQueue.length > 0) {
        const currentIndex = currentQueue.findIndex((t) => String(t.id) === String(currentTrack?.id));
        const nextIndex = currentIndex !== -1 ? (currentIndex + 1) % currentQueue.length : 0;
        playTrack(currentQueue[nextIndex]);
        return;
      }
    }

    handleTrackEnded();
  }, [currentTrack, library, repeatMode, queue, visibleTracks, playTrack, handleTrackEnded]);

  const handlePrev = useCallback(() => {
    if (!currentTrack || !audioRef.current) return;

    // If played more than 3 seconds, rewind to beginning
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    // Go to previous track in list
    const currentQueue = visibleTracks.length > 0 ? visibleTracks : library;
    if (currentQueue.length > 0) {
      const currentIndex = currentQueue.findIndex((t) => String(t.id) === String(currentTrack.id));
      if (currentIndex > 0) {
        playTrack(currentQueue[currentIndex - 1]);
      } else if (repeatMode === 'all') {
        playTrack(currentQueue[currentQueue.length - 1]);
      } else {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    }
  }, [currentTrack, visibleTracks, library, repeatMode, playTrack]);

  // Sync Bluetooth Earbuds & Headphone MediaSession Action Handlers and State
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (audioRef.current) {
            audioRef.current.play().then(() => {
              setIsPlaying(true);
              navigator.mediaSession.playbackState = 'playing';
            }).catch(() => {});
          } else {
            togglePlay();
          }
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            navigator.mediaSession.playbackState = 'paused';
          } else {
            togglePlay();
          }
        });

        // Earbud double-tap: skip to next track in queue/playlist
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handleNext();
        });

        // Earbud triple-tap: restart if currentTime > 3s, else jump to previous track
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          handlePrev();
        });

        // Handle scrubber scrubbing via details.seekTime
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            handleSeek(details.seekTime);
          }
        });

        // Skip backward by 10s
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
          const skip = details.seekOffset || 10;
          if (audioRef.current) {
            handleSeek(Math.max(0, audioRef.current.currentTime - skip));
          }
        });

        // Skip forward by 10s
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
          const skip = details.seekOffset || 10;
          if (audioRef.current) {
            handleSeek(Math.min(duration, audioRef.current.currentTime + skip));
          }
        });
      } catch (err) {
        console.warn('MediaSession handler registration note:', err);
      }
    }
  }, [togglePlay, handlePrev, handleNext, handleSeek, duration]);

  // Sync MediaSession playback state
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      } catch {}
    }
  }, [isPlaying]);

  // Sync MediaSession position state for Android notification progress bar
  useEffect(() => {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      if (duration > 0 && isFinite(duration) && currentTime >= 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: playbackRate,
            position: Math.min(currentTime, duration),
          });
        } catch {}
      }
    }
  }, [currentTime, duration, playbackRate]);

  // Sync MediaSession metadata on track change with lockscreen artwork
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          artwork: currentTrack.coverDataUrl
            ? [
                { src: currentTrack.coverDataUrl, sizes: '512x512', type: 'image/jpeg' },
                { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
              ]
            : [
                { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
              ],
        });
      } catch {}
    }
  }, [currentTrack]);

  // --- Sleep Timer Logic ---
  const startSleepTimer = useCallback((minutes: number, fadeOut: boolean) => {
    const totalSecs = Math.round(minutes * 60);
    setSleepTimer({
      isActive: true,
      initialSeconds: totalSecs,
      remainingSeconds: totalSecs,
      fadeOutEnabled: fadeOut,
    });
    showToast(`Sleep timer set for ${minutes} minutes${fadeOut ? ' with audio fade-out' : ''}`, 'info');
  }, [showToast]);

  const cancelSleepTimer = useCallback(() => {
    setSleepTimer({
      isActive: false,
      initialSeconds: 0,
      remainingSeconds: 0,
      fadeOutEnabled: true,
    });
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = userVolume;
    }
    showToast('Sleep timer cancelled', 'info');
  }, [isMuted, userVolume, showToast]);

  const extendSleepTimer = useCallback((minutes: number) => {
    setSleepTimer(prev => {
      const addedSecs = minutes * 60;
      return {
        ...prev,
        initialSeconds: prev.initialSeconds + addedSecs,
        remainingSeconds: prev.remainingSeconds + addedSecs,
      };
    });
    showToast(`Extended sleep timer by ${minutes} minutes`, 'info');
  }, [showToast]);

  // Sleep Timer countdown & volume fade tick
  useEffect(() => {
    if (!sleepTimer.isActive) return;

    const interval = setInterval(() => {
      setSleepTimer(prev => {
        if (!prev.isActive) return prev;

        const nextRemaining = prev.remainingSeconds - 1;

        // Fade out volume in the last 60 seconds
        if (prev.fadeOutEnabled && nextRemaining <= 60 && nextRemaining > 0 && audioRef.current && !isMuted) {
          const ratio = Math.max(0, nextRemaining / 60);
          audioRef.current.volume = ratio * userVolume;
        }

        // When timer reaches 0
        if (nextRemaining <= 0) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.volume = userVolume;
          }
          setIsPlaying(false);
          showToast('Sleep timer completed. Audio paused.', 'info');
          return {
            isActive: false,
            initialSeconds: 0,
            remainingSeconds: 0,
            fadeOutEnabled: true,
          };
        }

        return { ...prev, remainingSeconds: nextRemaining };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer.isActive, sleepTimer.fadeOutEnabled, userVolume, isMuted, showToast]);

  // --- Robust File Import Logic with Classification Wizard ---
  const processAndImportFiles = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList);
    // Permissive filter so Android content URIs or downloads aren't accidentally rejected
    const audioFiles = rawFiles.filter(f =>
      f.type.startsWith('audio/') ||
      /\.(mp3|wav|flac|m4a|aac|ogg|opus|wma|aiff|m4b|weba)$/i.test(f.name) ||
      f.type === 'application/ogg' ||
      f.type === 'application/octet-stream' ||
      !f.type
    );

    if (audioFiles.length === 0) {
      showToast('No audio files detected in selection', 'error');
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: audioFiles.length });
    const collected: PendingImportItem[] = [];

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      try {
        const meta = await parseAudioMetadata(file);

        // Convert to standard cloneable Blob for flawless Android IndexedDB storage
        let storageBlob: Blob = file;
        try {
          storageBlob = file.slice(0, file.size, file.type || 'audio/mpeg');
        } catch {
          storageBlob = file;
        }

        const sanitized = sanitizeMetadata(meta.title, meta.artist, meta.album);
        const initialGuess = classifyTrackWithHeuristics(sanitized.title, sanitized.artist);

        collected.push({
          file: storageBlob,
          meta: {
            title: sanitized.title,
            artist: sanitized.artist,
            album: sanitized.album,
            duration: meta.duration,
            format: meta.format || file.type || 'audio/mpeg',
            size: file.size,
            coverDataUrl: meta.coverDataUrl,
            bitrate: meta.bitrate,
            sampleRate: meta.sampleRate,
            lyrics: meta.lyrics,
          },
          category: initialGuess.category,
          genre: initialGuess.genre,
        });
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
      }
      setImportProgress({ current: i + 1, total: audioFiles.length });
    }

    setIsImporting(false);
    setImportProgress(null);

    if (collected.length > 0) {
      setPendingImportTracks(collected);
      setEditingClassificationTrack(null);
      setIsClassificationWizardOpen(true);
    } else {
      showToast('Could not parse audio files', 'error');
    }
  };

  const handleConfirmImportClassification = async (taggedTracks: PendingImportItem[]) => {
    let successCount = 0;
    const nowBase = Date.now();

    for (let i = 0; i < taggedTracks.length; i++) {
      const item = taggedTracks[i];
      const now = nowBase + i;
      const sanitized = sanitizeMetadata(item.meta.title, item.meta.artist, item.meta.album);
      const newTrack: Omit<Track, 'id'> = {
        title: sanitized.title,
        artist: sanitized.artist,
        album: sanitized.album,
        duration: item.meta.duration,
        blob: item.file,
        addedAt: now,
        file: item.file,
        createdAt: now,
        format: item.meta.format,
        size: item.meta.size,
        coverDataUrl: item.meta.coverDataUrl,
        isFavorite: false,
        bitrate: item.meta.bitrate,
        sampleRate: item.meta.sampleRate,
        lyrics: item.meta.lyrics,
        category: item.category,
        genre: item.genre,
      };

      try {
        await db.tracks.add(newTrack as Track);
        successCount++;
      } catch (err) {
        console.error('Failed to save classified track in IndexedDB:', err);
      }
    }

    await loadDatabase();
    if (successCount > 0) {
      showToast(`Imported ${successCount} ${successCount === 1 ? 'song' : 'songs'}`, 'success');
    }
  };

  const handleOpenEditClassification = (track: Track) => {
    setEditingClassificationTrack(track);
    setPendingImportTracks([]);
    setIsClassificationWizardOpen(true);
  };

  const handleConfirmEditClassification = async (
    trackId: number, 
    category?: string, 
    genre?: string,
    title?: string,
    artist?: string,
    album?: string
  ) => {
    try {
      const updates: Partial<Track> = {};
      if (category !== undefined) updates.category = category as MusicCategory;
      if (genre !== undefined) updates.genre = genre;
      if (title !== undefined && title.trim()) updates.title = sanitizeMetadata(title).title;
      if (artist !== undefined && artist.trim()) updates.artist = sanitizeMetadata('', artist).artist;
      if (album !== undefined && album.trim()) updates.album = sanitizeMetadata('', '', album).album;

      await db.tracks.update(trackId, updates);
      setLibrary(prev =>
        prev.map(t => (t.id === trackId ? { ...t, ...updates } : t))
      );
      if (currentTrack && currentTrack.id === trackId) {
        setCurrentTrack(prev => (prev ? { ...prev, ...updates } : null));
      }
      showToast('Updated track details', 'success');
    } catch (err) {
      console.error('Failed to update track details:', err);
      showToast('Failed to update details', 'error');
    }
  };

  const handleImportFolder = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAndImportFiles(e.target.files);
      e.target.value = '';
    }
  };

  // --- Update Track Lyrics in State and IndexedDB ---
  const handleUpdateTrackLyrics = async (trackId: number, lyricsText: string) => {
    try {
      await db.tracks.update(trackId, { lyrics: lyricsText });
      setLibrary((prev) =>
        prev.map((t) => (t.id === trackId ? { ...t, lyrics: lyricsText } : t))
      );
      if (currentTrack && currentTrack.id === trackId) {
        setCurrentTrack((prev) => (prev ? { ...prev, lyrics: lyricsText } : null));
      }
    } catch (err) {
      console.warn('Failed to persist track lyrics in db:', err);
    }
  };

  // --- Demo Tracks Generator ---
  const handleLoadDemoTracks = async () => {
    setIsLoadingDemo(true);
    try {
      showToast('Synthesizing high-fidelity demo tracks via Web Audio...', 'info');
      
      const track1 = await createDemoSynthwaveTrack();
      const track2 = await createDemoChillAmbientTrack();
      const track3 = await createDemoCosmicPulseTrack();

      const demos = [
        {
          title: 'Neon Horizon',
          artist: 'Cadence Synth Lab',
          album: 'Retro Pulse EP',
          duration: track1.duration,
          format: 'audio/wav',
          size: track1.blob.size,
          blob: track1.blob,
          file: track1.blob,
          addedAt: Date.now() - 2000,
          createdAt: Date.now() - 2000,
          isFavorite: false,
          bitrate: 1411200,
          sampleRate: 44100,
          lyrics: DEMO_LYRICS['Neon Horizon'],
          category: 'Phonk',
          genre: 'Drift Phonk',
        },
        {
          title: 'Midnight Rain Lofi',
          artist: 'Aether Echoes',
          album: 'Study Session vol. 1',
          duration: track2.duration,
          format: 'audio/wav',
          size: track2.blob.size,
          blob: track2.blob,
          file: track2.blob,
          addedAt: Date.now() - 1000,
          createdAt: Date.now() - 1000,
          isFavorite: false,
          bitrate: 1411200,
          sampleRate: 44100,
          lyrics: DEMO_LYRICS['Midnight Rain Lofi'],
          category: 'English',
          genre: 'Lo-Fi',
        },
        {
          title: 'Deep Space Drive',
          artist: 'Nova Frequency',
          album: 'Cosmic Beats',
          duration: track3.duration,
          format: 'audio/wav',
          size: track3.blob.size,
          blob: track3.blob,
          file: track3.blob,
          addedAt: Date.now(),
          createdAt: Date.now(),
          isFavorite: false,
          bitrate: 1411200,
          sampleRate: 44100,
          lyrics: DEMO_LYRICS['Deep Space Drive'],
          category: 'English',
          genre: 'EDM',
        },
      ];

      for (const d of demos) {
        await db.tracks.add(d as Track);
      }

      await loadDatabase();
      showToast('Loaded 3 royalty-free synth demo tracks! Tap play to listen.', 'success');
    } catch (err) {
      console.error('Demo generation error:', err);
      showToast('Failed to generate demo tracks', 'error');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  // --- Track Actions ---
  const handleToggleFavorite = (trackOrId: Track | number | string, eOrFav?: React.MouseEvent | boolean, explicitFav?: boolean) => {
    let e: React.MouseEvent | undefined;
    let targetFav: boolean | undefined;

    if (eOrFav && typeof eOrFav === 'object' && 'stopPropagation' in eOrFav) {
      e = eOrFav;
      if (typeof explicitFav === 'boolean') targetFav = explicitFav;
    } else if (typeof eOrFav === 'boolean') {
      targetFav = eOrFav;
    }

    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const targetTrack = typeof trackOrId === 'object' && trackOrId !== null
      ? trackOrId
      : library.find(t => String(t.id) === String(trackOrId));

    const rawId = typeof trackOrId === 'object' && trackOrId !== null
      ? trackOrId.id
      : trackOrId;
    const targetId = Number(rawId);
    if (isNaN(targetId) || targetId <= 0) return;

    // Identify all matching track IDs in the library that correspond to this exact song (by ID or Title + Artist)
    const matchingTrackIds = library
      .filter(t => 
        Number(t.id) === targetId || 
        (targetTrack && 
         t.title.trim().toLowerCase() === targetTrack.title.trim().toLowerCase() && 
         (t.artist || '').trim().toLowerCase() === (targetTrack.artist || '').trim().toLowerCase())
      )
      .map(t => Number(t.id));

    if (!matchingTrackIds.includes(targetId)) {
      matchingTrackIds.push(targetId);
    }

    // Determine target favorite state: if any matching track is favorited, it is currently a favorite
    const isCurrentlyFav = favoriteIds.some(id => matchingTrackIds.includes(Number(id)));
    const isNowFav = targetFav !== undefined ? targetFav : !isCurrentlyFav;

    // Compute strictly unique positive numerical IDs
    const nextFavSet = new Set(favoriteIds.map(Number).filter(n => !isNaN(n) && n > 0));
    if (isNowFav) {
      matchingTrackIds.forEach(id => nextFavSet.add(id));
    } else {
      matchingTrackIds.forEach(id => nextFavSet.delete(id));
    }
    const updatedFavIds = Array.from(nextFavSet);

    // 1. Update reactive state
    setFavoriteIds(updatedFavIds);

    // 2. Persist to localStorage and dispatch event
    try {
      localStorage.setItem('cadence_favorites', JSON.stringify(updatedFavIds));
      localStorage.setItem('cadence_favorite_ids', JSON.stringify(updatedFavIds));
      window.dispatchEvent(new Event('cadence_favorites_updated'));
    } catch (err) {
      console.warn('Failed to update localStorage favorites:', err);
    }

    // 3. Update IndexedDB for all matching tracks
    for (const id of matchingTrackIds) {
      db.tracks.update(id, { isFavorite: isNowFav }).catch(console.error);
    }

    // 4. Update in-memory library & queue states
    setLibrary(prevLib => prevLib.map(t => matchingTrackIds.includes(Number(t.id)) ? { ...t, isFavorite: isNowFav } : t));
    setQueue(prevQueue => prevQueue.map(t => matchingTrackIds.includes(Number(t.id)) ? { ...t, isFavorite: isNowFav } : t));

    // 5. Update currentTrack state if it matches any of the IDs or title+artist
    if (currentTrack && (
      matchingTrackIds.includes(Number(currentTrack.id)) ||
      (targetTrack && currentTrack.title.trim().toLowerCase() === targetTrack.title.trim().toLowerCase() && 
       (currentTrack.artist || '').trim().toLowerCase() === (targetTrack.artist || '').trim().toLowerCase())
    )) {
      setCurrentTrack(prevCurr => prevCurr ? { ...prevCurr, isFavorite: isNowFav } : null);
    }

    // 6. User feedback toast
    if (targetTrack) {
      if (isNowFav) {
        showToast('Added to Favorites', 'success');
      } else {
        showToast('Removed from Favorites', 'info', {
          label: 'Undo',
          onClick: () => {
            handleToggleFavorite(targetTrack, !isNowFav);
          },
        });
      }
    }

    if (currentUser) {
      pushLocalMetadataToCloud(currentUser);
    }
  };

  const handleDeleteTrack = (track: Track) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Track',
      message: `Are you sure you want to delete "${track.title}" from your library?`,
      onConfirm: async () => {
        await db.tracks.delete(track.id);
        for (const pl of playlists) {
          if (pl.trackIds.includes(track.id)) {
            const updated = pl.trackIds.filter(id => id !== track.id);
            await db.playlists.update(pl.id, { trackIds: updated });
          }
        }
        setQueue(prev => prev.filter(t => t.id !== track.id));
        if (currentTrack?.id === track.id) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
          }
          setIsPlaying(false);
          setCurrentTrack(null);
        }
        await loadDatabase();
        showToast('Track deleted', 'info', {
          label: 'Undo',
          onClick: async () => {
            await db.tracks.put(track);
            await loadDatabase();
            showToast('Track restored', 'success');
          },
        });
      },
    });
  };

  const handleAddToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
    showToast('Added to queue', 'info');
  };

  const handlePlayNext = (track: Track) => {
    setQueue(prev => [track, ...prev]);
    showToast('Playing next', 'info');
  };

  // --- Playlist Actions ---
  const handleSavePlaylist = async (name: string, description: string, coverColor: string) => {
    try {
      const trimmedName = name.trim();
      // Remove from deleted list if recreating or updating
      try {
        const raw = localStorage.getItem('cadence_deleted_playlist_names') || '[]';
        const deleted: string[] = JSON.parse(raw);
        const filtered = deleted.filter(n => n.toLowerCase() !== trimmedName.toLowerCase());
        localStorage.setItem('cadence_deleted_playlist_names', JSON.stringify(filtered));
      } catch (e) {
        // ignore
      }

      if (editingPlaylist) {
        await db.playlists.update(editingPlaylist.id, { name: trimmedName, description, coverColor });
        showToast('Playlist updated', 'success');
      } else {
        const newPl: Omit<Playlist, 'id'> = {
          name: trimmedName,
          description,
          createdAt: Date.now(),
          trackIds: [],
          coverColor,
        };
        const id = await db.playlists.add(newPl as Playlist);
        showToast('Playlist created', 'success');
        setCurrentView({ playlistId: id });
      }
      setEditingPlaylist(null);
      await loadDatabase();
      if (currentUser) {
        await pushLocalMetadataToCloud(currentUser);
      }
    } catch (err) {
      console.error('Failed to save playlist:', err);
      showToast('Failed to save playlist', 'error');
    }
  };

  const handleDeletePlaylist = (playlistId: number) => {
    const pl = playlists.find(p => p.id === playlistId);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Playlist',
      message: `Are you sure you want to delete playlist "${pl?.name || 'this playlist'}"? Your songs will remain in your library.`,
      onConfirm: async () => {
        try {
          if (pl?.name) {
            try {
              const raw = localStorage.getItem('cadence_deleted_playlist_names') || '[]';
              const deleted: string[] = JSON.parse(raw);
              if (!deleted.includes(pl.name)) {
                deleted.push(pl.name);
                localStorage.setItem('cadence_deleted_playlist_names', JSON.stringify(deleted));
              }
            } catch (e) {
              // ignore
            }
          }

          // Delete from IndexedDB
          await db.playlists.delete(playlistId);

          // Immediately update state so UI updates without lag
          setPlaylists(prev => prev.filter(p => p.id !== playlistId));

          // If currently viewing this deleted playlist, switch view back to library
          setCurrentView(prevView => {
            if (typeof prevView === 'object' && prevView.playlistId === playlistId) {
              return 'library';
            }
            return prevView;
          });

          await loadDatabase();

          // Push updated state to cloud
          if (currentUser) {
            await pushLocalMetadataToCloud(currentUser);
          }

          showToast(`Deleted playlist "${pl?.name || 'Playlist'}"`, 'info');
        } catch (err) {
          console.error('Failed to delete playlist:', err);
          showToast('Failed to delete playlist', 'error');
        }
      },
    });
  };

  const handleAddTrackToPlaylist = async (trackId: number, playlistId: number) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    if (pl.trackIds.includes(trackId)) {
      showToast('Already in playlist', 'info');
      return;
    }
    const updatedIds = [...pl.trackIds, trackId];
    await db.playlists.update(playlistId, { trackIds: updatedIds });
    await loadDatabase();
    showToast('Added to playlist', 'success');
  };

  const handleRemoveTrackFromPlaylist = async (trackId: number, playlistId: number) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    const updatedIds = pl.trackIds.filter(id => id !== trackId);
    await db.playlists.update(playlistId, { trackIds: updatedIds });
    await loadDatabase();
    showToast('Removed from playlist', 'info');
  };

  const handleMovePlaylistItem = async (playlistId: number, fromIdx: number, toIdx: number) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl || fromIdx < 0 || toIdx < 0 || fromIdx >= pl.trackIds.length || toIdx >= pl.trackIds.length) return;
    const updatedIds = [...pl.trackIds];
    const [moved] = updatedIds.splice(fromIdx, 1);
    updatedIds.splice(toIdx, 0, moved);
    await db.playlists.update(playlistId, { trackIds: updatedIds });
    await loadDatabase();
  };

  // --- Song Recognition Wishlist Action ---
  const handleSaveIdentifiedTrackToWishlist = async (song: {
    title: string;
    artist: string;
    album?: string;
    artworkUrl?: string | null;
    ytMusicUrl: string;
    spotifyUrl?: string;
  }) => {
    try {
      // 1. Check if track already exists in library
      const existingTrack = library.find(
        t => t.title.toLowerCase() === song.title.toLowerCase() && t.artist.toLowerCase() === song.artist.toLowerCase()
      );
      let trackId: number;

      const linksLyrics = [
        `[00:00.00] Identified Track: ${song.title} by ${song.artist}`,
        song.ytMusicUrl ? `[00:01.00] YouTube Music: ${song.ytMusicUrl}` : '',
        song.spotifyUrl ? `[00:02.00] Spotify: ${song.spotifyUrl}` : '',
      ].filter(Boolean).join('\n');

      if (existingTrack) {
        trackId = existingTrack.id;
      } else {
        const newTrack: Omit<Track, 'id'> = {
          title: song.title,
          artist: song.artist,
          album: song.album || 'Single',
          duration: 0,
          blob: new Blob([], { type: 'audio/mp3' }),
          file: new Blob([], { type: 'audio/mp3' }),
          addedAt: Date.now(),
          createdAt: Date.now(),
          format: 'audio/mp3',
          size: 0,
          coverDataUrl: song.artworkUrl || undefined,
          isFavorite: false,
          lyrics: linksLyrics,
        };
        trackId = await db.tracks.add(newTrack as Track);
      }

      // 2. Add to "Wanted / Identified Tracks" playlist
      const WISHLIST_NAME = 'Wanted / Identified Tracks';
      let wishlistPl = playlists.find(p => p.name.toLowerCase() === WISHLIST_NAME.toLowerCase());

      if (wishlistPl) {
        if (!wishlistPl.trackIds.includes(trackId)) {
          const updatedIds = [...wishlistPl.trackIds, trackId];
          await db.playlists.update(wishlistPl.id, { trackIds: updatedIds });
        }
      } else {
        const newPl: Omit<Playlist, 'id'> = {
          name: WISHLIST_NAME,
          description: 'Identified tracks saved for offline reference with YouTube Music link',
          createdAt: Date.now(),
          trackIds: [trackId],
          coverColor: '#e11d48',
        };
        await db.playlists.add(newPl as Playlist);
      }

      await loadDatabase();
      showToast('Saved to Wishlist', 'success');
    } catch (err) {
      console.error('Failed to save identified song to wishlist:', err);
      showToast('Failed to save track', 'error');
    }
  };

  // --- Keyboard Shortcuts Global Listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (audioRef.current) {
            const skip = e.shiftKey ? 15 : 5;
            handleSeek(Math.max(0, audioRef.current.currentTime - skip));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (audioRef.current) {
            const skip = e.shiftKey ? 15 : 5;
            handleSeek(Math.min(duration, audioRef.current.currentTime + skip));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, userVolume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, userVolume - 0.05));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyL':
          e.preventDefault();
          setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
          break;
        case 'KeyS':
          e.preventDefault();
          setIsShuffle(prev => !prev);
          break;
        case 'KeyF':
          e.preventDefault();
          if (currentTrack) {
            setIsFullscreenOpen(prev => !prev);
          }
          break;
        case 'KeyQ':
          e.preventDefault();
          setIsQueueOpen(prev => !prev);
          break;
        case 'KeyT':
          e.preventDefault();
          setIsSleepModalOpen(prev => !prev);
          break;
        case 'KeyI':
          e.preventDefault();
          setIsIdentifyModalOpen(prev => !prev);
          break;
        case 'KeyY':
          e.preventDefault();
          if (currentTrack) {
            setIsLyricsModalOpen(prev => !prev);
          }
          break;
        case 'Slash':
          if (e.shiftKey) {
            e.preventDefault();
            setIsShortcutsOpen(prev => !prev);
          }
          break;
        case 'Escape':
          setIsFullscreenOpen(false);
          setIsLyricsModalOpen(false);
          setIsQueueOpen(false);
          setIsSleepModalOpen(false);
          setIsImportModalOpen(false);
          setPlaylistModalOpen(false);
          setInspectingTrack(null);
          setIsShortcutsOpen(false);
          setIsMobileMenuOpen(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleSeek, duration, handleVolumeChange, userVolume, toggleMute, currentTrack]);

  // --- Drag and Drop Audio Files from Computer onto the Window ---
  useEffect(() => {
    const handleDragOverWindow = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsWindowDragOver(true);
      }
    };

    const handleDragLeaveWindow = (e: DragEvent) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsWindowDragOver(false);
      }
    };

    const handleDropWindow = async (e: DragEvent) => {
      e.preventDefault();
      setIsWindowDragOver(false);

      const items = e.dataTransfer?.items;
      const audioFiles: File[] = [];

      const isAudio = (name: string, type?: string) =>
        (type && type.startsWith('audio/')) ||
        /\.(mp3|wav|flac|m4a|aac|ogg|opus|weba|aiff|m4b)$/i.test(name);

      if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
        const scanEntry = async (entry: FileSystemEntry): Promise<void> => {
          if (entry.isFile) {
            const fileEntry = entry as FileSystemFileEntry;
            await new Promise<void>((resolve) => {
              fileEntry.file(
                (file) => {
                  if (isAudio(file.name, file.type)) {
                    audioFiles.push(file);
                  }
                  resolve();
                },
                () => resolve()
              );
            });
          } else if (entry.isDirectory) {
            const dirEntry = entry as FileSystemDirectoryEntry;
            const dirReader = dirEntry.createReader();
            const readEntries = async (): Promise<FileSystemEntry[]> => {
              const all: FileSystemEntry[] = [];
              const readBatch = async (): Promise<void> => {
                const batch = await new Promise<FileSystemEntry[]>((resolve) => {
                  dirReader.readEntries(
                    (entries) => resolve(entries),
                    () => resolve([])
                  );
                });
                if (batch.length > 0) {
                  all.push(...batch);
                  await readBatch();
                }
              };
              await readBatch();
              return all;
            };

            const entries = await readEntries();
            for (const child of entries) {
              await scanEntry(child);
            }
          }
        };

        const promises: Promise<void>[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry();
          if (entry) {
            promises.push(scanEntry(entry));
          }
        }
        await Promise.all(promises);
      }

      if (audioFiles.length > 0) {
        processAndImportFiles(audioFiles);
      } else if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        processAndImportFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragover', handleDragOverWindow);
    window.addEventListener('dragleave', handleDragLeaveWindow);
    window.addEventListener('drop', handleDropWindow);

    return () => {
      window.removeEventListener('dragover', handleDragOverWindow);
      window.removeEventListener('dragleave', handleDragLeaveWindow);
      window.removeEventListener('drop', handleDropWindow);
    };
  }, []);

  // Aggregate strictly unique favorite song count (matching visible favorites tracks)
  const favoritesCount = useMemo(() => {
    const seenFavKeys = new Set<string>();
    let count = 0;
    for (const t of library) {
      if (favoriteIds.some(id => Number(id) === Number(t.id))) {
        const key = `${t.title.trim().toLowerCase()}:::${(t.artist || '').trim().toLowerCase()}`;
        if (!seenFavKeys.has(key)) {
          seenFavKeys.add(key);
          count++;
        }
      }
    }
    return count > 0 ? count : (new Set(favoriteIds.map(Number).filter(n => !isNaN(n) && n > 0)).size);
  }, [library, favoriteIds]);

  // --- Active View Metadata for Header ---
  const currentViewDetails = useMemo(() => {
    if (currentView === 'library') {
      return { title: 'All Tracks', subtitle: `${library.length} songs in library` };
    }
    if (currentView === 'favorites') {
      return { title: 'Favorite Tracks', subtitle: `${favoritesCount} favorite songs` };
    }
    if (typeof currentView === 'object') {
      const pl = playlists.find(p => p.id === currentView.playlistId);
      return {
        title: pl?.name || 'Playlist',
        subtitle: `${pl?.trackIds.length || 0} tracks${pl?.description ? ` · ${pl.description}` : ''}`,
      };
    }
    return { title: 'Audio Library', subtitle: '' };
  }, [currentView, library, playlists, favoritesCount]);

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full overflow-hidden bg-black text-zinc-100 select-none relative">

      {/* Bottom Minimalist Snackbar (YouTube Music & Spotify inspired) */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="px-4 py-2 rounded-full bg-[#1c1c1e] text-zinc-200 border border-white/10 text-xs font-medium shadow-2xl flex items-center gap-2.5 transition-all duration-200 animate-fade-in whitespace-nowrap">
            <span>{toastMessage.text}</span>
            {toastMessage.action && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toastMessage.action?.onClick();
                  setToastMessage(null);
                }}
                className="text-white font-semibold hover:underline ml-2 pointer-events-auto cursor-pointer"
              >
                {toastMessage.action.label}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Global Drag-and-Drop Overlay */}
      {isWindowDragOver && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl border-4 border-dashed border-rose-500/60 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-100">
          <UploadCloud size={64} className="text-rose-400 animate-bounce mb-3" />
          <h2 className="text-2xl font-bold text-white tracking-tight">Drop audio files to import</h2>
          <p className="text-sm text-zinc-300 mt-1">Accepts MP3, WAV, AAC, FLAC, M4A, OGG into your IndexedDB library</p>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        trackCount={library.length}
        favoritesCount={favoritesCount}
        playlists={playlists}
        onCreatePlaylist={() => {
          setEditingPlaylist(null);
          setPlaylistModalOpen(true);
        }}
        onEditPlaylist={(pl) => {
          setEditingPlaylist(pl);
          setPlaylistModalOpen(true);
        }}
        onDeletePlaylist={handleDeletePlaylist}
        onDropTrackToPlaylist={handleAddTrackToPlaylist}
        analyser={analyserNodeState}
        isPlaying={isPlaying}
        onLoadDemoTracks={handleLoadDemoTracks}
        isLoadingDemo={isLoadingDemo}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenIdentifyModal={() => setIsIdentifyModalOpen(true)}
        onOpenQueue={() => setIsQueueOpen(true)}
        onOpenSleepTimer={() => setIsSleepModalOpen(true)}
        queueCount={queue.length}
        sleepTimer={sleepTimer}
        currentUser={currentUser}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenListenTogether={() => setIsListenTogetherOpen(true)}
        activeSession={activeSession}
        onOpenAbout={() => setIsAboutModalOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-black z-10">
        {/* Top Header */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={(field) => {
            if (sortField === field) {
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            } else {
              setSortField(field);
              setSortOrder('asc');
            }
          }}
          viewTitle={currentViewDetails.title}
          viewSubtitle={currentViewDetails.subtitle}
          isImporting={isImporting}
          importProgress={importProgress}
          onOpenIdentifyModal={() => setIsIdentifyModalOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          currentUser={currentUser}
          onOpenAccountModal={() => setIsAccountModalOpen(true)}
          onOpenListenTogether={() => setIsListenTogetherOpen(true)}
          activeSession={activeSession}
          onEditCurrentPlaylist={
            typeof currentView === 'object'
              ? () => {
                  const pl = playlists.find(p => p.id === currentView.playlistId);
                  if (pl) {
                    setEditingPlaylist(pl);
                    setPlaylistModalOpen(true);
                  }
                }
              : undefined
          }
          onDeleteCurrentPlaylist={
            typeof currentView === 'object'
              ? () => handleDeletePlaylist(currentView.playlistId)
              : undefined
          }
        />

        {/* Content Table / Main View */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 pb-safe flex flex-col bg-black">
          <div className="flex-1 flex flex-col min-h-full w-full max-w-full">
            {visibleTracks.length === 0 ? (
              typeof currentView === 'object' ? (
                /* Empty Playlist State */
                <div className="flex-1 py-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-rose-400 mb-3 shadow-lg">
                    <Music size={24} />
                  </div>
                  <h4 className="text-base font-semibold text-white">This playlist is empty</h4>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    Add tracks to this playlist from your library using the track menu (⋮) or drag songs onto the playlist in the sidebar.
                  </p>
                  <div className="mt-5 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setCurrentView('library')}
                      className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                    >
                      Browse Library
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlaylist(currentView.playlistId)}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-white rounded-full text-xs font-semibold border border-rose-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>Delete Playlist</span>
                    </button>
                  </div>
                </div>
              ) : library.length > 0 ? (
                /* Empty state due to active filter */
                <div className="flex-1 py-16 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-rose-400 mb-3">
                    <ListFilter size={22} />
                  </div>
                  <h4 className="text-sm font-semibold text-white">No tracks match search</h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {searchQuery ? `Search: "${searchQuery}"` : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                    }}
                    className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-full text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                /* Completely empty library */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-md mx-auto">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl flex items-center justify-center text-rose-500 mb-3 sm:mb-4 shadow-xl">
                    <Music size={26} />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {searchQuery ? 'No matching tracks found' : 'Your library is empty'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {searchQuery
                      ? `No songs matched "${searchQuery}". Try a different keyword.`
                      : 'Import your local audio files (.mp3, .flac, .wav, .m4a) to start listening offline.'}
                  </p>
                  {!searchQuery && (
                    <div className="mt-5 flex justify-center w-full max-w-xs">
                      <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="w-full py-2.5 px-5 bg-white text-black hover:bg-zinc-200 active:scale-95 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <UploadCloud size={16} />
                        <span>Import Audio Files</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="w-full max-w-full relative flex-1">
                {/* Modern Desktop Header (sm and larger screens) */}
                <div className="hidden sm:grid grid-cols-[40px_1fr_80px_48px] items-center px-4 py-2 border-b border-white/5 text-[11px] font-medium tracking-wider text-zinc-500 uppercase select-none mb-1">
                  <span className="text-center font-mono opacity-60">#</span>
                  <span className="pl-3 sm:pl-3.5">Track</span>
                  <span className="text-right pr-2">Duration</span>
                  <span className="sr-only">Actions</span>
                </div>

                {/* Responsive Mobile Sub-header (< sm / < 640px) */}
                <div className="flex sm:hidden items-center justify-between px-4 py-2 mb-1 border-b border-white/5 select-none relative">
                  <span className="text-xs font-medium text-zinc-400">
                    {visibleTracks.length} {visibleTracks.length === 1 ? 'track' : 'tracks'}
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMobileSortOpen(prev => !prev)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 rounded-full transition-colors active:scale-95 cursor-pointer"
                      title="Sort tracks"
                    >
                      <ArrowUpDown size={12} className="text-neutral-400" />
                      <span>Sort ▾</span>
                    </button>

                    {mobileSortOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 bg-transparent"
                          onClick={() => setMobileSortOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[150px] bg-[#0a0a0a] border border-white/10 backdrop-blur-xl rounded-xl shadow-2xl p-1.5 flex flex-col gap-0.5 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              if (sortField === 'title') {
                                setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortField('title');
                                setSortOrder('asc');
                              }
                              setMobileSortOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                              sortField === 'title' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                            }`}
                          >
                            <span>By Name</span>
                            {sortField === 'title' && (
                              <span className="text-[10px] text-zinc-400">{sortOrder === 'asc' ? 'A→Z' : 'Z→A'}</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (sortField === 'createdAt') {
                                setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortField('createdAt');
                                setSortOrder('desc');
                              }
                              setMobileSortOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                              sortField === 'createdAt' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                            }`}
                          >
                            <span>By Date</span>
                            {sortField === 'createdAt' && (
                              <span className="text-[10px] text-zinc-400">{sortOrder === 'desc' ? 'New' : 'Old'}</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (sortField === 'duration') {
                                setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setSortField('duration');
                                setSortOrder('asc');
                              }
                              setMobileSortOpen(false);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                              sortField === 'duration' ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                            }`}
                          >
                            <span>By Duration</span>
                            {sortField === 'duration' && (
                              <span className="text-[10px] text-zinc-400">{sortOrder === 'asc' ? 'Short' : 'Long'}</span>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Track rows */}
                <div className="space-y-1 w-full max-w-full">
                  {visibleTracks.map((track, idx) => {
                    const isCurrent = currentTrack?.id === track.id;
                    const isPlaylistView = typeof currentView === 'object';
                    const playlistId = isPlaylistView ? currentView.playlistId : null;

                    return (
                      <TrackRow
                        key={`${track.id}-${idx}`}
                        track={track}
                        index={idx}
                        isFavorite={
                          favoriteIds.some(id => Number(id) === Number(track.id)) ||
                          library.some(t =>
                            favoriteIds.some(favId => Number(favId) === Number(t.id)) &&
                            t.title.trim().toLowerCase() === track.title.trim().toLowerCase() &&
                            (t.artist || '').trim().toLowerCase() === (track.artist || '').trim().toLowerCase()
                          )
                        }
                        isCurrent={isCurrent}
                        isPlaying={isPlaying}
                        onPlay={(t) => {
                          if (currentTrack?.id === t.id) {
                            togglePlay();
                          } else {
                            playTrack(t);
                          }
                        }}
                        onTogglePlay={togglePlay}
                        onToggleFavorite={(t, nextFav) => handleToggleFavorite(t, nextFav)}
                        onPlayNext={handlePlayNext}
                        onAddToQueue={handleAddToQueue}
                        onInspect={setInspectingTrack}
                        onDelete={handleDeleteTrack}
                        playlists={playlists}
                        onAddToPlaylist={handleAddTrackToPlaylist}
                        currentPlaylistId={playlistId}
                        onRemoveFromPlaylist={handleRemoveTrackFromPlaylist}
                        isReorderable={isPlaylistView && !searchQuery.trim()}
                        onMoveUp={() => playlistId && handleMovePlaylistItem(playlistId, idx, idx - 1)}
                        onMoveDown={() => playlistId && handleMovePlaylistItem(playlistId, idx, idx + 1)}
                        isFirst={idx === 0}
                        isLast={idx === visibleTracks.length - 1}
                        activeMenuTrackId={activeMenuTrackId}
                        setActiveMenuTrackId={setActiveMenuTrackId}
                        onEditClassification={handleOpenEditClassification}
                      />
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </main>

        {/* Player Bottom Bar */}
        <PlayerBar
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onPrev={handlePrev}
          onNext={handleNext}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={userVolume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          repeatMode={repeatMode}
          onCycleRepeat={() => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')}
          isShuffle={isShuffle}
          onToggleShuffle={() => setIsShuffle(prev => !prev)}
          isFavorite={
            currentTrack
              ? Boolean(
                  favoriteIds.some(id => Number(id) === Number(currentTrack.id)) ||
                    library.some(t =>
                      favoriteIds.some(favId => Number(favId) === Number(t.id)) &&
                      t.title.trim().toLowerCase() === currentTrack.title.trim().toLowerCase() &&
                      (t.artist || '').trim().toLowerCase() === (currentTrack.artist || '').trim().toLowerCase()
                    )
                )
              : false
          }
          onToggleFavorite={handleToggleFavorite}
          playbackRate={playbackRate}
          onChangePlaybackRate={handleChangePlaybackRate}
          isQueueOpen={isQueueOpen}
          onToggleQueue={() => setIsQueueOpen(prev => !prev)}
          queueCount={queue.length}
          sleepTimer={sleepTimer}
          onOpenSleepTimer={() => setIsSleepModalOpen(true)}
          onOpenFullscreen={() => currentTrack && setIsFullscreenOpen(true)}
          onOpenLyrics={() => currentTrack && setIsLyricsModalOpen(true)}
        />

        {/* Mobile Bottom Navigation (Phones < 640px) */}
        <MobileBottomNav
          currentView={currentView}
          onSelectView={setCurrentView}
          onOpenPlaylistsDrawer={() => setIsMobileMenuOpen(true)}
          onOpenSleepTimer={() => setIsSleepModalOpen(true)}
          onOpenQueue={() => setIsQueueOpen(true)}
          onOpenIdentifyModal={() => setIsIdentifyModalOpen(true)}
          sleepTimer={sleepTimer}
          queueCount={queue.length}
        />
      </div>

      {/* Up Next / History Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onPlayTrack={playTrack}
        onRemoveFromQueue={(idx) => setQueue(prev => prev.filter((_, i) => i !== idx))}
        onMoveQueueItem={(from, to) => {
          if (from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
          setQueue(prev => {
            const nextQ = [...prev];
            const [item] = nextQ.splice(from, 1);
            nextQ.splice(to, 0, item);
            return nextQ;
          });
        }}
        onClearQueue={() => setQueue([])}
        history={history}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
        sleepTimer={sleepTimer}
        onStartTimer={startSleepTimer}
        onCancelTimer={cancelSleepTimer}
        onExtendTimer={extendSleepTimer}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportFiles={processAndImportFiles}
        onImportFolder={handleImportFolder}
        onLoadDemoTracks={handleLoadDemoTracks}
        isImporting={isImporting}
        isLoadingDemo={isLoadingDemo}
      />

      {/* Playlist Modal (Create / Edit) */}
      <PlaylistModal
        isOpen={playlistModalOpen}
        onClose={() => {
          setPlaylistModalOpen(false);
          setEditingPlaylist(null);
        }}
        playlistToEdit={editingPlaylist}
        onSave={handleSavePlaylist}
        onDelete={(id) => {
          setPlaylistModalOpen(false);
          setEditingPlaylist(null);
          handleDeletePlaylist(id);
        }}
      />

      {/* Track Metadata Inspector Modal */}
      <TrackDetailsModal
        isOpen={!!inspectingTrack}
        onClose={() => setInspectingTrack(null)}
        track={inspectingTrack}
      />

      {/* Fullscreen Player & Visualizer */}
      <FullscreenPlayerModal
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        currentTrack={
          currentTrack
            ? {
                ...currentTrack,
                isFavorite:
                  favoriteIds.some(id => Number(id) === Number(currentTrack.id)) ||
                  library.some(t =>
                    favoriteIds.some(favId => Number(favId) === Number(t.id)) &&
                    t.title.trim().toLowerCase() === currentTrack.title.trim().toLowerCase() &&
                    (t.artist || '').trim().toLowerCase() === (currentTrack.artist || '').trim().toLowerCase()
                  )
              }
            : null
        }
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={userVolume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        repeatMode={repeatMode}
        onCycleRepeat={() => setRepeatMode(prev => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off')}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(prev => !prev)}
        onToggleFavorite={(t, nextFav) => handleToggleFavorite(t, nextFav)}
        analyser={analyserNodeState}
        sleepTimer={sleepTimer}
        onOpenLyrics={() => setIsLyricsModalOpen(true)}
      />

      {/* Synchronized Lyrics Modal (ID3 USLT Frame Reader) */}
      <LyricsModal
        isOpen={isLyricsModalOpen}
        onClose={() => setIsLyricsModalOpen(false)}
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onPrev={handlePrev}
        onNext={handleNext}
        onUpdateTrackLyrics={handleUpdateTrackLyrics}
      />

      {/* Keyboard Shortcuts Cheat Sheet */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {/* Two-step Classification Wizard Modal (Import & Edit) */}
      <ClassificationWizardModal
        isOpen={isClassificationWizardOpen}
        onClose={() => {
          setIsClassificationWizardOpen(false);
          setEditingClassificationTrack(null);
          setPendingImportTracks([]);
        }}
        pendingTracks={pendingImportTracks}
        onConfirmImport={handleConfirmImportClassification}
        editingTrack={editingClassificationTrack}
        onConfirmEdit={handleConfirmEditClassification}
      />

      {/* Background Song Recognition Modal (YouTube Music Deep Link & Wishlist) */}
      <SongRecognitionModal
        isOpen={isIdentifyModalOpen}
        onClose={() => setIsIdentifyModalOpen(false)}
        onSaveToWishlist={handleSaveIdentifiedTrackToWishlist}
      />

      {/* Firebase Cloud Account Modal */}
      <CloudAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        onSyncLocalWithCloud={() => syncLocalMetadataWithCloud(currentUser)}
        favoritesCount={favoritesCount}
        playlistsCount={playlists.length}
      />

      {/* Real-Time Listen Together Session Modal */}
      <ListenTogetherModal
        isOpen={isListenTogetherOpen}
        onClose={() => setIsListenTogetherOpen(false)}
        currentUser={currentUser}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        activeSession={activeSession}
        isHost={isHost}
        syncWithHostEnabled={syncWithHostEnabled}
        onSetSyncWithHostEnabled={setSyncWithHostEnabled}
        onStartHosting={handleStartHosting}
        onJoinSession={handleJoinSession}
        onLeaveSession={handleLeaveSession}
        onRequireAuth={() => {
          setIsListenTogetherOpen(false);
          setIsAccountModalOpen(true);
        }}
        matchedLocalTrackTitle={
          activeSession?.trackTitle
            ? library.find(t => t.title.toLowerCase() === activeSession.trackTitle?.toLowerCase())?.title
            : undefined
        }
      />

      {/* About Cadence Music Dialog */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* Master HTML5 Audio Element for rock-solid continuous queue playback & auto-advance */}
      <audio
        ref={audioRef}
        onEnded={handleTrackEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlayEvent}
        onPause={handlePauseEvent}
        onError={handleAudioError}
        className="hidden"
        preload="auto"
      />
    </div>
  );
}
