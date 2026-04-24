const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('order-service DB connected');
  } catch (error) {
    console.error('order-service DB error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
