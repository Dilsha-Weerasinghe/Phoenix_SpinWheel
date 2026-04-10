const express = require('express');
const router = express.Router();
const DailyPrize = require('../models/DailyPrize');
const WinLog = require('../models/WinLog');
const { calculateSpinResult } = require('../utils/probability');

// Helper to get today's date string YYYY-MM-DD
function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Ensure today's record exists, return it
async function getOrCreateTodayRecord() {
  const dateStr = getTodayDateString();
  let record = await DailyPrize.findOne({ date: dateStr });
  
  if (!record) {
    record = new DailyPrize({
      date: dateStr,
      prizes: {
        tshirt: 10,
        cap: 25,
        shoe_rack: 10
      },
      firstSpinTime: new Date()
    });
    await record.save();
  }
  return record;
}

router.get('/get-status', async (req, res) => {
  try {
    const record = await getOrCreateTodayRecord();
    const remainingPrizes = record.prizes.tshirt + record.prizes.cap + record.prizes.shoe_rack;
    res.json({
      success: true,
      data: {
        remainingPrizes,
        prizes: record.prizes,
        firstSpinTime: record.firstSpinTime,
        date: record.date
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/spin', async (req, res) => {
  try {
    const record = await getOrCreateTodayRecord();
    
    const { isWin, prize } = calculateSpinResult(record);
    
    // Wheel segments index mapping:
    // 0: T-Shirt
    // 1: Try Again
    // 2: Cap
    // 3: Try Again
    // 4: Shoe Rack
    // 5: Try Again
    
    const prizeToSegment = {
      tshirt: 0,
      cap: 2,
      shoe_rack: 4
    };
    
    const losingSegments = [1, 3, 5];
    let finalSegment;
    
    if (isWin && prize) {
      finalSegment = prizeToSegment[prize];
      
      // Decrease the prize count
      record.prizes[prize] -= 1;
      
      // Log the win
      const winLog = new WinLog({
        prize: prize,
        date: getTodayDateString()
      });
      await winLog.save();
      
    } else {
      // Pick a random losing segment
      finalSegment = losingSegments[Math.floor(Math.random() * losingSegments.length)];
    }
    
    // Track the spin count regardless of win or loss
    record.totalSpins = (record.totalSpins || 0) + 1;
    await record.save();
    
    res.json({
      success: true,
      result: {
        isWin,
        prize, // null if it's a try again
        segmentIndex: finalSegment
      }
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
