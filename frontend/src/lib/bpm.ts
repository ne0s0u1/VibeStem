/**
 * Client-side BPM detection using energy-peak analysis on the decoded AudioBuffer.
 * Works with any mono or stereo audio file.
 */

/** Return the mean of a Float32Array */
function mean(arr: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}

/**
 * Estimate BPM from an AudioBuffer.
 * Uses low-frequency energy envelope + peak detection.
 */
export function detectBPM(buffer: AudioBuffer): number {
  const sr = buffer.sampleRate;
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;

  // Mono mix
  const len = ch0.length;
  const mono = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    mono[i] = (ch0[i] + ch1[i]) * 0.5;
  }

  // RMS energy in small windows (~11.6ms at 44100 Hz)
  const winSize = Math.round(sr / 86);
  const numWins = Math.floor(len / winSize);
  const energy = new Float32Array(numWins);
  for (let w = 0; w < numWins; w++) {
    let sq = 0;
    const start = w * winSize;
    const end = Math.min(start + winSize, len);
    for (let j = start; j < end; j++) sq += mono[j] * mono[j];
    energy[w] = sq / (end - start);
  }

  // Threshold = mean * multiplier
  const threshold = mean(energy) * 1.5;
  // Minimum gap between peaks: 0.25 s → in window units
  const minGap = Math.round((sr * 0.25) / winSize);

  const peaks: number[] = [];
  for (let i = 1; i < numWins - 1; i++) {
    if (
      energy[i] > threshold &&
      energy[i] >= energy[i - 1] &&
      energy[i] >= energy[i + 1] &&
      (peaks.length === 0 || i - peaks[peaks.length - 1] >= minGap)
    ) {
      peaks.push(i);
    }
  }

  if (peaks.length < 4) return 120;

  // Build histogram of inter-peak intervals (in windows)
  const intervalMap: Record<number, number> = {};
  for (let i = 1; i < peaks.length; i++) {
    const iv = peaks[i] - peaks[i - 1];
    intervalMap[iv] = (intervalMap[iv] ?? 0) + 1;
  }

  // Find the most common interval
  let bestIv = 0;
  let bestCount = 0;
  for (const [ivStr, count] of Object.entries(intervalMap)) {
    if (count > bestCount) {
      bestCount = count;
      bestIv = Number(ivStr);
    }
  }

  if (bestIv === 0) return 120;

  const secPerBeat = (bestIv * winSize) / sr;
  let bpm = Math.round(60 / secPerBeat);

  // Normalise to 60–180 range
  while (bpm < 60) bpm *= 2;
  while (bpm > 180) bpm = Math.round(bpm / 2);

  return bpm;
}

/**
 * Decode an audio File/Blob into an AudioBuffer (creates a temporary AudioContext).
 */
export async function decodeAudio(file: File): Promise<AudioBuffer> {
  const arrayBuf = await file.arrayBuffer();
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuf);
  await ctx.close();
  return buffer;
}
