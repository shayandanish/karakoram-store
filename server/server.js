import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import app from './app.js';
import { connectDB } from './config/db.js';
import { initFirebaseAdmin } from './utils/firebaseAdmin.js';
import { startPaymentReminderScheduler } from './services/paymentReminderService.js';

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
    startPaymentReminderScheduler();
  } catch {
    process.exit(1);
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

start();
