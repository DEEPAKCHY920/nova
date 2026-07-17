const mongoose = require('mongoose');
const slugify = require('slugify');

const sizeStockSchema = new mongoose.Schema(
  {
    size: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0, min: 0 }
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    brand: { type: String, default: 'NOVA' },
    category: {
      type: String,
      required: true,
      enum: ['Running', 'Training', 'Basketball', 'Lifestyle', 'Hiking', 'Gym', 'Sandals', 'Slides']
    },
    gender: { type: String, required: true, enum: ['men', 'women', 'unisex'] },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, min: 0 },
    images: [{ type: String }],
    sizes: [sizeStockSchema],
    color: { type: String, default: 'black' },
    features: [
      { type: String, enum: ['air', 'lightweight', 'breathable', 'grip', 'waterproof'] }
    ],
    tags: [{ type: String, enum: ['new', 'bestseller', 'sale'] }],
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 }
    },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

productSchema.virtual('discountPercent').get(function discountPercent() {
  if (this.oldPrice && this.oldPrice > this.price) {
    return Math.round(((this.oldPrice - this.price) / this.oldPrice) * 100);
  }
  return 0;
});

productSchema.virtual('totalStock').get(function totalStock() {
  return (this.sizes || []).reduce((sum, s) => sum + s.stock, 0);
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Only generate a slug on first save — later edits to `name` don't reshuffle the URL.
productSchema.pre('validate', function ensureSlug(next) {
  if (!this.slug && this.name) {
    const suffix = Math.random().toString(36).slice(2, 7);
    this.slug = `${slugify(this.name, { lower: true, strict: true })}-${suffix}`;
  }
  next();
});

productSchema.index({ name: 'text', description: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
