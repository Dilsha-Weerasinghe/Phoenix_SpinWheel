const mongoose = require('mongoose');

const winLogSchema = new mongoose.Schema({
  prize: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WinLog', winLogSchema);
