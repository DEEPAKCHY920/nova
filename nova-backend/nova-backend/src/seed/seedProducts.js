// Populates the database with sample products (matching the frontend's existing
// catalog data in collection.js / men.html) and creates the first admin account.
//
// Usage:
//   npm run seed            -> wipes and reseeds products
//   npm run seed:destroy    -> only wipes products, does not reseed

require('dotenv').config();
const connectDB = require('../config/db');
const Product = require('../models/Product');
const User = require('../models/User');
const Settings = require('../models/Settings');

const products = [
  {
    name: 'Nova Surge X1', category: 'Running', gender: 'men', price: 8999,
    images: ['/assets/images/product_surge.png'],
    sizes: [{ size: 8, stock: 12 }, { size: 9, stock: 15 }, { size: 10, stock: 10 }, { size: 11, stock: 8 }],
    color: 'orange', features: ['air', 'lightweight', 'breathable'], tags: ['bestseller'],
    rating: { average: 4.8, count: 128 },
    description: 'Engineered with high-tech cushioning and a lightweight silhouette for daily high-intensity runs.'
  },
  {
    name: 'Nova Phantom', category: 'Running', gender: 'men', price: 7999,
    images: ['/assets/images/product_phantom.png'],
    sizes: [{ size: 7, stock: 10 }, { size: 8, stock: 12 }, { size: 9, stock: 9 }, { size: 10, stock: 6 }],
    color: 'white', features: ['lightweight', 'breathable'], tags: ['bestseller'],
    rating: { average: 4.9, count: 96 },
    description: 'A featherlight trainer built for tempo runs, with a breathable knit upper.'
  },
  {
    name: 'Nova Air Pro', category: 'Training', gender: 'unisex', price: 8499,
    images: ['/assets/images/product_air_pro.png'],
    sizes: [{ size: 6, stock: 8 }, { size: 7, stock: 10 }, { size: 8, stock: 12 }, { size: 9, stock: 10 }, { size: 10, stock: 5 }],
    color: 'white', features: ['air', 'breathable', 'grip'], tags: ['new'],
    rating: { average: 4.7, count: 76 },
    description: 'Air-cushioned support for cross-training, HIIT, and everything in between.'
  },
  {
    name: 'Nova Edge', category: 'Basketball', gender: 'men', price: 6999,
    images: ['/assets/images/product_edge.png'],
    sizes: [{ size: 9, stock: 10 }, { size: 10, stock: 12 }, { size: 11, stock: 8 }, { size: 12, stock: 6 }, { size: 13, stock: 4 }],
    color: 'red', features: ['grip'], tags: [],
    rating: { average: 4.6, count: 88 },
    description: 'High-top support with an aggressive outsole pattern for hard court traction.'
  },
  {
    name: 'Nova Boost', category: 'Running', gender: 'men', price: 7499, oldPrice: 8299,
    images: ['/assets/images/product_boost.png'],
    sizes: [{ size: 8, stock: 9 }, { size: 9, stock: 11 }, { size: 10, stock: 7 }],
    color: 'blue', features: ['air', 'lightweight'], tags: ['sale'],
    rating: { average: 4.8, count: 142 },
    description: 'Responsive foam midsole tuned for long-distance comfort.'
  },
  {
    name: 'Nova Drift', category: 'Lifestyle', gender: 'unisex', price: 5499,
    images: ['/assets/images/product_drift.png'],
    sizes: [{ size: 6, stock: 8 }, { size: 7, stock: 9 }, { size: 8, stock: 10 }, { size: 9, stock: 8 }, { size: 10, stock: 6 }, { size: 11, stock: 4 }],
    color: 'green', features: ['lightweight', 'breathable'], tags: ['new'],
    rating: { average: 4.7, count: 58 },
    description: 'Everyday streetwear silhouette with a soft-touch mesh upper.'
  },
  {
    name: 'Nova Lite', category: 'Training', gender: 'women', price: 4999,
    images: ['/assets/images/product_lite.png'],
    sizes: [{ size: 6, stock: 10 }, { size: 7, stock: 9 }, { size: 8, stock: 7 }, { size: 9, stock: 5 }],
    color: 'purple', features: ['lightweight'], tags: [],
    rating: { average: 4.6, count: 64 },
    description: 'A minimalist trainer built for studio workouts and light cardio.'
  },
  {
    name: 'Nova Trail', category: 'Hiking', gender: 'men', price: 6799, oldPrice: 7999,
    images: ['/assets/images/product_trail.png'],
    sizes: [{ size: 7, stock: 6 }, { size: 8, stock: 8 }, { size: 9, stock: 9 }, { size: 10, stock: 7 }, { size: 11, stock: 5 }, { size: 12, stock: 3 }],
    color: 'white', features: ['grip', 'waterproof'], tags: ['sale'],
    rating: { average: 4.5, count: 41 },
    description: 'Water-resistant trail shoe with an aggressive lugged outsole.'
  },
  {
    name: 'Nova Motion', category: 'Running', gender: 'women', price: 6299,
    images: ['/assets/images/product_motion.png'],
    sizes: [{ size: 6, stock: 7 }, { size: 7, stock: 8 }, { size: 8, stock: 6 }],
    color: 'red', features: ['air', 'breathable'], tags: [],
    rating: { average: 4.6, count: 33 },
    description: 'Everyday running shoe with balanced cushioning front to heel.'
  },
  {
    name: 'Nova Flow', category: 'Lifestyle', gender: 'women', price: 5999,
    images: ['/assets/images/product_flow.png'],
    sizes: [{ size: 6, stock: 9 }, { size: 7, stock: 8 }, { size: 8, stock: 6 }, { size: 9, stock: 4 }],
    color: 'yellow', features: ['lightweight', 'breathable'], tags: ['new'],
    rating: { average: 4.7, count: 27 },
    description: 'A relaxed silhouette designed for all-day wear.'
  },
  {
    name: 'Nova Carbon', category: 'Running', gender: 'women', price: 10999,
    images: ['/assets/images/product_carbon.png'],
    sizes: [{ size: 8, stock: 5 }, { size: 9, stock: 6 }, { size: 10, stock: 4 }, { size: 11, stock: 3 }, { size: 12, stock: 2 }],
    color: 'purple', features: ['air', 'lightweight', 'breathable'], tags: [],
    rating: { average: 4.9, count: 19 },
    description: 'Race-day carbon-plated speed shoe.'
  },
  {
    name: 'Nova Flex', category: 'Training', gender: 'unisex', price: 4799,
    images: ['/assets/images/product_flex.png'],
    sizes: [{ size: 6, stock: 8 }, { size: 7, stock: 9 }, { size: 8, stock: 10 }, { size: 9, stock: 7 }, { size: 10, stock: 5 }],
    color: 'purple', features: ['lightweight', 'grip'], tags: [],
    rating: { average: 4.5, count: 22 },
    description: 'Grippy, flexible trainer for functional fitness work.'
  },
  // -- Homepage "Best Sellers" strip (men.html / index.html) --
  {
    name: 'Nova X1', category: 'Running', gender: 'men', price: 2799, oldPrice: 4499,
    images: ['/assets/images/product_x1.png'],
    sizes: [{ size: 7, stock: 10 }, { size: 8, stock: 14 }, { size: 9, stock: 12 }, { size: 10, stock: 9 }],
    color: 'black', features: ['lightweight', 'breathable'], tags: ['new'],
    rating: { average: 5, count: 128 },
    description: "Men's running shoe with a bold two-tone upper and responsive midsole."
  },
  {
    name: 'Nova Flex Pro', category: 'Training', gender: 'men', price: 2399, oldPrice: 2999,
    images: ['/assets/images/product_flexpro.png'],
    sizes: [{ size: 7, stock: 8 }, { size: 8, stock: 10 }, { size: 9, stock: 11 }, { size: 10, stock: 6 }],
    color: 'gray', features: ['grip', 'lightweight'], tags: ['sale'],
    rating: { average: 4.8, count: 256 },
    description: "Men's training shoe built for gym sessions and short sprints."
  },
  {
    name: 'Nova Street X', category: 'Lifestyle', gender: 'men', price: 2299, oldPrice: 3499,
    images: ['/assets/images/product_streetx.png'],
    sizes: [{ size: 7, stock: 9 }, { size: 8, stock: 11 }, { size: 9, stock: 8 }, { size: 10, stock: 5 }],
    color: 'white', features: ['breathable'], tags: ['new'],
    rating: { average: 5, count: 98 },
    description: "Clean, minimal men's sneaker for everyday wear."
  },
  {
    name: 'Nova Daily', category: 'Lifestyle', gender: 'men', price: 1949, oldPrice: 2299,
    images: ['/assets/images/product_daily.png'],
    sizes: [{ size: 7, stock: 10 }, { size: 8, stock: 12 }, { size: 9, stock: 10 }, { size: 10, stock: 7 }],
    color: 'blue', features: ['lightweight'], tags: ['sale'],
    rating: { average: 4.7, count: 176 },
    description: "Men's casual shoe designed for daily comfort."
  },
  {
    name: 'Nova Comfort', category: 'Sandals', gender: 'men', price: 1499, oldPrice: 1999,
    images: ['/assets/images/product_comfort.png'],
    sizes: [{ size: 7, stock: 12 }, { size: 8, stock: 14 }, { size: 9, stock: 10 }, { size: 10, stock: 8 }],
    color: 'black', features: ['grip'], tags: [],
    rating: { average: 4.5, count: 64 },
    description: "Men's sandals with adjustable straps and a cushioned footbed."
  }
];

const run = async () => {
  await connectDB();
  const destroy = process.argv.includes('--destroy');

  if (destroy) {
    await Product.deleteMany();
    console.log('All products removed.');
    process.exit(0);
  }

  await Product.deleteMany();
  await Product.insertMany(products);
  console.log(`Seeded ${products.length} products.`);

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@nova.orbitstack.in').toLowerCase();
  const adminExists = await User.findOne({ email: adminEmail });
  if (!adminExists) {
    await User.create({
      name: 'NOVA Admin',
      email: adminEmail,
      password: process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!',
      role: 'admin'
    });
    console.log(`Admin account created: ${adminEmail} (change the password after first login)`);
  } else {
    console.log(`Admin account already exists: ${adminEmail}`);
  }

  const settingsExist = await Settings.findOne();
  if (!settingsExist) {
    await Settings.create({});
    console.log('Default store settings created.');
  }

  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
