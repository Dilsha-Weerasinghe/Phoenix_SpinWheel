const mongoose = require('mongoose');

const dailyPrizeSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true
  },
  prizes: {
    tshirt: { type: Number, default: 10 },
    cap: { type: Number, default: 25 },
    shoe_rack: { type: Number, default: 10 }
  },
  totalSpins: {
    type: Number,
    default: 0
  },
  firstSpinTime: {
    type: Date,
    required: true
  },
  durationHours: {
    type: Number,
    default: 6
  },
  manualProbability: {
    type: Number,   // null = use auto algorithm; 0–1 = admin override
    default: null
  }
});

module.exports = mongoose.model('DailyPrize', dailyPrizeSchema);
