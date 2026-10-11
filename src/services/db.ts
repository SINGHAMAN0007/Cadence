import Dexie, { type Table } from 'dexie';
import type { Track, Playlist } from '../types';

export class CadenceDB extends Dexie {
  tracks!: Table<Track, number>;
  playlists!: Table<Playlist, number>;

  constructor() {
    super('CadenceAudioDB');
    this.version(1).stores({
      tracks: '++id, title, artist, album, duration, addedAt, createdAt, isFavorite',
      playlists: '++id, name, createdAt'
    });
    this.version(2).stores({
      tracks: '++id, title, artist, album, duration, addedAt, createdAt, isFavorite, category, genre',
      playlists: '++id, name, createdAt'
    });
  }
}

export const db = new CadenceDB();
