import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize GoogleGenAI with telemetry headers as required by Gemini API skill
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Song Recognition endpoint (AudD API and Gemini Audio Multimodal)
app.post('/api/identify-song', async (req, res) => {
  const { audioBase64, mimeType, userApiKey } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ status: 'error', error: 'audioBase64 is required' });
  }

  const effectiveAuddToken = userApiKey || process.env.AUDD_API_KEY;

  // 1. If AudD API key is provided, query AudD API
  if (effectiveAuddToken) {
    try {
      const auddFormData = new URLSearchParams();
      auddFormData.append('api_token', effectiveAuddToken);
      auddFormData.append('audio', audioBase64);
      auddFormData.append('return', 'apple_music,spotify,deezer,youtube');

      const auddRes = await fetch('https://api.audd.io/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: auddFormData.toString(),
      });

      if (auddRes.ok) {
        const auddJson = await auddRes.json();
        if (auddJson.status === 'success' && auddJson.result) {
          const r = auddJson.result;
          let ytUrl: string | null = null;
          if (r.youtube?.link) ytUrl = r.youtube.link;
          else if (r.media && Array.isArray(r.media)) {
            const ytMedia = r.media.find((m: any) => m.provider === 'youtube');
            if (ytMedia?.url) ytUrl = ytMedia.url;
          }

          return res.json({
            status: 'success',
            result: {
              title: r.title,
              artist: r.artist,
              album: r.album || 'Single',
              release_date: r.release_date,
              artwork_url: r.spotify?.album?.images?.[0]?.url || r.apple_music?.artwork?.url || null,
              youtube_url: ytUrl,
            },
          });
        }
      }
    } catch (auddErr) {
      console.warn('AudD recognition note:', auddErr);
    }
  }

  // 2. Multimodal AI Audio Recognition with Gemini (Fallback Acoustic Search)
  if (process.env.GEMINI_API_KEY) {
    try {
      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
      const audioPart = {
        inlineData: {
          mimeType: (mimeType || 'audio/webm').split(';')[0],
          data: cleanBase64,
        },
      };

      const prompt = `Identify the title, artist, and genre of this recorded audio snippet. If exact track matching is uncertain, identify the prominent lyrics or musical melody. Return JSON: { "title": string, "artist": string, "genre": string, "confidence": "high" | "medium" | "low" | "none" }.
If no recognizable song or melody is present, set title to "" and artist to "" and confidence to "none". Return ONLY valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts: [audioPart, { text: prompt }] },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text?.trim() || '{}';
      const parsed = JSON.parse(text);
      if (parsed.title && parsed.title.toLowerCase() !== 'unknown' && parsed.confidence !== 'none') {
        const title = parsed.title.trim();
        const artist = (parsed.artist || 'Unknown Artist').trim();
        const ytMusicUrl = `https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`;
        return res.json({
          status: 'success',
          result: {
            title,
            artist,
            album: parsed.genre || 'Single',
            artwork_url: null,
            youtube_url: ytMusicUrl,
          },
        });
      }
      return res.json({ status: 'not_found' });
    } catch (err: unknown) {
      console.warn('Gemini audio recognition error:', err);
      return res.json({ status: 'not_found', message: (err as Error)?.message });
    }
  }

  return res.json({ status: 'not_found' });
});

// Classification endpoint for audio track Category and Genre tagging
app.post('/api/classify', async (req, res) => {
  const { title, artist } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    const prompt = `Classify this track into Category (strictly one of: "Hindi", "English", or "Phonk") and primary Genre.
Track title: "${title}"
Artist: "${artist || 'Unknown'}"

Category options:
- Hindi: Indian music, Bollywood, Sufi, Ghazal, Coke Studio, Indian Indie, Punjabi/Desi
- English: Western music, Global Pop, Rock, EDM, Hip-Hop, Lo-Fi, Acoustic
- Phonk: Drift Phonk, Brazilian Phonk, Cowbell/Memphis phonk, Aggressive bass wave

Allowed primary genres:
- If Hindi: "Bollywood", "Sufi/Ghazal", "Indie Pop", "Coke Studio/Folk", "Remix"
- If English: "Pop", "Hip-Hop/Rap", "Rock", "EDM", "R&B", "Lo-Fi", "Acoustic"
- If Phonk: "Drift Phonk", "Brazilian Phonk", "Chill/Wave Phonk", "Aggressive"

Return ONLY valid JSON in this exact structure:
{"category": "Hindi" | "English" | "Phonk", "genre": string}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (err: unknown) {
    console.error('Gemini classification error:', err);
    const message = (err as Error)?.message || 'Failed to classify track with Gemini';
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
