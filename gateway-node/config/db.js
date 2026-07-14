const mongoose = require('mongoose');

// Connects to MongoDB using MONGODB_URI from the environment. Throws/logs
// cleanly on failure rather than leaving the process in a half-connected
// state — callers decide whether a failed connection should be fatal.
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('[DB] MONGODB_URI is not set — cannot connect to MongoDB');
    throw new Error('MONGODB_URI is not set');
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[DB] MongoDB connected successfully — host: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`[DB] MongoDB connection error: ${err.message}`);
    throw err;
  }
}

module.exports = { connectDB };
