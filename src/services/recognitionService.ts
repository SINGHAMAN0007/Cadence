export interface IdentifiedSongResult {
  title: string;
  artist: string;
  album: string;
  release_date?: string;
  artwork_url?: string | null;
  youtube_url?: string | null;
  youtube_video_id?: string | null;
  spotify_url?: string | null;
}

export interface SongRecognitionResponse {
  status: 'success' | 'not_found' | 'error';
  result?: IdentifiedSongResult;
  message?: string;
}

/**
 * Builds the direct YouTube Music URL:
 * - If direct link is provided by API, uses that.
 * - If video ID is available, constructs direct watch URL.
 * - Otherwise constructs the deep search URL: https://music.youtube.com/search?q=...
 */
export function buildYouTubeMusicUrl(
  title: string,
  artist: string,
  directUrl?: string | null,
  videoId?: string | null
): string {
  if (directUrl) {
    if (directUrl.includes('music.youtube.com')) {
      return directUrl;
    }
    if (directUrl.includes('youtube.com/watch?v=')) {
      return directUrl.replace(/https?:\/\/(www\.)?youtube\.com\/watch\?v=/, 'https://music.youtube.com/watch?v=');
    }
    const match = directUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://music.youtube.com/watch?v=${match[1]}`;
    }
  }

  if (videoId) {
    return `https://music.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  }

  return `https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`;
}

/**
 * Builds the Spotify search or direct track link:
 * - If direct link is provided by API, uses that.
 * - Otherwise constructs deep search URL: https://open.spotify.com/search/...
 */
export function buildSpotifyUrl(
  title: string,
  artist: string,
  directUrl?: string | null
): string {
  if (directUrl) {
    if (directUrl.includes('open.spotify.com') || directUrl.startsWith('spotify:')) {
      return directUrl;
    }
  }
  return `https://open.spotify.com/search/${encodeURIComponent(title + ' ' + artist)}`;
}

/**
 * Captures a 5-second microphone audio snippet via navigator.mediaDevices.getUserMedia
 * and immediately stops all media tracks to release microphone access.
 */
export async function captureAudioSnippet(
  durationMs = 7000,
  onProgress?: (remainingSec: number) => void,
  onAudioLevels?: (levels: number[]) => void
): Promise<{ blob: Blob; base64: string; mimeType: string }> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Microphone access is not supported in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
    },
  });

  // Optional real-time audio analysis for live visualizer
  let audioContext: AudioContext | null = null;
  let animFrameId: number | null = null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx && onAudioLevels) {
      audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevels = () => {
        if (!audioContext || audioContext.state === 'closed') return;
        analyser.getByteFrequencyData(dataArray);
        // Extract 16 frequency bands normalized 0-1
        const bands: number[] = [];
        const step = Math.max(1, Math.floor(bufferLength / 16));
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          bands.push(Math.min(1, Math.max(0.08, val / 255)));
        }
        onAudioLevels(bands);
        animFrameId = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    }
  } catch {
    // Ignore audio analysis error on restricted devices
  }

  return new Promise((resolve, reject) => {
    try {
      // Pick standard mobile-compatible MIME type
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      let intervalId: ReturnType<typeof setInterval> | null = null;
      let secondsLeft = Math.ceil(durationMs / 1000);
      onProgress?.(secondsLeft);

      intervalId = setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft >= 0) {
          onProgress?.(secondsLeft);
        }
      }, 1000);

      const cleanup = () => {
        if (intervalId) clearInterval(intervalId);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close().catch(() => {});
        }
        // Crucial: immediately stop all audio media tracks to release microphone access
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.onstop = () => {
        cleanup();

        // Compile all recorded chunks into a single Blob
        const audioBlob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();

        reader.onloadend = () => {
          const base64Data = (reader.result as string) || '';
          resolve({
            blob: audioBlob,
            base64: base64Data,
            mimeType,
          });
        };

        reader.onerror = (readErr) => {
          reject(readErr);
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.onerror = (recErr) => {
        cleanup();
        reject(recErr);
      };

      mediaRecorder.start(250);

      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      }, durationMs);
    } catch (err) {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (audioContext) audioContext.close().catch(() => {});
      stream.getTracks().forEach((track) => track.stop());
      reject(err);
    }
  });
}

/**
 * Sends audio snippet to recognition service:
 * 1. Attempts direct AudD API request with FormData.
 * 2. If AudD fails or token quota exceeded, falls back to Gemini Multimodal Audio analysis.
 */
export async function identifyAudioTrack(
  audioBlob: Blob,
  audioBase64: string,
  mimeType: string,
  userApiKey?: string
): Promise<SongRecognitionResponse> {
  // 1. Try direct AudD API via FormData (browser sets boundary automatically)
  try {
    const formData = new FormData();
    const filename = mimeType.includes('mp4') ? 'recording.mp4' : 'recording.webm';
    formData.append('file', audioBlob, filename);
    formData.append('api_token', userApiKey || 'test');
    formData.append('return', 'apple_music,spotify,deezer');

    const auddRes = await fetch('https://api.audd.io/', {
      method: 'POST',
      body: formData, // Do NOT set Content-Type header
    });

    if (auddRes.ok) {
      const auddJson = await auddRes.json();
      if (auddJson.status === 'success' && auddJson.result) {
        const r = auddJson.result;
        let ytUrl: string | null = null;
        if (r.youtube?.link) ytUrl = r.youtube.link;
        else if (r.media && Array.isArray(r.media)) {
          const ytMedia = r.media.find((m: unknown) => (m as { provider?: string })?.provider === 'youtube');
          if (ytMedia?.url) ytUrl = ytMedia.url;
        }

        let spotifyUrl: string | null = null;
        if (r.spotify?.external_urls?.spotify) {
          spotifyUrl = r.spotify.external_urls.spotify;
        } else if (r.spotify?.link) {
          spotifyUrl = r.spotify.link;
        } else if (r.spotify?.id) {
          spotifyUrl = `https://open.spotify.com/track/${r.spotify.id}`;
        } else {
          spotifyUrl = buildSpotifyUrl(r.title, r.artist);
        }

        return {
          status: 'success',
          result: {
            title: r.title,
            artist: r.artist,
            album: r.album || 'Single',
            release_date: r.release_date,
            artwork_url: r.spotify?.album?.images?.[0]?.url || r.apple_music?.artwork?.url || null,
            youtube_url: ytUrl,
            spotify_url: spotifyUrl,
          },
        };
      }
    }
  } catch (auddErr) {
    console.warn('Direct AudD recognition attempt note:', auddErr);
  }

  // 2. Fallback: Gemini Multimodal & Acoustic Search via server proxy
  try {
    const res = await fetch('/api/identify-song', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audioBase64, mimeType, userApiKey }),
    });

    if (res.ok) {
      const data = (await res.json()) as SongRecognitionResponse;
      if (data.status === 'success' && data.result) {
        return data;
      }
    }
  } catch (fallbackErr) {
    console.warn('Gemini audio recognition fallback note:', fallbackErr);
  }

  return { status: 'not_found' };
}
