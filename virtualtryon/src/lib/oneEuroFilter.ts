/**
 * One Euro Filter (Casiez, Roussel, Vogel 2012) — a low-pass filter whose
 * cutoff frequency adapts to signal speed, so it smooths jitter at rest
 * without adding noticeable lag during fast motion. Used to steady the raw
 * per-frame MediaPipe landmark positions before they drive product
 * placement, since detection noise otherwise reads as visible jitter.
 */

function lowPassAlpha(cutoffHz: number, dtSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSeconds);
}

export interface OneEuroFilterOptions {
  /** Baseline cutoff frequency (Hz) at rest — lower = smoother but laggier. */
  minCutoff?: number;
  /** How much the cutoff rises with speed — higher = less lag on fast motion, more jitter at rest. */
  beta?: number;
  /** Cutoff for the derivative estimate itself. */
  derivateCutoff?: number;
}

/** Filters a single scalar signal over time. Construct one per tracked value (e.g. one per landmark x/y coordinate). */
export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly derivateCutoff: number;
  private lastValue: number | null = null;
  private lastDerivative = 0;
  private lastTimestampMs: number | null = null;

  constructor(options: OneEuroFilterOptions = {}) {
    this.minCutoff = options.minCutoff ?? 1.0;
    this.beta = options.beta ?? 0.02;
    this.derivateCutoff = options.derivateCutoff ?? 1.0;
  }

  /** Feeds one new sample; returns the filtered value. Call once per frame with a monotonically increasing timestamp. */
  filter(value: number, timestampMs: number): number {
    if (this.lastValue === null || this.lastTimestampMs === null) {
      this.lastValue = value;
      this.lastTimestampMs = timestampMs;
      return value;
    }

    const dt = Math.max((timestampMs - this.lastTimestampMs) / 1000, 1 / 240);
    this.lastTimestampMs = timestampMs;

    const derivative = (value - this.lastValue) / dt;
    const dAlpha = lowPassAlpha(this.derivateCutoff, dt);
    const smoothedDerivative = this.lastDerivative + dAlpha * (derivative - this.lastDerivative);
    this.lastDerivative = smoothedDerivative;

    const cutoff = this.minCutoff + this.beta * Math.abs(smoothedDerivative);
    const alpha = lowPassAlpha(cutoff, dt);
    const smoothedValue = this.lastValue + alpha * (value - this.lastValue);
    this.lastValue = smoothedValue;

    return smoothedValue;
  }

  reset(): void {
    this.lastValue = null;
    this.lastDerivative = 0;
    this.lastTimestampMs = null;
  }
}

/** Filters a 2D point (e.g. a landmark's canvas x/y) using one OneEuroFilter per axis. */
export class Point2DFilter {
  private readonly x: OneEuroFilter;
  private readonly y: OneEuroFilter;

  constructor(options?: OneEuroFilterOptions) {
    this.x = new OneEuroFilter(options);
    this.y = new OneEuroFilter(options);
  }

  filter(point: { x: number; y: number }, timestampMs: number): { x: number; y: number } {
    return { x: this.x.filter(point.x, timestampMs), y: this.y.filter(point.y, timestampMs) };
  }

  reset(): void {
    this.x.reset();
    this.y.reset();
  }
}
