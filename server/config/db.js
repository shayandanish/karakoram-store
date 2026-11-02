import mongoose from 'mongoose';

let connectionPromise = null;

/**
 * Connect to MongoDB once and reuse the connection.
 * Tuned for low latency and high throughput:
 *   - maxPoolSize: 50 concurrent operations
 *   - minPoolSize: 10 keep connections warm
 *   - serverSelectionTimeoutMS: fail fast if DB is slow
 *   - socketTimeoutMS: prevent hung connections
 *   - family: 4 (IPv4 preferred, avoids DNS AAAA delays)
 */
export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        maxPoolSize: 50,
        minPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
        retryWrites: true,
        w: 'majority',
      })
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

export const getConnectionPoolStats = () => {
  const conn = mongoose.connection;
  if (!conn || !conn.client) return null;
  return {
    readyState: conn.readyState,
    host: conn.host,
    name: conn.name,
  };
};
