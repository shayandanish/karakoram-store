import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initFirebaseAdmin } from './utils/firebaseAdmin.js';

const start = async () => {
  try {
    initFirebaseAdmin();
  } catch (err) {
    console.error(
      `Firebase Admin initialization failed: ${err.message}\n` +
        'Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to server/.env, then restart the server.'
    );
    process.exit(1);
  }

  try {
    await connectDB();
  } catch {
    process.exit(1);
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

start();
