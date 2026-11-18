export interface PhotosynthesisReading {
  step: number;
  label: string;
  light: number;
  co2: number;
  temp: number;
  rate: number;
  limitingFactor: string;
}

export function computeTempEffect(tempC: number): number {
  if (tempC <= 10) return 0.2;
  if (tempC <= 30) {
    // Smooth rise from 10°C (0.2) to peak 30°C (1.0), giving ~0.85 at 25°C
    const t = (tempC - 10) / 20;
    return 0.2 + 0.8 * Math.sin((t * Math.PI) / 2);
  }
  if (tempC <= 40) {
    // Gentle decline between 30°C (1.0) and 40°C (0.72), giving ~0.95 at 35°C (> 0.85 at 25°C)
    const t = (tempC - 30) / 10;
    return 1.0 - 0.28 * t * t;
  }
  // Sharp enzyme denaturation drop above 40°C down to near zero at 55°C
  const over = Math.min(1, (tempC - 40) / 15);
  return Math.max(0.02, 0.72 * Math.pow(1 - over, 2.2));
}

export function computePhotosynthesisRate(
  light: number,
  co2: number,
  tempC: number,
): {
  rate: number;
  lightEffect: number;
  co2Effect: number;
  tempEffect: number;
  limitingFactor: string;
} {
  const L = Math.max(0, Math.min(300, light));
  const C = Math.max(0.01, Math.min(0.25, co2));
  const lightEffect = L / (L + 80);
  const co2Effect = C / (C + 0.06);
  const tempEffect = computeTempEffect(tempC);

  // Smooth Liebig saturation: dominated by the lowest factor while preserving slight multi-factor responsiveness
  const combined = 0.8 * Math.min(lightEffect, co2Effect) + 0.2 * (lightEffect * co2Effect);
  const rate = Math.max(0, Math.round(60 * combined * tempEffect));

  let limitingFactor = 'Light';
  if (tempC > 40) {
    limitingFactor = 'Denatured (Temp)';
  } else if (tempEffect < 0.88 && lightEffect >= 0.6 && co2Effect >= 0.55) {
    limitingFactor = 'Temperature';
  } else if (co2Effect < lightEffect - 0.03) {
    limitingFactor = 'CO₂';
  } else if (lightEffect <= co2Effect) {
    limitingFactor = 'Light';
  } else {
    limitingFactor = 'CO₂';
  }

  return { rate, lightEffect, co2Effect, tempEffect, limitingFactor };
}
