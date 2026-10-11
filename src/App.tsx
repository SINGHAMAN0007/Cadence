import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, Pause, Music, Search, Plus, Trash2, Clock, 
  Sparkles, UploadCloud, AlertCircle, CheckCircle2, 
  Heart, FolderPlus, Disc3, Shuffle, ListFilter, ArrowUpDown
} from 'lucide-react';
import { db } from './services/db';
import { parseAudioMetadata } from './services/metadata';
import { createDemoSynthwaveTrack, createDemoChillAmbientTrack, createDemoCosmicPulseTrack } from './services/demoTracks';
import type { 
  Track, Playlist, RepeatMode, 
  SortField, SortOrder, SleepTimerState 
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
import { AccountModal } from './components/AccountModal';
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

export default function App() {
  // --- Data State ---
  const [library, setLibrary] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentView, setCurrentView] = useState<'library' | 'favorites' | 'recent' | { playlistId: number }>('library');
  
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
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // --- Audio & Web Audio Refs ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [analyserNodeState, setAnalyserNodeState] = useState<AnalyserNode | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4000);
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

  // --- Initialize Audio Element & Listeners ---
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    // Strictly synchronize navigator.mediaSession.playbackState with audio events
    const handlePlayEvent = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };

    const handlePauseEvent = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleEnded = () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      handleTrackEnded();
    };

    const handleError = () => {
      console.warn('Audio playback error on track');
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      showToast('Could not play track (unsupported format or corrupted audio)', 'error');
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlayEvent);
    audio.addEventListener('pause', handlePauseEvent);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlayEvent);
      audio.removeEventListener('pause', handlePauseEvent);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }
    };
  }, []);

  // Connect Web Audio Analyser safely (with Android error resilience)
  const setupWebAudioAnalyser = useCallback(() => {
    if (!audioRef.current) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          audioCtxRef.current = ctx;

          try {
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            const source = ctx.createMediaElementSource(audioRef.current);
            source.connect(analyser);
            analyser.connect(ctx.destination);
            sourceNodeRef.current = source;
            setAnalyserNodeState(analyser);
          } catch (sourceErr) {
            console.warn('MediaElementSource note:', sourceErr);
          }
        }
      }

      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (err) {
      console.warn('Web Audio Analyser setup note:', err);
    }
  }, []);

  // --- Load Initial Data from IndexedDB ---
  const loadDatabase = useCallback(async () => {
    try {
      const rawTracks = await db.tracks.toArray();
      // Normalize tracks to ensure blob and addedAt are hydrated
      const tracks: Track[] = rawTracks.map(t => ({
        ...t,
        blob: t.blob || (t.file as Blob),
        file: t.blob || t.file,
        addedAt: t.addedAt || t.createdAt || Date.now(),
        createdAt: t.addedAt || t.createdAt || Date.now(),
      }));
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
        if (cloud.playlistMetadata && cloud.playlistMetadata.length > 0) {
          const currentPlaylists = await db.playlists.toArray();
          const existingNames = new Set(currentPlaylists.map(p => p.name));
          const allTracks = await db.tracks.toArray();
          for (const pl of cloud.playlistMetadata) {
            if (!existingNames.has(pl.name)) {
              const matchedIds = allTracks
                .filter(t => pl.trackTitles?.includes(t.title))
                .map(t => t.id);
              await db.playlists.add({
                name: pl.name,
                description: pl.description || '',
                createdAt: pl.createdAt || Date.now(),
                trackIds: matchedIds,
              } as Playlist);
              changed = true;
            }
          }
        }
        if (changed) {
          await loadDatabase();
        }
      }

      // Push local metadata back to cloud for backup
      const allLocalTracks = await db.tracks.toArray();
      const allLocalPlaylists = await db.playlists.toArray();
      const favKeys = allLocalTracks.filter(t => t.isFavorite).map(t => `${t.title}:::${t.artist}`);
      const plMetadata = allLocalPlaylists.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        trackTitles: p.trackIds.map(id => allLocalTracks.find(t => t.id === id)?.title).filter(Boolean) as string[],
      }));

      await syncUserMetadataToCloud({
        favoriteTrackKeys: favKeys,
        playlistMetadata: plMetadata,
      });
    } catch (err) {
      console.warn('Metadata sync note:', err);
    }
  }, [currentUser, loadDatabase]);

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
      if (!audioBlob || audioBlob.size === 0) {
        if (track.lyrics && track.lyrics.includes('music.youtube.com')) {
          const match = track.lyrics.match(/https:\/\/music\.youtube\.com[^\s\n]+/);
          if (match) {
            window.open(match[0], '_blank');
            showToast(`Opening "${track.title}" in YouTube Music...`, 'info');
            return;
          }
        }
        showToast(`"${track.title}" is saved in Wishlist (bookmark).`, 'info');
        return;
      }

      const url = URL.createObjectURL(audioBlob);
      currentBlobUrlRef.current = url;
      audio.src = url;
      audio.playbackRate = playbackRate;
      audio.volume = isMuted ? 0 : userVolume;

      audio.play().then(() => {
        setIsPlaying(true);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Play aborted or blocked by browser policy:', err);
          setIsPlaying(false);
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
        }
      });

      if (currentTrack && currentTrack.id !== track.id) {
        setHistory(prev => [currentTrack, ...prev.filter(t => t.id !== currentTrack.id)].slice(0, 50));
      }

      setCurrentTrack(track);
      if (newQueue !== undefined) {
        setQueue(newQueue);
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

  // --- Volume Changes ---
  const handleVolumeChange = useCallback((newVol: number) => {
    setUserVolume(newVol);
    try {
      localStorage.setItem('cadence_volume', newVol.toString());
    } catch {}
    if (audioRef.current && !isMuted) {
      audioRef.current.volume = newVol;
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = userVolume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
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
      list = library.filter(t => t.isFavorite);
    } else if (currentView === 'recent') {
      list = [...library].sort((a, b) => b.createdAt - a.createdAt);
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
  }, [library, playlists, currentView, searchQuery, sortField, sortOrder, selectedCategory, selectedGenre]);

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

  // --- Next & Previous Navigation ---
  const handleNext = useCallback(() => {
    if (!currentTrack) return;

    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    // 1. Check if queue has songs
    if (queue.length > 0) {
      const nextSong = queue[0];
      const remainingQueue = queue.slice(1);
      playTrack(nextSong, remainingQueue);
      return;
    }

    // 2. Play next in current visible track list
    if (visibleTracks.length > 0) {
      const currentIndex = visibleTracks.findIndex(t => t.id === currentTrack.id);
      if (currentIndex !== -1) {
        if (isShuffle) {
          const others = visibleTracks.filter(t => t.id !== currentTrack.id);
          if (others.length > 0) {
            const randomTrack = others[Math.floor(Math.random() * others.length)];
            playTrack(randomTrack);
            return;
          }
        }

        if (currentIndex < visibleTracks.length - 1) {
          playTrack(visibleTracks[currentIndex + 1]);
          return;
        } else if (repeatMode === 'all') {
          playTrack(visibleTracks[0]);
          return;
        }
      }
    }

    setIsPlaying(false);
  }, [currentTrack, repeatMode, queue, visibleTracks, isShuffle, playTrack]);

  const handlePrev = useCallback(() => {
    if (!currentTrack || !audioRef.current) return;

    // If played more than 3 seconds, rewind to beginning
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    // Go to previous track in list
    if (visibleTracks.length > 0) {
      const currentIndex = visibleTracks.findIndex(t => t.id === currentTrack.id);
      if (currentIndex > 0) {
        playTrack(visibleTracks[currentIndex - 1]);
      } else if (repeatMode === 'all') {
        playTrack(visibleTracks[visibleTracks.length - 1]);
      } else {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    }
  }, [currentTrack, visibleTracks, repeatMode, playTrack]);

  const handleTrackEnded = useCallback(() => {
    handleNext();
  }, [handleNext]);

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

        const initialGuess = classifyTrackWithHeuristics(meta.title, meta.artist);

        collected.push({
          file: storageBlob,
          meta: {
            title: meta.title,
            artist: meta.artist,
            album: meta.album,
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
      const newTrack: Omit<Track, 'id'> = {
        title: item.meta.title,
        artist: item.meta.artist,
        album: item.meta.album,
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
      showToast(`Successfully added ${successCount} track${successCount !== 1 ? 's' : ''} to library`, 'success');
    }
  };

  const handleOpenEditClassification = (track: Track) => {
    setEditingClassificationTrack(track);
    setPendingImportTracks([]);
    setIsClassificationWizardOpen(true);
  };

  const handleConfirmEditClassification = async (trackId: number, category?: string, genre?: string) => {
    try {
      await db.tracks.update(trackId, { category, genre });
      setLibrary(prev =>
        prev.map(t => (t.id === trackId ? { ...t, category, genre } : t))
      );
      if (currentTrack && currentTrack.id === trackId) {
        setCurrentTrack(prev => (prev ? { ...prev, category, genre } : null));
      }
      showToast('Updated Category & Genre tags', 'success');
    } catch (err) {
      console.error('Failed to update track classification:', err);
      showToast('Failed to update tags', 'error');
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
          isFavorite: true,
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
  const handleToggleFavorite = async (track: Track) => {
    const updatedFav = !track.isFavorite;
    await db.tracks.update(track.id, { isFavorite: updatedFav });
    setLibrary(prev => prev.map(t => t.id === track.id ? { ...t, isFavorite: updatedFav } : t));
    if (currentTrack?.id === track.id) {
      setCurrentTrack(prev => prev ? { ...prev, isFavorite: updatedFav } : null);
    }
    if (currentUser) {
      syncLocalMetadataWithCloud(currentUser);
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
        showToast(`Deleted "${track.title}"`, 'info');
      },
    });
  };

  const handleAddToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
    showToast(`Added "${track.title}" to queue`, 'info');
  };

  const handlePlayNext = (track: Track) => {
    setQueue(prev => [track, ...prev]);
    showToast(`"${track.title}" will play next`, 'info');
  };

  // --- Playlist Actions ---
  const handleSavePlaylist = async (name: string, description: string, coverColor: string) => {
    if (editingPlaylist) {
      await db.playlists.update(editingPlaylist.id, { name, description, coverColor });
      showToast(`Updated playlist "${name}"`, 'success');
    } else {
      const newPl: Omit<Playlist, 'id'> = {
        name,
        description,
        createdAt: Date.now(),
        trackIds: [],
        coverColor,
      };
      const id = await db.playlists.add(newPl as Playlist);
      showToast(`Created playlist "${name}"`, 'success');
      setCurrentView({ playlistId: id });
    }
    setEditingPlaylist(null);
    await loadDatabase();
    if (currentUser) {
      syncLocalMetadataWithCloud(currentUser);
    }
  };

  const handleDeletePlaylist = (playlistId: number) => {
    const pl = playlists.find(p => p.id === playlistId);
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Playlist',
      message: `Are you sure you want to delete playlist "${pl?.name || 'this playlist'}"? Your songs will remain in your library.`,
      onConfirm: async () => {
        await db.playlists.delete(playlistId);
        if (typeof currentView === 'object' && currentView.playlistId === playlistId) {
          setCurrentView('library');
        }
        await loadDatabase();
        if (currentUser) {
          syncLocalMetadataWithCloud(currentUser);
        }
        showToast('Playlist deleted', 'info');
      },
    });
  };

  const handleAddTrackToPlaylist = async (trackId: number, playlistId: number) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    if (pl.trackIds.includes(trackId)) {
      showToast(`Track is already in "${pl.name}"`, 'info');
      return;
    }
    const updatedIds = [...pl.trackIds, trackId];
    await db.playlists.update(playlistId, { trackIds: updatedIds });
    await loadDatabase();
    showToast(`Added to "${pl.name}"`, 'success');
  };

  const handleRemoveTrackFromPlaylist = async (trackId: number, playlistId: number) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;
    const updatedIds = pl.trackIds.filter(id => id !== trackId);
    await db.playlists.update(playlistId, { trackIds: updatedIds });
    await loadDatabase();
    showToast(`Removed track from "${pl.name}"`, 'info');
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
  }) => {
    try {
      // 1. Check if track already exists in library
      const existingTrack = library.find(
        t => t.title.toLowerCase() === song.title.toLowerCase() && t.artist.toLowerCase() === song.artist.toLowerCase()
      );
      let trackId: number;

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
          lyrics: `[00:00.00] Identified Track: ${song.title} by ${song.artist}\n[00:01.00] YouTube Music: ${song.ytMusicUrl}`,
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
      showToast(`Saved "${song.title}" to "${WISHLIST_NAME}"`, 'success');
    } catch (err) {
      console.error('Failed to save identified song to wishlist:', err);
      showToast('Could not save track to wishlist', 'error');
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

  // --- Active View Metadata for Header ---
  const currentViewDetails = useMemo(() => {
    if (currentView === 'library') {
      return { title: 'All Tracks', subtitle: `${library.length} songs in library` };
    }
    if (currentView === 'favorites') {
      const count = library.filter(t => t.isFavorite).length;
      return { title: 'Favorite Tracks', subtitle: `${count} favorite songs` };
    }
    if (currentView === 'recent') {
      return { title: 'Recently Added', subtitle: 'Sorted by date added' };
    }
    if (typeof currentView === 'object') {
      const pl = playlists.find(p => p.id === currentView.playlistId);
      return {
        title: pl?.name || 'Playlist',
        subtitle: `${pl?.trackIds.length || 0} tracks${pl?.description ? ` · ${pl.description}` : ''}`,
      };
    }
    return { title: 'Audio Library', subtitle: '' };
  }, [currentView, library, playlists]);

  const favoritesCount = useMemo(() => library.filter(t => t.isFavorite).length, [library]);

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full overflow-hidden bg-black text-zinc-100 select-none relative">
      {/* 1. Dynamic Blurred Backdrop: Apple Music ambient album glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {currentTrack?.coverDataUrl ? (
          <div 
            className="absolute -inset-10 bg-cover bg-center filter blur-3xl opacity-25 scale-125 transition-all duration-1000 ease-out transform-gpu"
            style={{ backgroundImage: `url(${currentTrack.coverDataUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 opacity-20 filter blur-3xl pointer-events-none">
            <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-rose-500/20 via-pink-600/10 to-transparent animate-pulse duration-1000" />
            <div className="absolute top-[35%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-purple-600/15 via-rose-500/10 to-transparent" />
            <div className="absolute -bottom-[20%] left-[20%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-amber-600/10 via-rose-500/15 to-transparent" />
          </div>
        )}
        {/* Soft obsidian vignette ensuring maximum contrast and legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/75 to-black pointer-events-none" />
      </div>

      {/* Toast Notification (macOS notification banner style) */}
      {toastMessage && (
        <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 animate-in slide-in-from-top-2 duration-200">
          <div className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs font-medium backdrop-blur-2xl ${
            toastMessage.type === 'success'
              ? 'bg-[#0a0a0a]/95 border-emerald-500/30 text-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-[#0a0a0a]/95 border-rose-500/30 text-rose-200'
              : 'bg-[#0a0a0a]/95 border-white/10 text-white'
          }`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle size={15} className="text-rose-400 shrink-0" />
            ) : (
              <Sparkles size={15} className="text-rose-400 shrink-0" />
            )}
            <span className="truncate max-w-xs">{toastMessage.text}</span>
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
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-transparent z-10">
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
        />

        {/* Content Table / Main View */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 pb-safe flex flex-col">
          <div className="flex-1 flex flex-col min-h-full w-full max-w-full">
            {visibleTracks.length === 0 ? (
              library.length > 0 ? (
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
                      : 'Import audio files from your device, paste a web audio URL, or generate 3 free synthwave demo tracks.'}
                  </p>
                  {!searchQuery && (
                    <div className="mt-5 flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
                      {/* Apple-style pill action buttons with subtle translucency */}
                      <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 active:scale-95 text-white rounded-full text-xs font-semibold border border-white/10 shadow-sm backdrop-blur-md transition-all flex items-center justify-center gap-2"
                      >
                        <UploadCloud size={15} />
                        <span>Import Audio Files</span>
                      </button>

                      <button
                        onClick={handleLoadDemoTracks}
                        disabled={isLoadingDemo}
                        className="w-full py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] disabled:opacity-50 text-zinc-300 hover:text-white rounded-full text-xs font-medium transition-colors flex items-center justify-center gap-2 backdrop-blur-md"
                      >
                        <Sparkles size={14} className="text-rose-400" />
                        <span>{isLoadingDemo ? 'Synthesizing...' : 'Load 3 Demo Tracks'}</span>
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
                        isCurrent={isCurrent}
                        isPlaying={isPlaying}
                        onPlay={playTrack}
                        onToggleFavorite={handleToggleFavorite}
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

            {/* Simple Footer Badge */}
            <div className="mt-auto pt-6 pb-3 sm:pb-4 flex justify-center items-center text-center select-none shrink-0">
              <span className="text-xs text-zinc-500 tracking-wide font-medium">
                Made by Aman
              </span>
            </div>
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
      <AccountModal
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
    </div>
  );
}
