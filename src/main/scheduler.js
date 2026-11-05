/**
 * Triggers scans on a fixed interval while the app is running.
 *
 * The timer is recreated whenever the interval or the auto scan flag changes.
 * A tick that arrives while a scan is still running is skipped rather than
 * queued, so scans never overlap. Each `configure` call starts a new timer
 * generation; a scan that finishes under an older generation does not arm
 * a second timer.
 *
 * @module main/scheduler
 */

/**
 * Interval based scan scheduler.
 */
export class ScanScheduler {
  /**
   * @param {() => Promise<void>} runScan Function that performs one scan.
   */
  constructor(runScan) {
    this.runScan = runScan;
    this.timer = null;
    this.nextRunAt = null;
    this.intervalMinutes = 0;
    this.generation = 0;
  }

  /**
   * Applies new settings. Stops the timer when auto scan is off.
   *
   * @param {{autoScan: boolean, intervalMinutes: number}} settings Relevant settings.
   */
  configure(settings) {
    this.stop();
    if (!settings.autoScan) {
      return;
    }
    this.intervalMinutes = settings.intervalMinutes;
    this.#arm();
  }

  /** Clears the timer and invalidates the current generation. */
  stop() {
    this.generation += 1;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.nextRunAt = null;
  }

  /** @returns {string | null} ISO timestamp of the next automatic scan. */
  getNextRunAt() {
    return this.nextRunAt ? this.nextRunAt.toISOString() : null;
  }

  #arm() {
    const generation = this.generation;
    const delayMs = this.intervalMinutes * 60 * 1000;
    this.nextRunAt = new Date(Date.now() + delayMs);
    this.timer = setTimeout(async () => {
      this.timer = null;
      try {
        await this.runScan();
      } finally {
        if (generation === this.generation) {
          this.#arm();
        }
      }
    }, delayMs);
  }
}
