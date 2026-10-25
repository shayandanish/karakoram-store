import mongoose from 'mongoose';

let connectionPromise = null;

/**
 * Connect to MongoDB once and reuse the connection.
 * Serverless functions can reuse module state between invocations, so caching
 * the promise avoids opening a new Atlas connection on every request.
 */
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI)
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn.connection;
      })
      .catch((error) => {
        console.error(`Error: ${error.message}`);
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
};
