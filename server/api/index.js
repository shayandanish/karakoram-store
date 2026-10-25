import 'dotenv/config';
import app from '../app.js';
import { connectDB } from '../config/db.js';
import { initFirebaseAdmin } from '../utils/firebaseAdmin.js';

let initialized = false;

const initialize = async () => {
  if (!initialized) {
    initFirebaseAdmin();
    initialized = true;
  }
  await connectDB();
};

export default async function handler(req, res) {
  try {
    await initialize();
    return app(req, res);
  } catch (error) {
    console.error('API initialization failed:', error);
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Server initialization failed. Check the Vercel environment variables.',
      });
    }
  }
}
