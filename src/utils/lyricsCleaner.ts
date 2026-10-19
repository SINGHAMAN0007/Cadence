// Metadata cleaner and LRCLib integration optimized for Hindi, Bollywood, and International audio tracks

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  isSynced: boolean;
  lines: LyricLine[];
}

import { sanitizeMetadata } from './sanitizeMetadata';

/**
 * Strips file extensions, bitrates, website watermarks, and promotional noise
 * commonly found on downloaded Bollywood, Hindi, and local audio files.
 */
export function cleanTrackMeta(rawTitle: string, rawArtist?: string): { title: string; artist: string } {
  const sanitized = sanitizeMetadata(rawTitle, rawArtist);
  let title = sanitized.title
    .replace(/\b(feat\.?|ft\.?|full song|lyrics|audio|video|official|remix|slowed|reverb|original|hook)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  let artist = sanitized.artist === 'Unknown Artist' ? '' : sanitized.artist;
  return { title: title || sanitized.title, artist };
}

/**
 * Parses [mm:ss.xx] timestamped lines from standard LRC content.
 */
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeReg = /\[(\d{2}):(\d{2}(?:\.\d+)?)\]/;

  for (const line of lines) {
    const match = timeReg.exec(line);
    if (match) {
      const minutes = parseFloat(match[1]);
      const seconds = parseFloat(match[2]);
      const text = line.replace(timeReg, '').trim();
      if (text) {
        result.push({ time: minutes * 60 + seconds, text });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

/**
 * Fetches synced LRC or plain lyrics for a track from LRCLib API with caching in localStorage.
 * Handles exact matching, keyword query search fallback, and duration verification.
 */
export async function getLyricsForTrack(
  trackId: string | number,
  rawTitle: string,
  rawArtist?: string,
  duration?: number
): Promise<LyricsData | null> {
  const cacheKey = `cadence_lyrics_${trackId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached) as LyricsData;
    } catch {
      // invalid cache, re-fetch
    }
  }

  const { title, artist } = cleanTrackMeta(rawTitle, rawArtist);
  if (!title) return null;

  try {
    // Step 1: Direct exact match
    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}`;
    if (artist) url += `&artist_name=${encodeURIComponent(artist)}`;
    if (duration && duration > 0) url += `&duration=${Math.round(duration)}`;

    let data: any = null;
    try {
      const res = await fetch(url);
      data = res.ok ? await res.json() : null;
    } catch {
      data = null;
    }

    // Step 2: Fallback query search if direct match yields nothing
    if (!data || (!data.syncedLyrics && !data.plainLyrics)) {
      const query = artist ? `${title} ${artist}` : title;
      try {
        const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
        if (searchRes.ok) {
          const list = await searchRes.json();
          if (Array.isArray(list) && list.length > 0) {
            // Find best matching candidate (prioritize synced lyrics)
            const withSynced = list.find((item: any) => !!item.syncedLyrics);
            data = withSynced || list[0];
          }
        }
      } catch {
        // network issue
      }
    }

    // Step 3: Secondary fallback search just by cleaned title if still missing
    if ((!data || (!data.syncedLyrics && !data.plainLyrics)) && artist) {
      try {
        const titleSearchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(title)}`);
        if (titleSearchRes.ok) {
          const list = await titleSearchRes.json();
          if (Array.isArray(list) && list.length > 0) {
            const withSynced = list.find((item: any) => !!item.syncedLyrics);
            data = withSynced || list[0];
          }
        }
      } catch {
        // ignore
      }
    }

    if (!data) return null;

    let result: LyricsData;
    if (data.syncedLyrics) {
      result = {
        isSynced: true,
        lines: parseLRC(data.syncedLyrics),
      };
    } else if (data.plainLyrics) {
      result = {
        isSynced: false,
        lines: data.plainLyrics
          .split('\n')
          .map((text: string) => text.trim())
          .filter(Boolean)
          .map((text: string) => ({ time: 0, text })),
      };
    } else {
      return null;
    }

    if (result.lines.length > 0) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {
        // quota exceeded
      }
      return result;
    }

    return null;
  } catch (err) {
    console.warn('Failed to fetch lyrics from LRCLib:', err);
    return null;
  }
}
