const mongoose = require('mongoose');
const User = require('../models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Auto-seed demo user
    try {
      const demoUser = await User.findOne({ email: 'user@nova.in' });
      if (!demoUser) {
        await User.create({
          name: 'Demo User',
          email: 'user@nova.in',
          password: 'user@123',
          role: 'customer'
        });
        console.log('Auto-seeded demo user: user@nova.in / user@123');
      }
    } catch (seedErr) {
      console.log(`Demo user seeding skipped or failed: ${seedErr.message}`);
    }
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
