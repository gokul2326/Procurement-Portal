const express = require('express');
const router = express.Router();
const Tender = require('../models/Tender');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const { verifyToken, checkRole } = require('../middleware/auth');

// Govt Official Dashboard
router.get('/govt/dashboard', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    const pendingUsers = await User.find({ isApproved: false });
    const approvedBidders = await User.find({ role: 'bidder', isApproved: true });
    const tenders = await Tender.find().populate('assignedBidder').sort({ createdAt: -1 });
    res.render('govt-dashboard', { pendingUsers, approvedBidders, tenders });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading Government Dashboard');
  }
});

// Govt: Approve User Account
router.post('/govt/approve-user/:id', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isApproved: true });
    req.flash('success', 'User account approved and authorized to access portal.');
    res.redirect('/govt/dashboard');
  } catch (err) {
    req.flash('error', 'Error approving account.');
    res.redirect('/govt/dashboard');
  }
});

// Govt: Reject / Remove User Account
router.post('/govt/reject-user/:id', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    req.flash('info', 'User registration rejected and removed.');
    res.redirect('/govt/dashboard');
  } catch (err) {
    req.flash('error', 'Error removing registration.');
    res.redirect('/govt/dashboard');
  }
});

// Govt: Add Tender
router.post('/govt/tenders/add', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    const { title, description, category, type, budget, state, district, taluk, village } = req.body;
    const tenderId = 'TND-' + Math.floor(100000 + Math.random() * 900000);

    await Tender.create({
      tenderId,
      title,
      description,
      category,
      type,
      budget: Number(budget),
      location: { state, district, taluk, village },
      createdBy: req.user._id
    });

    req.flash('success', `Tender ${tenderId} published successfully!`);
    res.redirect('/govt/dashboard');
  } catch (err) {
    req.flash('error', 'Failed to publish tender.');
    res.redirect('/govt/dashboard');
  }
});

// Govt: Remove Tender
router.post('/govt/tenders/:id/delete', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    await Tender.findByIdAndDelete(req.params.id);
    req.flash('success', 'Tender deleted successfully.');
    res.redirect('/govt/dashboard');
  } catch (err) {
    req.flash('error', 'Failed to delete tender.');
    res.redirect('/govt/dashboard');
  }
});

// Govt: Assign Tender to Bidder
router.post('/govt/tenders/:id/assign', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    const { bidderId } = req.body;
    await Tender.findByIdAndUpdate(req.params.id, {
      assignedBidder: bidderId,
      status: 'assigned'
    });
    req.flash('success', 'Tender successfully awarded and contract assigned!');
    res.redirect('/govt/dashboard');
  } catch (err) {
    req.flash('error', 'Failed to assign tender.');
    res.redirect('/govt/dashboard');
  }
});

// Bidder Dashboard & Filter
router.get('/bidder/dashboard', verifyToken, checkRole(['bidder']), async (req, res) => {
  try {
    const { state, category, type, search } = req.query;
    let query = { status: 'active' };

    if (state) query['location.state'] = new RegExp(state.trim(), 'i');
    if (category) query.category = category;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: new RegExp(search.trim(), 'i') },
        { description: new RegExp(search.trim(), 'i') },
        { tenderId: new RegExp(search.trim(), 'i') }
      ];
    }

    const availableTenders = await Tender.find(query).sort({ createdAt: -1 });
    const wonTenders = await Tender.find({ assignedBidder: req.user._id });

    res.render('bidder-dashboard', { 
      availableTenders, 
      wonTenders, 
      filters: req.query,
      user: req.user 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading Bidder Portal');
  }
});

// Bidder: Place Bid on Tender
router.post('/bidder/tenders/:id/bid', verifyToken, checkRole(['bidder']), async (req, res) => {
  try {
    const { bidAmount, proposalNote } = req.body;
    const tender = await Tender.findById(req.params.id);

    if (!tender || tender.status !== 'active') {
      req.flash('error', 'This tender is no longer open for bidding.');
      return res.redirect('/bidder/dashboard');
    }

    // Check if bidder already bid
    const existingBid = tender.bids.find(b => b.bidderId.toString() === req.user._id.toString());
    if (existingBid) {
      req.flash('error', 'You have already submitted a bid for this tender.');
      return res.redirect('/bidder/dashboard');
    }

    tender.bids.push({
      bidderId: req.user._id,
      bidderName: req.user.name,
      bidderEmail: req.user.email,
      companyName: req.user.companyDetails.companyName || 'Not specified',
      bidAmount: Number(bidAmount),
      proposalNote: proposalNote || ''
    });

    await tender.save();
    req.flash('success', 'Your bid has been submitted successfully!');
    res.redirect('/bidder/dashboard');
  } catch (err) {
    req.flash('error', 'Error submitting bid.');
    res.redirect('/bidder/dashboard');
  }
});

// Contract PDF Generation & Download
router.get('/tenders/:id/contract-download', verifyToken, async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id).populate('assignedBidder');
    if (!tender || tender.status !== 'assigned') {
      return res.status(404).send('Contract document is unavailable or tender is not yet awarded.');
    }

    // Security check: only assigned bidder or official can download
    const isAssignedBidder = tender.assignedBidder && tender.assignedBidder._id.toString() === req.user._id.toString();
    const isOfficial = req.user.role === 'official';
    if (!isAssignedBidder && !isOfficial) {
      return res.status(403).send('Unauthorized to access this contract document.');
    }

    const doc = new PDFDocument({ margin: 50 });
    const filename = `Contract_${tender.tenderId}.pdf`;

    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');

    // PDF Content Design
    doc.rect(20, 20, 572, 752).stroke('#1e3a8a');
    doc.fillColor('#1e3a8a').fontSize(20).text('OFFICIAL GOVERNMENT PROCUREMENT CONTRACT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#64748b').text('E-Procurement Division • Government of India / State Authority', { align: 'center' });
    doc.moveDown(1.5);

    doc.fillColor('#0f172a').fontSize(14).text('CONTRACT SUMMARY & PARTICULARS', { underline: true });
    doc.moveDown(0.8);

    doc.fontSize(11).fillColor('#334155');
    doc.text(`Tender Reference ID: ${tender.tenderId}`);
    doc.text(`Tender Title: ${tender.title}`);
    doc.text(`Category: ${tender.category} | Type: ${tender.type}`);
    doc.text(`Approved Sanction Budget: INR ${tender.budget.toLocaleString('en-IN')}`);
    doc.text(`Location of Execution: ${tender.location.village ? tender.location.village + ', ' : ''}${tender.location.taluk}, ${tender.location.district}, ${tender.location.state}`);
    doc.moveDown(1);

    doc.fillColor('#0f172a').fontSize(14).text('AWARDED CONTRACTOR / BIDDER DETAILS', { underline: true });
    doc.moveDown(0.8);
    doc.fontSize(11).fillColor('#334155');
    doc.text(`Authorized Contractor: ${tender.assignedBidder.name}`);
    doc.text(`Company Name: ${tender.assignedBidder.companyDetails.companyName || 'N/A'}`);
    doc.text(`Registration / GST Number: ${tender.assignedBidder.companyDetails.registrationNumber || 'N/A'}`);
    doc.text(`Contractor Email: ${tender.assignedBidder.email}`);
    doc.moveDown(1.5);

    doc.fillColor('#0f172a').fontSize(12).text('SCOPE OF WORK & TERMS:');
    doc.fontSize(10).fillColor('#475569').text(tender.description, { align: 'justify' });
    doc.moveDown(2);

    doc.fontSize(10).fillColor('#1e293b').text('Digitally Issued by: Procurement Officer');
    doc.text(`Date of Award: ${new Date(tender.createdAt).toLocaleDateString()}`);
    doc.moveDown(2);
    doc.fillColor('#166534').text('STATUS: DIGITALLY RATIFIED & ACTIVE CONTRACT', { bold: true });

    doc.end();
    doc.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating contract document.');
  }
});

module.exports = router;
