require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const DailyPrize = require('./backend/models/DailyPrize');

const today = new Date().toISOString().split('T')[0];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const result = await DailyPrize.findOneAndUpdate(
      { date: today },
      { $set: { 'prizes.cap': 25 } },
      { new: true }
    );
    if (result) {
      console.log(`✅ Updated today's cap to 25. Record:`, result.prizes);
    } else {
      console.log(`⚠️ No record found for today (${today}). It will be created with cap: 25 on first spin.`);
    }
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ DB Error:', err);
    process.exit(1);
  });
