const mongoose = require('mongoose');

// Disable command buffering so operations fail fast if offline
mongoose.set('bufferCommands', false);

let isConnected = false;
let isMockStoreActive = false;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_placement_portal';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
    });
    isConnected = true;
    isMockStoreActive = false;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[Database Warning] Could not connect to MongoDB Atlas (${error.message}).`);
    console.warn(`[Database Notice] Operating in fallback memory mode.`);
    isConnected = false;
    isMockStoreActive = true;
  }
};

const getStoreStatus = () => {
  const isMongooseConnected = mongoose.connection.readyState === 1;
  return {
    isConnected: isMongooseConnected,
    isMockStoreActive: !isMongooseConnected || isMockStoreActive,
  };
};

module.exports = { connectDB, getStoreStatus };
