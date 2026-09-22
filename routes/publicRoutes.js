const express = require('express');
const router = express.Router();
const Tender = require('../models/Tender');

// Public portal without login
router.get('/', async (req, res) => {
  try {
    const { state, district, taluk, village } = req.query;
    let query = { status: 'assigned' };

    if (state && state.trim()) query['location.state'] = new RegExp(state.trim(), 'i');
    if (district && district.trim()) query['location.district'] = new RegExp(district.trim(), 'i');
    if (taluk && taluk.trim()) query['location.taluk'] = new RegExp(taluk.trim(), 'i');
    if (village && village.trim()) query['location.village'] = new RegExp(village.trim(), 'i');

    const runningTenders = await Tender.find(query).populate('assignedBidder').sort({ createdAt: -1 });
    res.render('public-dashboard', { runningTenders, filters: req.query });
  } catch (err) {
    console.error(err);
    res.render('public-dashboard', { runningTenders: [], filters: req.query });
  }
});

// Step-by-Step User Manual
router.get('/manual', (req, res) => {
  res.render('manual');
});

module.exports = router;
