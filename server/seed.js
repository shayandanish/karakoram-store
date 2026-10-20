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
  const [
    dryFruits,
    organicOils,
    naturalHerbs,
    seasonalFruits,
    wallets,
    caps,
    apparel,
    cushions,
  ] = await Category.insertMany([
    {
      name: 'Dry Fruits',
      slug: 'dry-fruits',
      group: 'Mountain Harvest & Pantry',
      icon: '🍑',
      order: 1,
      description: 'Sun-dried organic apricots, paper-shell walnuts, roasted chilgoza pine nuts, and wild mulberries from the high valleys of Hunza and Gilgit-Baltistan.',
    },
    {
      name: 'Local & Organic Oils',
      slug: 'organic-oils',
      group: 'Mountain Harvest & Pantry',
      icon: '🫙',
      order: 2,
      description: 'Traditional wood-pressed and cold-pressed oils from Hunza apricot kernels, mountain walnuts, and wild sea buckthorn berries.',
    },
    {
      name: 'Natural Herbs',
      slug: 'natural-herbs',
      group: 'Mountain Harvest & Pantry',
      icon: '🌿',
      order: 3,
      description: 'Hand-harvested alpine herbs, pure Himalayan Shilajit (Salajeet), wild mountain thyme (Tumuro), and organic mountain tea infusions.',
    },
    {
      name: 'Seasonal Fruits',
      slug: 'seasonal-fruits',
      group: 'Mountain Harvest & Pantry',
      icon: '🍒',
      order: 4,
      description: 'Fresh, hand-picked orchard cherries, juicy Shakarpara apricots, and crisp mountain apples delivered straight from valley orchards.',
    },
    {
      name: 'Handmade Wallets',
      slug: 'handmade-wallets',
      group: 'Handicrafts & Cultural Living',
      icon: '👛',
      order: 5,
      description: 'Hand-stitched genuine leather wallets, cardholders, and embossed accessories crafted by master artisans in Altit and Karimabad.',
    },
    {
      name: 'Traditional Caps',
      slug: 'traditional-caps',
      group: 'Handicrafts & Cultural Living',
      icon: '👑',
      order: 6,
      description: 'Iconic pure wool Pakols and hand-embroidered traditional Iraghi caps adorned with authentic geometric needlework.',
    },
    {
      name: 'Cultural Apparel',
      slug: 'cultural-apparel',
      group: 'Handicrafts & Cultural Living',
      icon: '🧥',
      order: 7,
      description: 'Heritage handwoven Pattu woolen waistcoats, ceremonial Chugha coats, and hand-embroidered pure mountain pashmina shawls.',
    },
    {
      name: 'Handmade Cushions',
      slug: 'handmade-cushions',
      group: 'Handicrafts & Cultural Living',
      icon: '🛋️',
      order: 8,
      description: 'Hand-embroidered cross-stitch cushion covers, artisanal kilims, and heirloom textile decor made by Hunza women artisans.',
    },
  ]);
  console.log('Categories created (8 comprehensive categories)');

  // ── Artisans ────────────────────────────────────────────────
  const [artisanKareem, artisanFatima, artisanSherBaz] = await Artisan.insertMany([
    {
      name: 'Muhammad Kareem',
      village: 'Altit, Hunza',
      story:
        'Muhammad Kareem is a third-generation leather craftsman from Altit village. He learned his trade from his father and continues to produce durable handmade leather goods using traditional methods.',
    },
    {
      name: 'Fatima Bibi',
      village: 'Gulmit, Upper Hunza',
      story:
        'Fatima Bibi leads a women’s craft collective in Gulmit. She has preserved ancient Silk Road cross-stitch and needlework techniques passed down through generations.',
    },
    {
      name: 'Sher Baz Khan',
      village: 'Ganish, Hunza',
      story:
        'Sher Baz tends century-old organic apricot orchards in Ganish and operates a traditional stone expeller cold-pressing raw oils without chemicals or heat.',
    },
  ]);
  console.log('Artisans created (3 master artisans)');

  // ── Products ─────────────────────────────────────────────────
  await Product.insertMany([
    // 1. Dry Fruits
    {
      name: 'Dried Apricots (Halman Khumani)',
      slug: 'dried-apricots-halman-khumani',
      category: dryFruits._id,
      artisan: artisanSherBaz._id,
      description:
        'Sun-dried golden Halman apricots from the ancient orchards of Hunza Valley. Naturally sweet, high in dietary fibre, potassium, and iron. Sun-cured on high rooftops without added sulfur or artificial preservatives.',
      variants: [
        { label: '250g', price: 650, stock: 120 },
        { label: '500g', price: 1200, stock: 90 },
        { label: '1kg', price: 2300, stock: 60 },
      ],
      origin: 'Hunza, Gilgit-Baltistan',
      isFeatured: true,
    },
    {
      name: 'Hunza Paper-Shell Walnuts (Kaghazi Akhroot)',
      slug: 'hunza-paper-shell-walnuts',
      category: dryFruits._id,
      description:
        'Premium grade, freshly harvested thin-shelled walnuts from Gilgit-Baltistan. Crackable by hand with delicate, creamy, oil-rich halves loaded with natural Omega-3 fatty acids.',
      variants: [
        { label: '500g', price: 1400, stock: 75 },
        { label: '1kg', price: 2700, stock: 50 },
      ],
      origin: 'Gilgit-Baltistan',
      isFeatured: true,
    },
    {
      name: 'Karakoram Roasted Pine Nuts (Chilgoza)',
      slug: 'karakoram-roasted-pine-nuts-chilgoza',
      category: dryFruits._id,
      description:
        'Wild-harvested roasted pine nuts (Chilgoza) collected from the rugged mountain forests of Diamer and Kohistan. Exceptionally rich, buttery, and packed with plant-based protein.',
      variants: [
        { label: '250g', price: 3200, stock: 40 },
        { label: '500g', price: 6200, stock: 25 },
      ],
      origin: 'Diamer, Gilgit-Baltistan',
      isFeatured: true,
    },
    {
      name: 'Sun-Dried White Mulberries (Toot)',
      slug: 'sun-dried-white-mulberries-toot',
      category: dryFruits._id,
      description:
        'Delicate, naturally sweet dried white mulberries hand-harvested from high mountain terraces. A traditional daily superfood eaten alongside green tea or walnuts in Hunza.',
      variants: [
        { label: '250g', price: 550, stock: 80 },
        { label: '500g', price: 1000, stock: 60 },
      ],
      origin: 'Hunza, Gilgit-Baltistan',
      isSeasonal: false,
    },

    // 2. Local & Organic Oils
    {
      name: 'Cold-Pressed Hunza Apricot Kernel Oil',
      slug: 'cold-pressed-hunza-apricot-kernel-oil',
      category: organicOils._id,
      artisan: artisanSherBaz._id,
      description:
        '100% pure, virgin cold-pressed sweet apricot kernel oil extracted via traditional cold expeller. Rich in Vitamin E, oleic acid, and essential fatty acids. Dual-purpose for dietary consumption and glowing skincare.',
      variants: [
        { label: '120ml Bottle', price: 1100, stock: 60 },
        { label: '250ml Bottle', price: 2000, stock: 45 },
        { label: '500ml Bottle', price: 3800, stock: 30 },
      ],
      origin: 'Hunza, Gilgit-Baltistan',
      isFeatured: true,
    },
    {
      name: 'Pure Mountain Walnut Oil (Cold-Pressed)',
      slug: 'pure-mountain-walnut-oil',
      category: organicOils._id,
      description:
        'Extra-virgin raw walnut oil pressed from local Gilgit walnuts. Unrefined and nutrient-dense, known for heart-healthy polyphenols and deep nutty aroma. Perfect for salad dressing or scalp nourishment.',
      variants: [
        { label: '120ml Glass Dropper', price: 1350, stock: 50 },
        { label: '250ml Bottle', price: 2500, stock: 35 },
      ],
      origin: 'Gilgit-Baltistan',
    },
    {
      name: 'Wild Sea Buckthorn Berry & Seed Oil',
      slug: 'wild-sea-buckthorn-berry-seed-oil',
      category: organicOils._id,
      description:
        'Potent, nutrient-rich oil extracted from wild orange sea buckthorn berries growing along glacial riverbeds in Skardu. Exceptionally high in rare Omega-7 and antioxidants for cell regeneration.',
      variants: [
        { label: '30ml Facial Dropper', price: 1800, stock: 50 },
        { label: '60ml Dropper', price: 3200, stock: 30 },
      ],
      origin: 'Skardu, Baltistan',
      isFeatured: true,
    },

    // 3. Natural Herbs
    {
      name: '100% Pure Himalayan Shilajit (Salajeet Resin)',
      slug: 'pure-himalayan-shilajit-salajeet-resin',
      category: naturalHerbs._id,
      description:
        'Authentic Gold Grade Shilajit resin harvested from sheer rock faces above 16,000 feet in the Karakoram range. Purified using natural mountain spring water and sunlight. Over 84 trace minerals and fulvic acid.',
      variants: [
        { label: '20g Glass Jar', price: 2800, stock: 60 },
        { label: '50g Glass Jar', price: 6200, stock: 40 },
      ],
      origin: 'Karakoram Range, Gilgit-Baltistan',
      isFeatured: true,
    },
    {
      name: 'Tumuro (Wild Mountain Thyme Tea)',
      slug: 'tumuro-wild-mountain-thyme-tea',
      category: naturalHerbs._id,
      description:
        'Aromatic wild mountain thyme gathered from the high summer pastures of Upper Hunza. Renowned locally as Tumuro herbal tea for soothing respiratory wellness, digestion, and cold winter mornings.',
      variants: [
        { label: '100g Pouch', price: 600, stock: 90 },
        { label: '250g Pouch', price: 1300, stock: 60 },
      ],
      origin: 'Hunza Valley',
      isFeatured: true,
    },
    {
      name: 'High-Altitude Karakoram Mountain Saffron (Zafraan)',
      slug: 'high-altitude-karakoram-mountain-saffron',
      category: naturalHerbs._id,
      description:
        'Grade-A pure saffron stigmas hand-picked at dawn from alpine saffron fields. Vibrant deep crimson color, powerful aroma, and extraordinary crocin potency.',
      variants: [
        { label: '1 Gram Tin', price: 1600, stock: 50 },
        { label: '3 Gram Tin', price: 4400, stock: 30 },
      ],
      origin: 'Gilgit-Baltistan',
    },

    // 4. Seasonal Fruits
    {
      name: 'Fresh Hunza Sweet Red Cherries (Box)',
      slug: 'fresh-hunza-sweet-red-cherries',
      category: seasonalFruits._id,
      artisan: artisanSherBaz._id,
      description:
        'Plump, crisp, and intensely sweet cherries harvested fresh from high-altitude orchards irrigated with mineral-rich glacial meltwater. Dispatched in protective cold-packaging directly after picking.',
      variants: [
        { label: '1.5kg Gift Basket', price: 2800, stock: 40 },
        { label: '3kg Orchard Crate', price: 5200, stock: 25 },
      ],
      origin: 'Hunza Valley',
      isSeasonal: true,
      isFeatured: true,
    },
    {
      name: 'Fresh Shakarpara Honey Apricots',
      slug: 'fresh-shakarpara-honey-apricots',
      category: seasonalFruits._id,
      artisan: artisanSherBaz._id,
      description:
        'Fragile, juicy, honey-sweet fresh apricots picked at peak ripeness. Famous across Pakistan for their unforgettable melt-in-mouth sweetness and fragrant blossom scent.',
      variants: [
        { label: '2kg Express Pack', price: 2400, stock: 30 },
        { label: '5kg Family Crate', price: 5500, stock: 20 },
      ],
      origin: 'Hunza & Nagar',
      isSeasonal: true,
    },

    // 5. Handmade Wallets
    {
      name: 'Altit Hand-Stitched Vegetable-Tanned Bifold Wallet',
      slug: 'altit-hand-stitched-bifold-wallet',
      category: wallets._id,
      artisan: artisanKareem._id,
      description:
        'Crafted from full-grain vegetable-tanned cowhide, saddle-stitched by hand with waxed linen thread. Features 6 card slots, 2 hidden slip pockets, a spacious billfold compartment, and embossed mountain crest.',
      variants: [
        { label: 'Rustic Tan', price: 2900, stock: 35 },
        { label: 'Midnight Black', price: 2900, stock: 30 },
        { label: 'Rich Mahogany', price: 3100, stock: 20 },
      ],
      origin: 'Altit, Hunza',
      isFeatured: true,
    },
    {
      name: 'Karakoram Minimalist Leather Cardholder',
      slug: 'karakoram-minimalist-leather-cardholder',
      category: wallets._id,
      artisan: artisanKareem._id,
      description:
        'Ultra-slim hand-crafted pocket cardholder with 4 card sleeves and a central cash pocket. Burnished edges with organic beeswax for lifelong durability.',
      variants: [
        { label: 'Vintage Brown', price: 1600, stock: 40 },
        { label: 'Forest Green', price: 1750, stock: 25 },
      ],
      origin: 'Altit, Hunza',
    },

    // 6. Traditional Caps
    {
      name: 'Traditional Hunza & Chitrali Pakol (Pure Wool)',
      slug: 'traditional-hunza-chitrali-pakol',
      category: caps._id,
      description:
        'The timeless Northern Pakistan rolled woolen cap (Pakol) crafted from 100% natural mountain sheep wool (Pattu). Provides exceptional thermal insulation against freezing mountain winds.',
      variants: [
        { label: 'Natural Oatmeal (Medium)', price: 1400, stock: 40 },
        { label: 'Natural Oatmeal (Large)', price: 1400, stock: 40 },
        { label: 'Earthy Brown (Medium)', price: 1400, stock: 30 },
        { label: 'Charcoal Grey (Large)', price: 1500, stock: 25 },
      ],
      origin: 'Hunza & Chitral',
      isFeatured: true,
    },
    {
      name: 'Hand-Embroidered Hunza Iraghi Ladies Cap',
      slug: 'hand-embroidered-hunza-iraghi-ladies-cap',
      category: caps._id,
      artisan: artisanFatima._id,
      description:
        'Masterpiece heirloom cap worn by women in Hunza and Nagar. Intricately adorned with traditional cross-stitch geometric embroidery (Iraghi style) using vibrant silk threads. A stunning emblem of mountain heritage.',
      variants: [
        { label: 'Ruby & Turquoise Pattern', price: 3500, stock: 20 },
        { label: 'Emerald & Gold Pattern', price: 3500, stock: 15 },
      ],
      origin: 'Gulmit, Upper Hunza',
      isFeatured: true,
    },

    // 7. Cultural Apparel
    {
      name: 'Traditional Pattu Hand-Woven Woolen Waistcoat',
      slug: 'traditional-pattu-handwoven-woolen-waistcoat',
      category: apparel._id,
      artisan: artisanFatima._id,
      description:
        'Authentic men’s waistcoat tailored from handloom-spun pure sheep wool fabric (Pattu). Features antique brass metal buttons, comfortable satin inner lining, and elegant mandarin collar.',
      variants: [
        { label: 'Size 38 (Small)', price: 4800, stock: 15 },
        { label: 'Size 40 (Medium)', price: 4800, stock: 25 },
        { label: 'Size 42 (Large)', price: 4800, stock: 20 },
        { label: 'Size 44 (XL)', price: 5100, stock: 10 },
      ],
      origin: 'Hunza & Gilgit',
      isFeatured: true,
    },
    {
      name: 'Embroidered Karakoram Pure Pashmina Shawl',
      slug: 'embroidered-karakoram-pure-pashmina-shawl',
      category: apparel._id,
      artisan: artisanFatima._id,
      description:
        'Featherlight yet wonderfully warm authentic mountain pashmina shawl with delicate floral needle-point border embroidery created by skilled artisan women.',
      variants: [
        { label: 'Natural Ivory', price: 8500, stock: 12 },
        { label: 'Deep Walnut', price: 8500, stock: 15 },
      ],
      origin: 'Hunza & Gilgit',
    },

    // 8. Handmade Cushions & Decor
    {
      name: 'Hunza Cross-Stitch Silk Thread Cushion Cover (Pair)',
      slug: 'hunza-cross-stitch-silk-cushion-cover-pair',
      category: cushions._id,
      artisan: artisanFatima._id,
      description:
        'Set of 2 authentic 16x16 inch decorative cushion covers featuring traditional cross-stitch motifs that narrate ancient mountain legends. Hand-stitched with durable cotton-linen backing and concealed zipper.',
      variants: [
        { label: '16x16 inches (Pair)', price: 3800, stock: 25 },
        { label: '18x18 inches (Pair)', price: 4500, stock: 18 },
      ],
      origin: 'Gulmit, Upper Hunza',
      isFeatured: true,
    },
    {
      name: 'Hand-Woven Sharma Geometric Kilim Cushion Cover',
      slug: 'hand-woven-sharma-kilim-cushion-cover',
      category: cushions._id,
      artisan: artisanFatima._id,
      description:
        'Rustic Kilim cushion cover woven on traditional pit looms using hand-spun sheep and goat wool (Sharma style). Rich earthy tones and bold tribal geometry.',
      variants: [
        { label: '16x16 inches', price: 2200, stock: 30 },
        { label: '18x18 inches', price: 2600, stock: 20 },
      ],
      origin: 'Central Hunza',
    },
  ]);
  console.log('Products created (20 authentic Northern Pakistan items across all categories)');

  console.log('\n✅ Seeding complete!');
  process.exit(0);
};

connectAndSeed().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
