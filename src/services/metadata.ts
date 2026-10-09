function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to Data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function getAudioDurationViaAudioElement(file: File | Blob): Promise<number> {
  return new Promise((resolve) => {
    let resolved = false;
    const audio = document.createElement('audio');
    const url = URL.createObjectURL(file);
    audio.preload = 'metadata';

    const cleanUp = () => {
      try {
        URL.revokeObjectURL(url);
        audio.removeAttribute('src');
        audio.load();
      } catch {}
    };

    const finish = (dur: number) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      cleanUp();
      resolve(dur);
    };

    // Strict 1.8s timeout in case mobile browser never fires onloadedmetadata
    const timeoutId = setTimeout(() => {
      finish(0);
    }, 1800);

    audio.onloadedmetadata = () => {
      const dur = audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) ? audio.duration : 0;
      finish(dur);
    };

    audio.onerror = () => {
      finish(0);
    };

    try {
      audio.src = url;
    } catch {
      finish(0);
    }
  });
}

export function cleanSongTitle(rawTitleOrFilename: string): string {
  if (!rawTitleOrFilename) return 'Untitled Track';

  let cleaned = rawTitleOrFilename
    // 1. Remove file extensions (.mp3, .wav, .flac, .aac, .m4a, etc.)
    .replace(/\.[^/.]+$/, '')
    // 2. Strip common website promotion tags and brackets like [www...], (KoshalWorld.Com), (Official Audio), etc.
    .replace(/[\(\[][^\)\]]*(?:com|net|org|audio|video|lyrics)[^\)\]]*[\)\]]/gi, '')
    // 3. Remove stray double spaces or trailing punctuation
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'Untitled Track';
}

export interface ExtractedMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  format: string;
  coverDataUrl?: string;
  bitrate?: number;
  sampleRate?: number;
  lyrics?: string;
}

export async function parseAudioMetadata(file: File | Blob, rawName?: string): Promise<ExtractedMetadata> {
  const fileName = (file as File).name || rawName || 'Untitled Audio';
  const fallbackTitle = cleanSongTitle(fileName);

  try {
    // Race parser against a 2.5-second timeout so mobile devices never freeze
    const parsePromise = (async () => {
      const mmb = await import('music-metadata-browser');
      return await mmb.parseBlob(file);
    })();

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 2500);
    });

    const metadata = await Promise.race([parsePromise, timeoutPromise]);

    if (metadata) {
      let coverDataUrl: string | undefined = undefined;

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        try {
          const pic = metadata.common.picture[0];
          const uint8 = new Uint8Array(pic.data);
          const picBlob = new Blob([uint8], { type: pic.format || 'image/jpeg' });
          coverDataUrl = await blobToDataUrl(picBlob);
        } catch (err) {
          console.warn('Failed to extract album art:', err);
        }
      }

      let duration = metadata.format.duration || 0;
      if (!duration || duration <= 0) {
        duration = await getAudioDurationViaAudioElement(file);
      }

      // Extract ID3 USLT / lyrics frame if present
      let lyrics: string | undefined = undefined;
      const native = metadata.native || {};
      const id3Tags = [
        ...(native['ID3v2.3'] || []),
        ...(native['ID3v2.4'] || []),
        ...(native['ID3v2.2'] || []),
      ];

      for (const tag of id3Tags) {
        if (tag.id === 'USLT' || tag.id === 'ULT') {
          if (typeof tag.value === 'string' && tag.value.trim()) {
            lyrics = tag.value.trim();
            break;
          } else if (tag.value && typeof tag.value === 'object') {
            const txt = (Array.isArray(tag.value) ? tag.value[0]?.text : tag.value.text) || '';
            if (txt.trim()) {
              lyrics = txt.trim();
              break;
            }
          }
        }
      }

      if (!lyrics && metadata.common.lyrics && metadata.common.lyrics.length > 0) {
        lyrics = metadata.common.lyrics.join('\n\n').trim();
      }

      const rawParsedTitle = metadata.common.title?.trim();
      const sanitizedTitle = rawParsedTitle ? cleanSongTitle(rawParsedTitle) : fallbackTitle;

      return {
        title: sanitizedTitle,
        artist: metadata.common.artist?.trim() || 'Unknown Artist',
        album: metadata.common.album?.trim() || 'Local Audio',
        duration: Math.round(duration),
        format: file.type || metadata.format.container || 'audio/mpeg',
        coverDataUrl,
        bitrate: metadata.format.bitrate,
        sampleRate: metadata.format.sampleRate,
        lyrics,
      };
    }
  } catch (error) {
    console.warn('Metadata parser error or timeout, falling back:', error);
  }

  // Fallback: fast HTML5 Audio duration detection
  const duration = await getAudioDurationViaAudioElement(file);

  return {
    title: fallbackTitle,
    artist: 'Unknown Artist',
    album: 'Local Audio',
    duration: Math.round(duration),
    format: file.type || 'audio/mpeg',
    coverDataUrl: undefined,
  };
}
