export interface Track {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  blob: Blob; // Full binary audio file (Blob/File) stored directly in IndexedDB
  addedAt: number; // Timestamp added
  file: Blob | File; // Backward-compatibility alias for blob
  createdAt: number; // Backward-compatibility alias for addedAt
  format: string;
  size: number; // bytes
  coverDataUrl?: string;
  isFavorite?: boolean;
  bitrate?: number;
  sampleRate?: number;
  lyrics?: string; // ID3 USLT / LRC synchronized lyrics
}

export interface Playlist {
  id: number;
  name: string;
  description?: string;
  createdAt: number;
  trackIds: number[];
  coverColor?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type VisualizerMode = 'bars' | 'wave' | 'circle';

export type SortField = 'title' | 'artist' | 'duration' | 'createdAt' | 'album';
export type SortOrder = 'asc' | 'desc';

export interface SleepTimerState {
  isActive: boolean;
  initialSeconds: number;
  remainingSeconds: number;
  fadeOutEnabled: boolean;
}
