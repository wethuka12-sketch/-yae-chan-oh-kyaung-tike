// Lightweight in-memory WAV soundscape synthesizer for serene, reliable
// client-side Dhamma audio and video playback without external CDN failures.

const blobCache = new Map<string, string>();

export interface AcousticProfile {
  baseFreq: number;
  harmonicFreq: number;
  chimeIntervalSec: number;
  durationSec: number;
}

export function getSynthesizedAudioUrl(trackId: string, profile: AcousticProfile): string {
  const existing = blobCache.get(trackId);
  if (existing) {
    return existing;
  }

  const sampleRate = 11025; // Lightweight 11kHz mono PCM for compact memory footprint
  const totalSamples = Math.floor(sampleRate * profile.durationSec);
  const dataSize = totalSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const twoPi = Math.PI * 2;
  const f0 = profile.baseFreq;
  const f1 = profile.harmonicFreq;
  const chimePeriod = profile.chimeIntervalSec;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Gentle fade-in and fade-out envelope for smooth looping/ending
    const fadeIn = Math.min(1, t / 1.5);
    const fadeOut = Math.min(1, (profile.durationSec - t) / 2.0);
    const globalEnv = fadeIn * fadeOut;

    // Warm singing bowl & tanpura-like drone
    const slowMod = 0.65 + 0.35 * Math.sin(twoPi * 0.14 * t);
    const drone =
      0.28 * Math.sin(twoPi * f0 * t) +
      0.16 * Math.sin(twoPi * (f0 * 1.5) * t) +
      0.11 * Math.sin(twoPi * f1 * t);

    // Periodic monastery bell chime with natural exponential decay
    const localTime = t % chimePeriod;
    const bellDecay = Math.exp(-localTime * 0.95);
    const bell =
      0.34 *
      bellDecay *
      (Math.sin(twoPi * (f1 * 2) * localTime) +
        0.45 * Math.sin(twoPi * (f1 * 3.01) * localTime) +
        0.2 * Math.sin(twoPi * (f1 * 4.02) * localTime));

    const sample = Math.max(-0.92, Math.min(0.92, (drone * slowMod + bell) * 0.42 * globalEnv));
    view.setInt16(44 + i * 2, Math.floor(sample * 32767), true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  blobCache.set(trackId, url);
  return url;
}

function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export function formatTimeSec(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
