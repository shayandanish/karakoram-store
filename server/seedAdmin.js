import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/User.js';

dotenv.config();

const syncAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('Error: MONGODB_URI is missing in .env');
      process.exit(1);
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in server/.env');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);

    const email = adminEmail.toLowerCase().trim();
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    let admin = await User.findOne({ email });
    if (!admin) {
      admin = await User.create({
        name: 'Karakoram Admin',
        email,
        passwordHash,
        role: 'admin',
      });
      console.log(`Success: Admin account created for email defined in .env`);
    } else {
      admin.role = 'admin';
      admin.passwordHash = passwordHash;
      await admin.save();
      console.log(`Success: Admin account password and role updated from .env`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error syncing admin:', err.message);
    process.exit(1);
  }
};

syncAdmin();
