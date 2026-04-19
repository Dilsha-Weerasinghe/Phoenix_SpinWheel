const express = require('express');
const router = express.Router();
const DailyPrize = require('../models/DailyPrize');
const WinLog = require('../models/WinLog');
const { getCurrentWinProbability } = require('../utils/probability');

// Helper to get today's date string YYYY-MM-DD
function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Ensure today's record exists
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

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const record = await getOrCreateTodayRecord();
    const dateStr = getTodayDateString();
    
    // Fetch all daily prize records to establish days and total spins (sort chronologically by date string)
    const dailyRecords = await DailyPrize.find({}).sort({ date: 1 });
    // Fetch all logs, sort ascending
    const logs = await WinLog.find({}).sort({ timestamp: 1 });

    const groupedObj = {};
    let dayCounter = 1;

    // First establish blocks based on days tracking
    dailyRecords.forEach(daily => {
      groupedObj[daily.date] = {
        dayNumber: dayCounter++,
        dateString: daily.date,
        totalSpins: daily.totalSpins || 0,
        entries: []
      };
    });

    // Subsume logs into their proper day
    logs.forEach(log => {
      if (!groupedObj[log.date]) {
        // Fallback case
        groupedObj[log.date] = {
          dayNumber: dayCounter++,
          dateString: log.date,
          totalSpins: 0,
          entries: []
        };
      }
      groupedObj[log.date].entries.push(log);
    });

    // Convert object to array and reverse it to show newest days first
    const logsGroupedByDay = Object.values(groupedObj).sort((a,b) => b.dayNumber - a.dayNumber);

    const winProbability = getCurrentWinProbability(record);

    res.json({
      success: true,
      data: {
        prizes: record.prizes,
        timing: {
          durationHours: record.durationHours || 6,
          firstSpinTime: record.firstSpinTime
        },
        winProbability,
        manualProbability: record.manualProbability ?? null,
        logs: logsGroupedByDay
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/admin/reset
router.post('/reset', async (req, res) => {
  try {
    const record = await getOrCreateTodayRecord();
    
    // Explicitly update values to ensure Mongoose detects the change
    record.prizes.tshirt = 10;
    record.prizes.cap = 25;
    record.prizes.shoe_rack = 10;
    
    // CRITICAL: Reset the firstSpinTime so the probability pacing algorithm 
    // restarts its 7-hour clock. Otherwise, it will think it's massively behind 
    // and give heavily boosted probabilities.
    record.firstSpinTime = new Date();
    
    await record.save();
    
    res.json({
      success: true,
      message: "Daily limit has been reset successfully."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// DELETE /api/admin/records - Wipes everything
router.delete('/records', async (req, res) => {
  try {
    // Delete all win logs
    await WinLog.deleteMany({});
    // Delete all daily limits (resets system pacing)
    await DailyPrize.deleteMany({});
    
    res.json({
      success: true,
      message: "All records and daily limits have been fully completely wiped. System is back to ground zero!"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH /api/admin/timing
router.patch('/timing', async (req, res) => {
  try {
    const { durationHours, restartClock } = req.body;
    const record = await getOrCreateTodayRecord();

    if (durationHours !== undefined) {
      const parsed = parseFloat(durationHours);
      if (isNaN(parsed) || parsed <= 0 || parsed > 24) {
        return res.status(400).json({ success: false, error: 'durationHours must be a number between 0 and 24.' });
      }
      record.durationHours = parsed;
    }

    if (restartClock === true) {
      record.firstSpinTime = new Date();
    }

    await record.save();

    res.json({
      success: true,
      message: 'Timing updated successfully.',
      data: {
        durationHours: record.durationHours,
        firstSpinTime: record.firstSpinTime
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH /api/admin/probability
// Body: { value: 0–100 } to set override, or { value: null } to clear it
router.patch('/probability', async (req, res) => {
  try {
    const { value } = req.body;
    const record = await getOrCreateTodayRecord();

    if (value === null || value === undefined) {
      // Clear override — revert to auto algorithm
      record.manualProbability = null;
      record.markModified('manualProbability');
    } else {
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
        return res.status(400).json({ success: false, error: 'value must be a number between 0 and 100 (percent).' });
      }
      record.manualProbability = parsed / 100;
      record.markModified('manualProbability');
    }

    await record.save();

    res.json({
      success: true,
      message: value === null ? 'Probability override cleared — auto algorithm restored.' : `Manual probability set to ${value}%.`,
      data: { manualProbability: record.manualProbability }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PATCH /api/admin/prizes
// Body: { tshirt?: number, cap?: number, shoe_rack?: number }
router.patch('/prizes', async (req, res) => {
  try {
    const { tshirt, cap, shoe_rack } = req.body;
    const record = await getOrCreateTodayRecord();

    if (tshirt !== undefined) {
      const parsed = parseInt(tshirt, 10);
      if (isNaN(parsed) || parsed < 0) return res.status(400).json({ success: false, error: 'Invalid tshirt count' });
      record.prizes.tshirt = parsed;
    }
    if (cap !== undefined) {
      const parsed = parseInt(cap, 10);
      if (isNaN(parsed) || parsed < 0) return res.status(400).json({ success: false, error: 'Invalid cap count' });
      record.prizes.cap = parsed;
    }
    if (shoe_rack !== undefined) {
      const parsed = parseInt(shoe_rack, 10);
      if (isNaN(parsed) || parsed < 0) return res.status(400).json({ success: false, error: 'Invalid shoe_rack count' });
      record.prizes.shoe_rack = parsed;
    }

    record.markModified('prizes');
    await record.save();

    res.json({
      success: true,
      message: 'Prize stock updated successfully.',
      data: record.prizes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
