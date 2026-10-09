// Lyrics extraction and synchronization service for ID3 USLT metadata and LRC formats

export interface LyricLine {
  id: string;
  time: number; // in seconds
  text: string;
  isHeader?: boolean;
}

export interface ExtractedLyricsResult {
  lyrics: string;
  source: 'id3-uslt' | 'id3-sylt' | 'common' | 'embedded' | 'manual';
  language?: string;
  description?: string;
}

// 1. Direct binary parsing of ID3v2 USLT (Unsynchronised lyrics/text transcription) frame
export function parseId3v2UsltFromBuffer(buffer: ArrayBuffer): ExtractedLyricsResult | null {
  try {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 10) return null;

    // Verify ID3 magic header: "ID3"
    if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return null;

    const version = bytes[3]; // 3 for ID3v2.3, 4 for ID3v2.4, 2 for ID3v2.2
    const flags = bytes[5];

    // Synchsafe integer (7 bits per byte)
    const tagSize =
      ((bytes[6] & 0x7f) << 21) |
      ((bytes[7] & 0x7f) << 14) |
      ((bytes[8] & 0x7f) << 7) |
      (bytes[9] & 0x7f);

    let offset = 10;

    // Handle extended header if present (bit 6 of flags)
    if (flags & 0x40) {
      if (offset + 4 <= bytes.length) {
        const extSize =
          version === 4
            ? ((bytes[offset] & 0x7f) << 21) |
              ((bytes[offset + 1] & 0x7f) << 14) |
              ((bytes[offset + 2] & 0x7f) << 7) |
              (bytes[offset + 3] & 0x7f)
            : (bytes[offset] << 24) |
              (bytes[offset + 1] << 16) |
              (bytes[offset + 2] << 8) |
              bytes[offset + 3];
        offset += extSize + 4;
      }
    }

    const end = Math.min(bytes.length, 10 + tagSize);

    while (offset + 10 <= end) {
      // Check for null padding
      if (bytes[offset] === 0) break;

      let frameId = '';
      let frameSize = 0;
      let headerLen = 10;

      if (version === 2) {
        // ID3v2.2: 3-char IDs and 3-byte size
        frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2]);
        frameSize = (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5];
        headerLen = 6;
      } else {
        frameId = String.fromCharCode(
          bytes[offset],
          bytes[offset + 1],
          bytes[offset + 2],
          bytes[offset + 3]
        );
        if (version === 4) {
          // ID3v2.4 uses synchsafe frame sizes
          frameSize =
            ((bytes[offset + 4] & 0x7f) << 21) |
            ((bytes[offset + 5] & 0x7f) << 14) |
            ((bytes[offset + 6] & 0x7f) << 7) |
            (bytes[offset + 7] & 0x7f);
        } else {
          // ID3v2.3 uses regular 32-bit big-endian
          frameSize =
            (bytes[offset + 4] << 24) |
            (bytes[offset + 5] << 16) |
            (bytes[offset + 6] << 8) |
            bytes[offset + 7];
        }
        headerLen = 10;
      }

      if (frameSize <= 0 || offset + headerLen + frameSize > bytes.length) {
        break;
      }

      const frameDataOffset = offset + headerLen;
      offset = frameDataOffset + frameSize;

      if (frameId === 'USLT' || frameId === 'ULT') {
        const encoding = bytes[frameDataOffset];
        const lang = String.fromCharCode(
          bytes[frameDataOffset + 1] || 0,
          bytes[frameDataOffset + 2] || 0,
          bytes[frameDataOffset + 3] || 0
        );

        // Find end of description (null terminated)
        let descEnd = frameDataOffset + 4;
        if (encoding === 1 || encoding === 2) {
          // 2-byte null terminator
          while (
            descEnd + 1 < frameDataOffset + frameSize &&
            !(bytes[descEnd] === 0 && bytes[descEnd + 1] === 0)
          ) {
            descEnd += 2;
          }
          descEnd += 2;
        } else {
          // 1-byte null terminator
          while (descEnd < frameDataOffset + frameSize && bytes[descEnd] !== 0) {
            descEnd++;
          }
          descEnd += 1;
        }

        const lyricsBytes = bytes.slice(descEnd, frameDataOffset + frameSize);
        let decoder: TextDecoder;
        try {
          if (encoding === 1 || encoding === 2) {
            decoder = new TextDecoder('utf-16');
          } else if (encoding === 3) {
            decoder = new TextDecoder('utf-8');
          } else {
            decoder = new TextDecoder('iso-8859-1');
          }
        } catch {
          decoder = new TextDecoder();
        }

        const decoded = decoder.decode(lyricsBytes).replace(/\0+$/, '').trim();
        if (decoded.length > 0) {
          return {
            lyrics: decoded,
            source: 'id3-uslt',
            language: lang,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Binary ID3 USLT parsing note:', err);
  }

  return null;
}

// 2. High-level extraction using music-metadata-browser + binary fallback
export async function extractLyricsFromAudioBlob(
  file: Blob | File
): Promise<ExtractedLyricsResult | null> {
  // Method A: Check via music-metadata-browser
  try {
    const mmb = await import('music-metadata-browser');
    const parsePromise = mmb.parseBlob(file);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
    const metadata = await Promise.race([parsePromise, timeoutPromise]);

    if (metadata) {
      // 1. Check native ID3 tags
      const native = metadata.native || {};
      const id3Tags = [
        ...(native['ID3v2.3'] || []),
        ...(native['ID3v2.4'] || []),
        ...(native['ID3v2.2'] || []),
      ];

      for (const tag of id3Tags) {
        if (tag.id === 'USLT' || tag.id === 'ULT') {
          let text = '';
          let language = 'eng';
          let description = '';

          if (typeof tag.value === 'string') {
            text = tag.value;
          } else if (tag.value && typeof tag.value === 'object') {
            if (Array.isArray(tag.value) && tag.value.length > 0) {
              text = tag.value[0]?.text || '';
              language = tag.value[0]?.language || 'eng';
              description = tag.value[0]?.description || '';
            } else {
              text = tag.value.text || '';
              language = tag.value.language || 'eng';
              description = tag.value.description || '';
            }
          }

          if (text && text.trim().length > 0) {
            return {
              lyrics: text.trim(),
              source: 'id3-uslt',
              language,
              description,
            };
          }
        }

        if (tag.id === 'SYLT') {
          // Synchronized lyrics frame
          if (Array.isArray(tag.value) && tag.value.length > 0) {
            const joined = tag.value.join('\n');
            if (joined.trim().length > 0) {
              return {
                lyrics: joined.trim(),
                source: 'id3-sylt',
              };
            }
          }
        }
      }

      // 2. Check common lyrics mapping
      if (metadata.common?.lyrics && metadata.common.lyrics.length > 0) {
        const text = metadata.common.lyrics.join('\n\n').trim();
        if (text.length > 0) {
          return {
            lyrics: text,
            source: 'common',
          };
        }
      }
    }
  } catch (err) {
    console.warn('music-metadata lyrics check note:', err);
  }

  // Method B: Binary scan of first 512KB for USLT frame
  try {
    const slice = file.slice(0, 512 * 1024);
    const arrayBuffer = await slice.arrayBuffer();
    const result = parseId3v2UsltFromBuffer(arrayBuffer);
    if (result) return result;
  } catch (err) {
    console.warn('Binary slice USLT check note:', err);
  }

  return null;
}

// 3. LRC Synchronized Lyrics Parser
export function parseLrc(lrcText: string, defaultDuration: number = 0): LyricLine[] {
  if (!lrcText || !lrcText.trim()) return [];

  const lines = lrcText.split(/\r?\n/);
  const result: LyricLine[] = [];
  let timeOffsetSeconds = 0;

  // Regex to match timestamps like [01:23.45], [01:23], [00:15.800]
  const timestampRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  // Regex to match header offset tag: [offset:+/-ms]
  const offsetRegex = /\[offset:\s*([+-]?\d+)\s*\]/i;

  let hasAnyTimestamps = false;

  // First pass: look for offset tags
  for (const line of lines) {
    const offsetMatch = line.match(offsetRegex);
    if (offsetMatch) {
      const ms = parseInt(offsetMatch[1], 10);
      if (!isNaN(ms)) {
        timeOffsetSeconds = ms / 1000;
      }
    }
  }

  // Second pass: extract lyrics and timestamps
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for metadata headers like [ti:Title], [ar:Artist], [al:Album], [length:...]
    if (/^\[(ti|ar|al|by|offset|re|ve|length):/i.test(line)) {
      continue;
    }

    const matches = Array.from(line.matchAll(timestampRegex));

    if (matches.length > 0) {
      hasAnyTimestamps = true;
      // Strip all timestamp tags to get text
      const text = line.replace(timestampRegex, '').trim();

      for (const match of matches) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const msStr = match[3] || '0';
        const ms = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
        const totalSeconds = Math.max(0, mins * 60 + secs + ms / 1000 + timeOffsetSeconds);

        result.push({
          id: `line-${i}-${match.index}`,
          time: totalSeconds,
          text: text || '♪', // Use musical note if it's an instrumental marker
        });
      }
    }
  }

  // If the file contained plain text lyrics without timestamps (standard unsynchronised USLT)
  if (!hasAnyTimestamps) {
    const validLines = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !/^\[.+\]$/.test(l));

    if (validLines.length > 0) {
      const safeDuration = defaultDuration > 5 ? defaultDuration : validLines.length * 4;
      const step = safeDuration / (validLines.length + 1);

      return validLines.map((text, idx) => ({
        id: `plain-${idx}`,
        time: Math.round((idx + 0.5) * step * 10) / 10,
        text,
      }));
    }
  }

  // Sort chronologically by timestamp
  result.sort((a, b) => a.time - b.time);

  return result;
}

// 4. Time formatting helper: formats seconds to 00:00.00
export function formatLrcTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `[${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}]`;
}

// 5. High-fidelity demo synchronized lyrics for demonstration and testing
export const DEMO_LYRICS: Record<string, string> = {
  'Neon Horizon': `[00:00.00]♫ (Analog synth arpeggio begins) ♫
[00:03.50]Driving through the digital dusk
[00:06.80]Neon glow cutting through the mist
[00:10.20]Analog dreams in a cybernetic sky
[00:13.90]Catching the frequency before it fades away
[00:17.50]♫ (Synth bassline groove drops) ♫
[00:21.00]City lights reflect upon the chrome
[00:24.50]Late at night we're never heading home
[00:28.00]Chasing the horizon on the line
[00:31.50]Lost forever inside 1985
[00:35.00]♫ (Echoing lead synthesizer solo) ♫
[00:40.00]Hold the wheel, accelerate the sound
[00:43.80]Feet are never touching on the ground
[00:47.50]Fading out into the neon haze
[00:51.00]♫ (Outro melody softly resonates) ♫`,

  'Midnight Rain Lofi': `[00:00.00]♫ (Soft vinyl crackle & ambient warmth) ♫
[00:04.20]Raindrops tapping softly on the windowsill
[00:08.50]Warm cup of tea in the quiet chill
[00:13.00]Distant thunder in the midnight sky
[00:17.50]Watching street reflections wandering by
[00:22.00]♫ (Mellow electric piano melody) ♫
[00:26.50]Deep breath in, let the tension release
[00:31.00]Finding comfort in this midnight peace
[00:35.50]Pages turning slowly one by one
[00:40.00]Waiting till the arrival of the sun
[00:44.50]♫ (Gentle rain dissolves into night) ♫`,

  'Deep Space Drive': `[00:00.00]♫ (Cosmic pulse oscillator active) ♫
[00:05.00]Leaving orbit, gravity let go
[00:09.50]Warp engines humming down below
[00:14.00]Starlight stretching into brilliant streaks
[00:18.50]Silence in the interstellar deep
[00:23.00]♫ (Sub-bass frequency surge) ♫
[00:28.00]Across the galaxy we glide
[00:33.00]Into the great unknown divide
[00:38.00]Nebula colors shining in our eyes
[00:43.00]No boundaries under cosmic skies
[00:48.00]♫ (Signal beacon fades into infinity) ♫`,
};
