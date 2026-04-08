const mongoose = require('mongoose');

const dailyPrizeSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true
  },
  prizes: {
    tshirt: { type: Number, default: 10 },
    cap: { type: Number, default: 10 },
    shoe_rack: { type: Number, default: 10 }
  },
  totalSpins: {
    type: Number,
    default: 0
  },
  firstSpinTime: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model('DailyPrize', dailyPrizeSchema);
