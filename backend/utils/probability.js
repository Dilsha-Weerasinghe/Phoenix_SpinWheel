const TOTAL_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_TOTAL_PRIZES = 30; // 10 tshirt + 10 cap + 10 shoe_rack

/**
 * Calculates win probability and determines the spin outcome
 * @param {Object} currentRecord - The daily_prizes MongoDB record
 * @returns {Object} { isWin: boolean, prize: string|null }
 */
function calculateSpinResult(currentRecord) {
  const { prizes, firstSpinTime } = currentRecord;
  const now = new Date();

  // Array of available prizes
  const availablePrizes = [];
  if (prizes.tshirt > 0) availablePrizes.push('tshirt');
  if (prizes.cap > 0) availablePrizes.push('cap');
  if (prizes.shoe_rack > 0) availablePrizes.push('shoe_rack');

  const totalRemaining = (prizes.tshirt || 0) + (prizes.cap || 0) + (prizes.shoe_rack || 0);

  if (totalRemaining === 0) {
    return { isWin: false, prize: null };
  }

  const elapsedTime = now.getTime() - new Date(firstSpinTime).getTime();
  const elapsedRatio = Math.min(elapsedTime / TOTAL_DURATION_MS, 1.0);
  const remainingRatio = totalRemaining / MAX_TOTAL_PRIZES;

  // The expected remaining ratio if prizes were distributed perfectly evenly over time
  // Example: 1 hour passed -> elapsedRatio = 1/7. We should have 6/7 prizes remaining.
  const expectedRemainingRatio = 1.0 - elapsedRatio;

  // Base probability of winning
  let winProbability = 0.05;

  // Adjust probability based on how we are tracking against the expected distribution
  if (remainingRatio > expectedRemainingRatio) {
    // We have MORE prizes than expected at this time -> INCREASE probability
    const diff = remainingRatio - expectedRemainingRatio;
    winProbability += diff * 1.5; // Scale up the boost 
  } else {
    // We have FEWER prizes than expected -> DECREASE probability
    const diff = expectedRemainingRatio - remainingRatio;
    winProbability -= diff * 0.5; // Scale down, but cautiously
  }

  // Ensure probability stays in sensible bounds
  if (winProbability < 0.01) winProbability = 0.01;
  if (winProbability > 0.9) winProbability = 0.9;

  // If time is fully elapsed and prizes remain, force high probability
  if (elapsedRatio >= 1.0 && totalRemaining > 0) {
    winProbability = 0.8;
  }

  const rand = Math.random();
  const isWin = rand < winProbability;

  if (isWin) {
    // Select a random prize from available ones
    const randomPrizeIndex = Math.floor(Math.random() * availablePrizes.length);
    const selectedPrize = availablePrizes[randomPrizeIndex];
    return { isWin: true, prize: selectedPrize };
  }

  return { isWin: false, prize: null };
}

module.exports = { calculateSpinResult, TOTAL_DURATION_MS, MAX_TOTAL_PRIZES };
