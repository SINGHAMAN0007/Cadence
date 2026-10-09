// Generates synthetic demonstration audio files using the Web Audio OfflineAudioContext
// Encodes the resulting audio buffer into standard PCM WAV format blobs.

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + length, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      // 16-bit PCM: -32768 to 32767
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export async function createDemoSynthwaveTrack(): Promise<{ blob: Blob; duration: number }> {
  const duration = 24; // 24 seconds loop
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  const tempo = 110;
  const beatSec = 60 / tempo;

  // Master Gain & Limiter
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.7, 0);
  masterGain.connect(ctx.destination);

  // Lowpass filter for warm synth texture
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400, 0);
  filter.Q.setValueAtTime(3, 0);
  filter.connect(masterGain);

  // Synth Bass & Arpeggio notes (Fm - Db - Ab - Eb)
  const bassNotes = [87.31, 69.30, 103.83, 77.78]; // F, Db, Ab, Eb
  const leadScales = [
    [174.61, 220.00, 261.63, 329.63, 392.00, 523.25],
    [138.59, 174.61, 207.65, 277.18, 329.63, 415.30],
    [207.65, 261.63, 311.13, 415.30, 466.16, 523.25],
    [155.56, 196.00, 233.08, 311.13, 349.23, 466.16],
  ];

  const barSec = beatSec * 4;
  const totalBars = Math.floor(duration / barSec);

  // Kick & Snare rhythms
  for (let i = 0; i < duration; i += beatSec) {
    const beatIndex = Math.round(i / beatSec);

    // Kick on 1 and 3
    if (beatIndex % 2 === 0) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, i);
      osc.frequency.exponentialRampToValueAtTime(35, i + 0.18);
      gain.gain.setValueAtTime(0.9, i);
      gain.gain.exponentialRampToValueAtTime(0.001, i + 0.22);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(i);
      osc.stop(i + 0.25);
    } else {
      // Snare on 2 and 4
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, i);
      osc.frequency.exponentialRampToValueAtTime(60, i + 0.12);
      oscGain.gain.setValueAtTime(0.4, i);
      oscGain.gain.exponentialRampToValueAtTime(0.01, i + 0.15);
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      osc.start(i);
      osc.stop(i + 0.16);
    }

    // Hi-hat on every 8th note
    for (let sub = 0; sub < 2; sub++) {
      const t = i + sub * (beatSec / 2);
      if (t >= duration) break;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  // Bass line & 16th note synth arpeggio
  for (let bar = 0; bar < totalBars; bar++) {
    const chordIdx = bar % 4;
    const baseFreq = bassNotes[chordIdx];
    const barStart = bar * barSec;

    // Bass synth
    for (let b = 0; b < 4; b++) {
      const bt = barStart + b * beatSec;
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(baseFreq, bt);
      bassGain.gain.setValueAtTime(0.35, bt);
      bassGain.gain.exponentialRampToValueAtTime(0.01, bt + beatSec * 0.9);
      bassOsc.connect(bassGain);
      bassGain.connect(filter);
      bassOsc.start(bt);
      bassOsc.stop(bt + beatSec);
    }

    // Arp lead 16th notes
    const notes = leadScales[chordIdx];
    const step = beatSec / 4;
    for (let s = 0; s < 16; s++) {
      const st = barStart + s * step;
      if (st >= duration) break;
      const noteFreq = notes[s % notes.length];
      const leadOsc = ctx.createOscillator();
      const leadGain = ctx.createGain();
      leadOsc.type = 'sawtooth';
      leadOsc.frequency.setValueAtTime(noteFreq * 2, st);
      leadGain.gain.setValueAtTime(0.12, st);
      leadGain.gain.exponentialRampToValueAtTime(0.001, st + step * 0.85);
      leadOsc.connect(leadGain);
      leadGain.connect(filter);
      leadOsc.start(st);
      leadOsc.stop(st + step);
    }
  }

  const renderedBuffer = await ctx.startRendering();
  return { blob: audioBufferToWav(renderedBuffer), duration };
}

export async function createDemoChillAmbientTrack(): Promise<{ blob: Blob; duration: number }> {
  const duration = 20;
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.65, 0);
  masterGain.connect(ctx.destination);

  // Soft lush pad chords (Cmaj7 - Am7 - Fmaj7 - Gsus4)
  const chords = [
    [261.63, 329.63, 392.00, 493.88], // C E G B
    [220.00, 261.63, 329.63, 392.00], // A C E G
    [174.61, 220.00, 261.63, 329.63], // F A C E
    [196.00, 261.63, 293.66, 392.00], // G C D G
  ];

  const chordLen = 5;
  for (let i = 0; i < chords.length; i++) {
    const t = i * chordLen;
    const notes = chords[i];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      // Gentle swell attack and decay
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 1.2);
      gain.gain.setValueAtTime(0.12, t + chordLen - 1.2);
      gain.gain.linearRampToValueAtTime(0.001, t + chordLen);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + chordLen);
    });
  }

  // Soft vinyl / acoustic pulse click
  for (let t = 0; t < duration; t += 0.8) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60, t);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  const rendered = await ctx.startRendering();
  return { blob: audioBufferToWav(rendered), duration };
}

export async function createDemoCosmicPulseTrack(): Promise<{ blob: Blob; duration: number }> {
  const duration = 18;
  const sampleRate = 44100;
  const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.7, 0);
  masterGain.connect(ctx.destination);

  // Energetic electronic bassline
  const pulseFreqs = [110, 110, 146.83, 130.81, 164.81, 146.83, 110, 98];
  const step = 0.28;

  for (let t = 0; t < duration; t += step) {
    const idx = Math.floor(t / step) % pulseFreqs.length;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(pulseFreqs[idx], t);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + step * 0.9);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc.stop(t + step);
  }

  const rendered = await ctx.startRendering();
  return { blob: audioBufferToWav(rendered), duration };
}
