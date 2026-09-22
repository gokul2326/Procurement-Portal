const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema({
  tenderId: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  type: { type: String, required: true }, // Open, Limited, Global
  budget: { type: Number, required: true },
  location: {
    state: { type: String, required: true },
    district: { type: String, required: true },
    taluk: { type: String, required: true },
    village: { type: String, default: '' }
  },
  status: { 
    type: String, 
    enum: ['active', 'assigned', 'completed', 'cancelled'], 
    default: 'active' 
  },
  assignedBidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  bids: [{
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bidderName: String,
    bidderEmail: String,
    companyName: String,
    bidAmount: Number,
    proposalNote: String,
    submittedAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tender', tenderSchema);
