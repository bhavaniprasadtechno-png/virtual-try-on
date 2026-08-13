/**
 * A single-degree-of-freedom critically-damped spring — a lite
 * approximation of "hangs and settles toward a target," used for the
 * necklace pendant's drape tilt (see overlay.ts). Not a real multi-axis
 * physics simulation (no momentum carried across separate swing axes, no
 * air resistance) — just enough to avoid the pendant snapping instantly to
 * a new angle every time torso tilt changes.
 */
export interface SpringOptions {
  /** Spring stiffness — higher settles faster. */
  stiffness?: number;
  /**
   * Damping ratio: 1 = critically damped (fastest settle with no
   * overshoot), >1 = overdamped (slower, still no overshoot), <1 =
   * underdamped (oscillates before settling). Kept >= 1 by default so the
   * drape settles smoothly rather than visibly bouncing.
   */
  dampingRatio?: number;
}

export class Spring1D {
  private readonly stiffness: number;
  private readonly damping: number;
  private value: number;
  private velocity = 0;
  private initialized = false;

  constructor(initialValue = 0, options: SpringOptions = {}) {
    this.stiffness = options.stiffness ?? 120;
    const dampingRatio = options.dampingRatio ?? 1;
    this.damping = dampingRatio * 2 * Math.sqrt(this.stiffness);
    this.value = initialValue;
  }

  /** Advances the spring toward `target` by `dtSeconds` and returns the new value. */
  update(target: number, dtSeconds: number): number {
    // First call snaps to the target instead of springing from an
    // arbitrary initial value — matches the One Euro filter's first-sample
    // passthrough, so nothing visibly "flies in" on mount.
    if (!this.initialized) {
      this.initialized = true;
      this.value = target;
      return this.value;
    }
    const dt = Math.min(Math.max(dtSeconds, 0), 1 / 15);
    const acceleration = this.stiffness * (target - this.value) - this.damping * this.velocity;
    this.velocity += acceleration * dt;
    this.value += this.velocity * dt;
    return this.value;
  }

  reset(value: number): void {
    this.value = value;
    this.velocity = 0;
    this.initialized = true;
  }
}
