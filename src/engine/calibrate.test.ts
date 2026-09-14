import { describe, expect, it } from 'vitest';
import { accuracy, fitLogistic, type Sample } from './calibrate';

// Generate a linearly separable-ish dataset from known weights.
function makeSamples(n: number): Sample[] {
  const trueW = [3, -2]; // feature 0 positive, feature 1 negative
  const trueB = 0.5;
  const samples: Sample[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < n; i++) {
    const f0 = rand() * 2 - 1;
    const f1 = rand() * 2 - 1;
    const logit = trueB + trueW[0] * f0 + trueW[1] * f1;
    const p = 1 / (1 + Math.exp(-logit));
    const label = rand() < p ? 1 : 0;
    samples.push({ features: [f0, f1], label });
  }
  return samples;
}

describe('fitLogistic', () => {
  it('recovers the sign/direction of the true weights', () => {
    const samples = makeSamples(800);
    const result = fitLogistic(samples, { iterations: 4000, learningRate: 0.3 });
    expect(result.coeffs[0]).toBeGreaterThan(0); // positive feature
    expect(result.coeffs[1]).toBeLessThan(0); // negative feature
  });

  it('classifies the training data well above chance', () => {
    const samples = makeSamples(800);
    const result = fitLogistic(samples, { iterations: 4000, learningRate: 0.3 });
    expect(accuracy(result, samples)).toBeGreaterThan(0.75);
  });

  it('throws on empty input', () => {
    expect(() => fitLogistic([])).toThrow();
  });

  it('handles a constant feature without NaN (std fallback)', () => {
    const samples: Sample[] = [
      { features: [1, 0], label: 1 },
      { features: [1, 1], label: 0 },
      { features: [1, 0], label: 1 },
      { features: [1, 1], label: 0 },
    ];
    const result = fitLogistic(samples, { iterations: 1000 });
    expect(Number.isFinite(result.intercept)).toBe(true);
    expect(result.coeffs.every((c) => Number.isFinite(c))).toBe(true);
  });
});
