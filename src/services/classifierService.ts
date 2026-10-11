import type { MusicCategory } from '../types';

export const CATEGORIES: { id: MusicCategory; label: string; icon: string }[] = [
  { id: 'Hindi', label: 'Hindi', icon: '🇮🇳' },
  { id: 'English', label: 'English', icon: '🌐' },
  { id: 'Phonk', label: 'Phonk', icon: '⚡' },
];

export const CATEGORY_GENRES: Record<MusicCategory, string[]> = {
  Hindi: ['Bollywood', 'Sufi/Ghazal', 'Indie Pop', 'Coke Studio/Folk', 'Remix'],
  English: ['Pop', 'Hip-Hop/Rap', 'Rock', 'EDM', 'R&B', 'Lo-Fi', 'Acoustic'],
  Phonk: ['Drift Phonk', 'Brazilian Phonk', 'Chill/Wave Phonk', 'Aggressive'],
};

/**
 * Intelligent keyword / regex heuristics for offline and instant fallback
 */
export function classifyTrackWithHeuristics(title: string, artist = ''): {
  category: MusicCategory;
  genre: string;
} {
  const combined = `${title} ${artist}`.toLowerCase();

  // 1. Phonk checks
  const phonkKeywords = [
    'phonk', 'drift', 'kordhell', 'cowbell', 'gpr', 'murder in my mind',
    'dxrk', 'interworld', 'pllx', 'metamorphosis', 'brazilian phonk', 'montagem',
    'playaphonk', 'speed up', 'tokyo drift', 'night drive', 'bass boosted',
    'driftveil', 'sxint', 'ghostface', 'pharmacist', 'memphis phonk', 'rave phonk'
  ];
  const isPhonk = phonkKeywords.some(kw => combined.includes(kw));

  if (isPhonk) {
    if (combined.includes('brazil') || combined.includes('montagem') || combined.includes('funk')) {
      return { category: 'Phonk', genre: 'Brazilian Phonk' };
    }
    if (combined.includes('chill') || combined.includes('wave') || combined.includes('ambient')) {
      return { category: 'Phonk', genre: 'Chill/Wave Phonk' };
    }
    if (combined.includes('aggressive') || combined.includes('murder') || combined.includes('rage') || combined.includes('hard')) {
      return { category: 'Phonk', genre: 'Aggressive' };
    }
    return { category: 'Phonk', genre: 'Drift Phonk' };
  }

  // 2. Hindi checks
  const hindiKeywords = [
    'arijit', 't-series', 'tseries', 'coke studio', 'pritam', 'shreya', 'sonu nigam',
    'atif aslam', 'atif', 'badshah', 'diljit', 'sidhu', 'anuv jain', 'anuv', 'prateek kuhad',
    'ar rahman', 'rahman', 'neha kakkar', 'jubin', 'b praak', 'darshan raval',
    'alka yagnik', 'kumar sanu', 'udit narayan', 'kishore kumar', 'lata mangeshkar',
    'mohammed rafi', 'jagjit singh', 'nusrat', 'rahat fateh', 'ap dhillon',
    'karan aujla', 'mc stan', 'raftaar', 'emiway', 'divine', 'kr$na', 'king',
    'jasleen royal', 'ali zafar', 'sufi', 'ghazal', 'qawwali', 'bhangra', 'punjabi',
    'bollywood', 'kesariya', 'tum hi', 'tere', 'mera', 'meri', 'dil', 'pyaar', 'ishq',
    'dheere', 'chand', 'zindagi', 'raatan', 'channa', 'kahani', 'jhoome', 'chaleya',
    'apna bana', 'tu hai kahan', 'deewana', 'sajna', 'naina', 'yaara', 'rabba'
  ];
  const isHindi = hindiKeywords.some(kw => combined.includes(kw));

  if (isHindi) {
    if (combined.includes('coke studio') || combined.includes('folk') || combined.includes('jugni') || combined.includes('qawwali')) {
      return { category: 'Hindi', genre: 'Coke Studio/Folk' };
    }
    if (combined.includes('ghazal') || combined.includes('sufi') || combined.includes('rooh') || combined.includes('shayari')) {
      return { category: 'Hindi', genre: 'Sufi/Ghazal' };
    }
    if (combined.includes('remix') || combined.includes('mashup') || combined.includes('club mix') || combined.includes('dj')) {
      return { category: 'Hindi', genre: 'Remix' };
    }
    if (combined.includes('indie') || combined.includes('acoustic') || combined.includes('unplugged') || combined.includes('anuv') || combined.includes('prateek')) {
      return { category: 'Hindi', genre: 'Indie Pop' };
    }
    return { category: 'Hindi', genre: 'Bollywood' };
  }

  // 3. Default to English with sub-genre detection
  if (combined.includes('lo-fi') || combined.includes('lofi') || combined.includes('study') || combined.includes('rain')) {
    return { category: 'English', genre: 'Lo-Fi' };
  }
  if (combined.includes('edm') || combined.includes('dance') || combined.includes('techno') || combined.includes('house') || combined.includes('synth') || combined.includes('electronic')) {
    return { category: 'English', genre: 'EDM' };
  }
  if (combined.includes('hip hop') || combined.includes('hip-hop') || combined.includes('rap') || combined.includes('trap')) {
    return { category: 'English', genre: 'Hip-Hop/Rap' };
  }
  if (combined.includes('rock') || combined.includes('metal') || combined.includes('punk') || combined.includes('guitar')) {
    return { category: 'English', genre: 'Rock' };
  }
  if (combined.includes('r&b') || combined.includes('rnb') || combined.includes('soul')) {
    return { category: 'English', genre: 'R&B' };
  }
  if (combined.includes('acoustic') || combined.includes('unplugged') || combined.includes('piano')) {
    return { category: 'English', genre: 'Acoustic' };
  }

  return { category: 'English', genre: 'Pop' };
}

/**
 * Primary classification trigger: Attempts Gemini API call, automatically
 * falling back to heuristics if offline, in Airplane mode, or if API key is absent.
 */
export async function classifyTrackWithAI(
  title: string,
  artist = ''
): Promise<{
  category: MusicCategory;
  genre: string;
  source: 'gemini' | 'heuristic';
}> {
  // If browser is offline, skip network round-trip immediately
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const result = classifyTrackWithHeuristics(title, artist);
    return { ...result, source: 'heuristic' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, artist }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    let rawCat = (data.category || '').trim();
    let rawGenre = (data.genre || '').trim();

    // Normalize category to strict types
    let category: MusicCategory = 'English';
    if (/hindi/i.test(rawCat)) category = 'Hindi';
    else if (/phonk/i.test(rawCat)) category = 'Phonk';
    else if (/english/i.test(rawCat)) category = 'English';
    else {
      category = classifyTrackWithHeuristics(title, artist).category;
    }

    // Normalize genre against allowed genres for this category
    const validGenres = CATEGORY_GENRES[category];
    let matchedGenre = validGenres.find(
      g => g.toLowerCase() === rawGenre.toLowerCase()
    );

    if (!matchedGenre) {
      // Partial match
      matchedGenre = validGenres.find(
        g => rawGenre.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(rawGenre.toLowerCase())
      );
    }

    if (!matchedGenre) {
      matchedGenre = validGenres[0];
    }

    return {
      category,
      genre: matchedGenre,
      source: 'gemini',
    };
  } catch (err) {
    console.warn('AI classification note (using heuristic fallback):', err);
    const result = classifyTrackWithHeuristics(title, artist);
    return { ...result, source: 'heuristic' };
  }
}
