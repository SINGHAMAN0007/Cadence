import { useEffect, useRef, useState, useCallback } from 'react';

// AudioContext singleton to prevent multiple AudioContext warnings and leakages
let sharedAudioContext: AudioContext | null = null;
let sharedAnalyserNode: AnalyserNode | null = null;
const connectedMediaElements = new WeakSet<HTMLMediaElement>();

/**
 * Retrieves or initializes the shared singleton AudioContext and AnalyserNode
 * configured with fftSize = 256 and smoothingTimeConstant = 0.82.
 */
export function getOrCreateSharedAudioPipeline(): {
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
} {
  try {
    if (!sharedAudioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (AudioContextClass) {
        sharedAudioContext = new AudioContextClass();
      }
    }

    if (sharedAudioContext && !sharedAnalyserNode) {
      const analyser = sharedAudioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.86;
      sharedAnalyserNode = analyser;
    }
  } catch (err) {
    console.warn('Web Audio pipeline initialization notice:', err);
  }

  return {
    audioContext: sharedAudioContext,
    analyser: sharedAnalyserNode,
  };
}

/**
 * Safely connects an HTMLMediaElement to the shared AnalyserNode and destination.
 * Uses a WeakSet guard so createMediaElementSource is called exactly once per element.
 */
export function connectMediaElementToPipeline(mediaElement: HTMLMediaElement | null): AnalyserNode | null {
  if (!mediaElement) return null;

  const { audioContext, analyser } = getOrCreateSharedAudioPipeline();
  if (!audioContext || !analyser) return null;

  if (!connectedMediaElements.has(mediaElement)) {
    try {
      const source = audioContext.createMediaElementSource(mediaElement);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      connectedMediaElements.add(mediaElement);
    } catch (err) {
      // If element was already connected earlier by browser session, capture it
      console.warn('Media element connection note:', err);
      connectedMediaElements.add(mediaElement);
    }
  }

  // Ensure AudioContext is running if suspended
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return analyser;
}

/**
 * Logarithmic / Low-Mid Bin Sampling between bins 2 and 48:
 * Focuses on kicks, bass, snares, and vocals so bars react rhythmically to transients.
 * Supports symmetric center-outward bin mapping for equalizers.
 */
export function sampleLogarithmicBins(
  analyser: AnalyserNode | null,
  buffer: Uint8Array,
  barCount: number,
  minBin: number = 2,
  maxBin: number = 48,
  symmetric: boolean = false
): number[] {
  const result = new Array(barCount).fill(0);
  if (!analyser) return result;

  try {
    analyser.getByteFrequencyData(buffer as any);
  } catch {
    return result;
  }

  const effectiveMin = Math.max(1, minBin);
  const effectiveMax = Math.min(buffer.length - 1, maxBin);
  const halfCount = (barCount - 1) / 2;

  for (let i = 0; i < barCount; i++) {
    let norm = i / Math.max(1, barCount - 1);
    let nextNorm = (i + 1) / Math.max(1, barCount - 1);

    if (symmetric && halfCount > 0) {
      const dist = Math.abs(i - halfCount) / halfCount;
      const nextDist = Math.min(1, dist + 1 / halfCount);
      norm = dist;
      nextNorm = nextDist;
    }

    // Logarithmic distribution across minBin..maxBin
    const startBin = Math.min(
      effectiveMax,
      Math.floor(effectiveMin * Math.pow(effectiveMax / effectiveMin, norm))
    );
    const endBin = Math.min(
      effectiveMax + 1,
      Math.max(startBin + 1, Math.floor(effectiveMin * Math.pow(effectiveMax / effectiveMin, nextNorm)))
    );

    let sum = 0;
    let count = 0;
    // Add subtle alternating bin dispersion for lively left/right organic character
    const isLeftSide = symmetric && i < halfCount;
    for (let b = startBin; b < endBin && b < buffer.length; b++) {
      if (symmetric && endBin - startBin > 2) {
        if (isLeftSide && b % 2 === 1) continue;
        if (!isLeftSide && b % 2 === 0 && endBin - startBin > 3) continue;
      }
      sum += buffer[b];
      count++;
    }

    const rawAverage = count > 0 ? sum / count : (buffer[startBin] || 0);

    // Raw normalized amplitude [0..1]
    const normalized = rawAverage / 255;
    result[i] = Math.min(1, Math.max(0, normalized));
  }

  return result;
}

/**
 * Shared React Hook attached to the main <audio> element.
 * Provides the shared AnalyserNode and maintains the Web Audio pipeline.
 */
export function useAudioVisualizer(
  audioRef?: React.RefObject<HTMLAudioElement | null>,
  isPlaying?: boolean
) {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(() => sharedAnalyserNode);
  const audioContextRef = useRef<AudioContext | null>(null);

  const setupAnalyser = useCallback(() => {
    if (!audioRef?.current) return null;
    const node = connectMediaElementToPipeline(audioRef.current);
    if (node) {
      setAnalyser(node);
      audioContextRef.current = sharedAudioContext;
    }
    return node;
  }, [audioRef]);

  const resumeAudioContext = useCallback(() => {
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
  }, []);

  // Connect when audio element ref is ready or isPlaying changes
  useEffect(() => {
    if (audioRef?.current) {
      const node = setupAnalyser();
      if (node && !analyser) {
        setAnalyser(node);
      }
    }
  }, [audioRef, setupAnalyser, analyser]);

  // Handle play / resume
  useEffect(() => {
    if (isPlaying) {
      resumeAudioContext();
    }
  }, [isPlaying, resumeAudioContext]);

  return {
    analyser: analyser || sharedAnalyserNode,
    setupAnalyser,
    resumeAudioContext,
    audioContext: sharedAudioContext,
  };
}
