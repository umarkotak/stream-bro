export const AUDIO_VOWEL_CONFIG = Object.freeze({
  fftSize: 2048,
  smoothingTimeConstant: 0.76,
  minDecibels: -90,
  maxDecibels: -10,
  defaultGate: 0.018,
  stableFrames: 4,
});

const VOWEL_CENTERS = [
  { mouth: "a", f1: 750, f2: 1200 },
  { mouth: "i", f1: 300, f2: 2300 },
  { mouth: "u", f1: 300, f2: 800 },
  { mouth: "e", f1: 450, f2: 1900 },
  { mouth: "o", f1: 500, f2: 950 },
];

function strongestPeak(spectrum, binSize, minimum, maximum) {
  const start = Math.max(1, Math.ceil(minimum / binSize));
  const end = Math.min(spectrum.length - 2, Math.floor(maximum / binSize));
  const radius = Math.max(2, Math.round(90 / binSize));
  let bestIndex = start;
  let bestScore = -Infinity;

  for (let index = start; index <= end; index += 1) {
    let score = 0;
    let samples = 0;
    for (let offset = -radius; offset <= radius; offset += 1) {
      const sample = spectrum[index + offset];
      if (Number.isFinite(sample)) {
        score += sample;
        samples += 1;
      }
    }
    score /= Math.max(samples, 1);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return bestIndex * binSize;
}

function nearestVowel(f1, f2) {
  let best = VOWEL_CENTERS[0];
  let bestDistance = Infinity;
  for (const vowel of VOWEL_CENTERS) {
    const distance = ((f1 - vowel.f1) / 500) ** 2 + ((f2 - vowel.f2) / 1200) ** 2;
    if (distance < bestDistance) {
      best = vowel;
      bestDistance = distance;
    }
  }
  return best.mouth;
}

export function readAudioVowel(analyser, timeData, spectrum, gate = AUDIO_VOWEL_CONFIG.defaultGate) {
  analyser.getFloatTimeDomainData(timeData);
  let energy = 0;
  for (const sample of timeData) energy += sample * sample;
  const level = Math.sqrt(energy / timeData.length);
  if (level < gate) return { mouth: "idle", level, f1: 0, f2: 0 };

  analyser.getFloatFrequencyData(spectrum);
  const binSize = analyser.context.sampleRate / analyser.fftSize;
  const f1 = strongestPeak(spectrum, binSize, 250, 950);
  const f2 = strongestPeak(spectrum, binSize, Math.max(750, f1 + 250), 2800);
  return { mouth: nearestVowel(f1, f2), level, f1, f2 };
}
