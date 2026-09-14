// Logistic-regression trainer used to calibrate the draft predictor against
// real pro-match outcomes. Pure and dependency-free (plain gradient descent),
// so it is unit-testable and runs anywhere.

export interface Sample {
  /** Feature vector (raw, unstandardized). */
  features: number[];
  /** 1 = radiant won, 0 = dire won. */
  label: number;
}

export interface FitOptions {
  iterations?: number;
  learningRate?: number;
  /** L2 regularization strength. */
  l2?: number;
}

export interface FitResult {
  /** Bias term, in RAW feature space. */
  intercept: number;
  /** One coefficient per feature, in RAW feature space. */
  coeffs: number[];
}

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));

function standardize(samples: Sample[]): { mean: number[]; std: number[] } {
  const k = samples[0].features.length;
  const mean = new Array(k).fill(0);
  const std = new Array(k).fill(0);
  for (const s of samples) for (let j = 0; j < k; j++) mean[j] += s.features[j];
  for (let j = 0; j < k; j++) mean[j] /= samples.length;
  for (const s of samples) for (let j = 0; j < k; j++) std[j] += (s.features[j] - mean[j]) ** 2;
  for (let j = 0; j < k; j++) std[j] = Math.sqrt(std[j] / samples.length) || 1;
  return { mean, std };
}

/**
 * Fit a logistic regression. Internally standardizes features for stable
 * gradient descent, then converts the learned weights back to RAW feature space
 * so the predictor can apply them to unstandardized features directly.
 */
export function fitLogistic(samples: Sample[], options: FitOptions = {}): FitResult {
  if (samples.length === 0) throw new Error('fitLogistic: no samples');
  const iterations = options.iterations ?? 3000;
  const lr = options.learningRate ?? 0.1;
  const l2 = options.l2 ?? 0.0;
  const k = samples[0].features.length;
  const n = samples.length;

  const { mean, std } = standardize(samples);
  const z = samples.map((s) => s.features.map((f, j) => (f - mean[j]) / std[j]));

  let b = 0;
  const w = new Array(k).fill(0);

  for (let it = 0; it < iterations; it++) {
    let gb = 0;
    const gw = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      let logit = b;
      for (let j = 0; j < k; j++) logit += w[j] * z[i][j];
      const err = sigmoid(logit) - samples[i].label;
      gb += err;
      for (let j = 0; j < k; j++) gw[j] += err * z[i][j];
    }
    b -= lr * (gb / n);
    for (let j = 0; j < k; j++) w[j] -= lr * (gw[j] / n + l2 * w[j]);
  }

  // Convert standardized weights back to raw feature space.
  const coeffs = w.map((wj, j) => wj / std[j]);
  let intercept = b;
  for (let j = 0; j < k; j++) intercept -= (w[j] * mean[j]) / std[j];

  return { intercept, coeffs };
}

/** Fraction of samples correctly classified by the fitted model. */
export function accuracy(result: FitResult, samples: Sample[]): number {
  let correct = 0;
  for (const s of samples) {
    let logit = result.intercept;
    for (let j = 0; j < s.features.length; j++) logit += result.coeffs[j] * s.features[j];
    const pred = sigmoid(logit) >= 0.5 ? 1 : 0;
    if (pred === s.label) correct += 1;
  }
  return correct / samples.length;
}
