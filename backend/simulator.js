const { calculateSpinResult, TOTAL_DURATION_MS } = require('./utils/probability');

const mockRecord = {
  prizes: {
    tshirt: 10,
    cap: 10,
    shoe_rack: 10
  },
  firstSpinTime: new Date()
};

const totalSpins = 5000;
console.log(`Starting simulation of ${totalSpins} spins over 7.5 hours...`);

let wins = {
  tshirt: 0, cap: 0, shoe_rack: 0
};
let tryAgain = 0;

for (let i = 0; i <= totalSpins; i++) {
  // Simulate up to 7.5 hours
  const simulatedElapsedMs = (i / totalSpins) * (TOTAL_DURATION_MS + 0.5 * 3600 * 1000);
  // Shift firstSpinTime back
  mockRecord.firstSpinTime = new Date(Date.now() - simulatedElapsedMs);
  
  if (i % 1000 === 0) {
    console.log(`\nSpin ${i} (Elapsed: ${(simulatedElapsedMs / (60 * 60 * 1000)).toFixed(1)} hours)`);
    console.log(`Remaining Prizes: `, mockRecord.prizes);
  }

  const result = calculateSpinResult(mockRecord);
  if (result.isWin) {
    wins[result.prize]++;
    mockRecord.prizes[result.prize]--;
  } else {
    tryAgain++;
  }
}

console.log("\nFinal Results:");
console.log(`Total Wins: T-Shirt: ${wins.tshirt}, Cap: ${wins.cap}, Shoe Rack: ${wins.shoe_rack}`);
console.log(`Total Try Again: ${tryAgain}`);
console.log(`Remaining Prizes:`, mockRecord.prizes);
