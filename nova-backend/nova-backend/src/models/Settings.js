const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: 'NOVA' },
    supportEmail: { type: String, default: 'support@nova.orbitstack.in' },
    supportPhone: { type: String },
    freeShippingThreshold: { type: Number, default: 999 },
    shippingFee: { type: Number, default: 99 },
    taxPercent: { type: Number, default: 0 },
    codEnabled: { type: Boolean, default: true },
    announcementBar: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
