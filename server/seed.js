/**
 * Seed script — populates the database with sample data.
 * Usage: npm run seed
 * Reads admin credentials from ADMIN_EMAIL and ADMIN_PASSWORD env variables.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Artisan from './models/Artisan.js';

dotenv.config();

const connectAndSeed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected for seeding');

  // Clear existing data (in order to avoid duplicate key errors)
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Product.deleteMany({}),
    Artisan.deleteMany({}),
  ]);
  console.log('Cleared existing seed collections');

  // ── Admin User ──────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await User.create({
    name: 'Karakoram Admin',
    email: adminEmail,
    passwordHash,
    role: 'admin',
  });
  console.log(`Admin user created: ${admin.email}`);

  // ── Categories ──────────────────────────────────────────────
  const [dryFruits, handicrafts, caps, wallets] = await Category.insertMany([
    { name: 'Dry Fruits', slug: 'dry-fruits' },
    { name: 'Handicrafts', slug: 'handicrafts' },
    { name: 'Caps & Hats', slug: 'caps-hats' },
    { name: 'Wallets & Accessories', slug: 'wallets-accessories' },
  ]);
  console.log('Categories created');

  // ── Artisan ─────────────────────────────────────────────────
  const artisan = await Artisan.create({
    name: 'Muhammad Kareem',
    village: 'Altit, Hunza',
    story:
      'Muhammad Kareem is a third-generation leather craftsman from Altit village. He learned his trade from his father and continues to produce handmade goods using traditional Hunza techniques.',
  });
  console.log('Artisan created');

  // ── Products ─────────────────────────────────────────────────
  await Product.insertMany([
    {
      name: 'Dried Apricots (Khumani)',
      slug: 'dried-apricots-khumani',
      category: dryFruits._id,
      description:
        'Sun-dried apricots from the valleys of Hunza. Rich in iron, fibre, and vitamins. No added sugar or preservatives. A staple of the Hunza diet known for longevity.',
      variants: [
        { label: '250g', price: 650, stock: 100 },
        { label: '500g', price: 1200, stock: 80 },
        { label: '1kg', price: 2200, stock: 50 },
      ],
      origin: 'Hunza, Gilgit-Baltistan',
      isFeatured: true,
    },
    {
      name: 'Hunza Walnuts (Akhroot)',
      slug: 'hunza-walnuts-akhroot',
      category: dryFruits._id,
      description:
        'Premium, freshly harvested walnuts from Gilgit-Baltistan. Known for their rich flavour and high Omega-3 content. Thin-shelled and easy to crack.',
      variants: [
        { label: '500g', price: 1400, stock: 60 },
        { label: '1kg', price: 2600, stock: 40 },
        { label: '2kg', price: 5000, stock: 20 },
      ],
      origin: 'Gilgit-Baltistan',
      isFeatured: true,
    },
    {
      name: 'Hunza Mulberries (Toot)',
      slug: 'hunza-mulberries-toot',
      category: dryFruits._id,
      description:
        'Dried white mulberries from Hunza, naturally sweet and nutritious. Eaten as a snack or mixed with walnuts in the traditional Hunza mix.',
      variants: [
        { label: '250g', price: 550, stock: 80 },
        { label: '500g', price: 1000, stock: 60 },
      ],
      origin: 'Hunza, Gilgit-Baltistan',
      isSeasonal: true,
    },
    {
      name: 'Handmade Leather Wallet',
      slug: 'handmade-leather-wallet',
      category: wallets._id,
      artisan: artisan._id,
      description:
        'Genuine hand-stitched leather wallet crafted by artisans in Altit, Hunza. Features multiple card slots, a billfold section, and traditional embossed patterns. Each piece is unique.',
      variants: [
        { label: 'Brown', price: 2500, stock: 30 },
        { label: 'Black', price: 2500, stock: 25 },
        { label: 'Tan', price: 2700, stock: 15 },
      ],
      origin: 'Altit, Hunza',
      isFeatured: true,
    },
    {
      name: 'Traditional Hunza Cap (Pakol)',
      slug: 'traditional-hunza-cap-pakol',
      category: caps._id,
      description:
        'The iconic Pakol cap, a symbol of Gilgit-Baltistan culture. Hand-knitted from pure Chitrali wool. Available in multiple sizes.',
      variants: [
        { label: 'Small', price: 1200, stock: 40 },
        { label: 'Medium', price: 1200, stock: 50 },
        { label: 'Large', price: 1200, stock: 30 },
        { label: 'XL', price: 1300, stock: 20 },
      ],
      origin: 'Hunza, Gilgit-Baltistan',
    },
    {
      name: 'Embroidered Ladies Cap',
      slug: 'embroidered-ladies-cap',
      category: caps._id,
      description:
        'Beautiful hand-embroidered cap for women, featuring traditional Hunza geometric patterns in vibrant thread work. A perfect gift representing the culture of Gilgit-Baltistan.',
      variants: [
        { label: 'One Size', price: 1500, stock: 35 },
      ],
      origin: 'Hunza, Gilgit-Baltistan',
      isFeatured: true,
    },
    {
      name: 'Hunza Wood Carving Box',
      slug: 'hunza-wood-carving-box',
      category: handicrafts._id,
      artisan: artisan._id,
      description:
        'Handcrafted wooden box with intricate traditional carvings by local artisans. Made from walnut wood. Ideal for storing jewellery or as a decorative piece.',
      variants: [
        { label: 'Small', price: 3000, stock: 20 },
        { label: 'Medium', price: 5000, stock: 10 },
      ],
      origin: 'Hunza, Gilgit-Baltistan',
    },
  ]);
  console.log('Products created');

  console.log('\n✅ Seeding complete!');
  process.exit(0);
};

connectAndSeed().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
