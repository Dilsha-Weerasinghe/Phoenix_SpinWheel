const TOTAL_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours default
const MAX_TOTAL_PRIZES = 45; // 10 tshirt + 25 cap + 10 shoe_rack — must match DB defaults

/**
 * Core probability calculation — shared by both exported functions.
 * @param {Object} record - The daily_prizes MongoDB record
 * @returns {number} winProbability (0–1)
 */
function computeProbability(record) {
  const { prizes, firstSpinTime } = record;

  // ── Manual override ───────────────────────────────────────────────────────
  // If the admin has set a manual probability, use it directly.
  if (record.manualProbability !== null && record.manualProbability !== undefined) {
    return Math.min(Math.max(record.manualProbability, 0), 1);
  }

  const durationHours = record.durationHours || 6;
  const totalDurationMs = durationHours * 60 * 60 * 1000;
  const now = new Date();

  const totalRemaining = (prizes.tshirt || 0) + (prizes.cap || 0) + (prizes.shoe_rack || 0);
  if (totalRemaining === 0) return 0;

  const elapsedTime = now.getTime() - new Date(firstSpinTime).getTime();
  const elapsedRatio = Math.min(Math.max(elapsedTime / totalDurationMs, 0), 1.0);

  // ── Hard early suppression ────────────────────────────────────────────────
  // First 10% of the window (e.g. first 36 min of a 6h window): flat 1%.
  // This ensures no pacing logic can cause a high rate right at the start.
  if (elapsedRatio < 0.10) {
    return 0.01;
  }

  // ── Time-driven base probability (quadratic ramp) ─────────────────────────
  // t=10%: ~1%  | t=25%: ~3% | t=50%: ~8% | t=75%: ~18% | t=100%: ~30%
  let winProbability = 0.01 + (elapsedRatio * elapsedRatio * 0.29);

  // ── Prize pacing fine-tuning (secondary adjustment only) ─────────────────
  const remainingRatio     = totalRemaining / MAX_TOTAL_PRIZES;
  const expectedRemainingRatio = 1.0 - elapsedRatio;
  const diff = remainingRatio - expectedRemainingRatio;
  winProbability += diff * 0.10; // small ±nudge

  // ── Bounds ────────────────────────────────────────────────────────────────
  if (winProbability < 0.005) winProbability = 0.005; // floor 0.5%
  if (winProbability > 0.45)  winProbability = 0.45;  // ceiling 45%

  // ── End-of-window force ───────────────────────────────────────────────────
  // If the full duration has passed and prizes still remain, force high prob.
  if (elapsedRatio >= 1.0 && totalRemaining > 0) winProbability = 0.80;

  return winProbability;
}

/**
 * Calculates win probability and determines the spin outcome.
 * @param {Object} currentRecord - The daily_prizes MongoDB record
 * @returns {Object} { isWin: boolean, prize: string|null }
 */
function calculateSpinResult(currentRecord) {
  const { prizes } = currentRecord;

  const availablePrizes = [];
  if (prizes.tshirt   > 0) availablePrizes.push('tshirt');
  if (prizes.cap      > 0) availablePrizes.push('cap');
  if (prizes.shoe_rack > 0) availablePrizes.push('shoe_rack');

  const totalRemaining = (prizes.tshirt || 0) + (prizes.cap || 0) + (prizes.shoe_rack || 0);
  if (totalRemaining === 0) return { isWin: false, prize: null };

  const winProbability = computeProbability(currentRecord);
  const isWin = Math.random() < winProbability;

  if (isWin) {
    const selectedPrize = availablePrizes[Math.floor(Math.random() * availablePrizes.length)];
    return { isWin: true, prize: selectedPrize };
  }

  return { isWin: false, prize: null };
}

/**
 * Returns the current win probability (0–1) without rolling — used for admin display.
 * @param {Object} currentRecord - The daily_prizes MongoDB record
 * @returns {number} winProbability between 0 and 1
 */
function getCurrentWinProbability(currentRecord) {
  return computeProbability(currentRecord);
}

module.exports = { calculateSpinResult, getCurrentWinProbability, TOTAL_DURATION_MS, MAX_TOTAL_PRIZES };
