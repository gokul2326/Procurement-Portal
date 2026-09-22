const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

router.get('/login', (req, res) => {
  if (req.user) {
    return req.user.role === 'official' ? res.redirect('/govt/dashboard') : res.redirect('/bidder/dashboard');
  }
  res.render('login');
});

router.get('/register', (req, res) => {
  res.render('register');
});

// Registration logic: accounts require Govt approval
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, companyName, registrationNumber, category, previousWorks } = req.body;
    
    const existing = await User.findOne({ email });
    if (existing) {
      req.flash('error', 'An account with this email already exists.');
      return res.redirect('/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isOfficialRole = role === 'official';

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'bidder',
      companyDetails: {
        companyName: companyName || '',
        registrationNumber: registrationNumber || '',
        category: category || '',
        previousWorks: previousWorks || ''
      },
      // Both require government verification/approval before logging in
      isApproved: false
    });

    await newUser.save();
    req.flash('info', 'Registration submitted successfully! A Government Official must approve your account before you can log in.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed. Please check your details and try again.');
    res.redirect('/register');
  }
});

// Login logic
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      req.flash('error', 'Invalid email or password credentials.');
      return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash('error', 'Invalid email or password credentials.');
      return res.redirect('/login');
    }

    if (!user.isApproved) {
      req.flash('error', 'Account is pending approval by a Government Official. Please check back later.');
      return res.redirect('/login');
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || 'tender_jwt_secret',
      { expiresIn: '2d' }
    );

    res.cookie('token', token, { httpOnly: true });

    if (user.role === 'official') {
      res.redirect('/govt/dashboard');
    } else {
      res.redirect('/bidder/dashboard');
    }
  } catch (err) {
    console.error(err);
    req.flash('error', 'Server error during login.');
    res.redirect('/login');
  }
});

// Settings page & Account management
router.get('/settings', verifyToken, (req, res) => {
  res.render('settings', { user: req.user });
});

router.post('/settings/profile', verifyToken, async (req, res) => {
  try {
    const { profilePic, preferredLanguage, companyName, registrationNumber, previousWorks } = req.body;
    const user = await User.findById(req.user._id);
    if (profilePic) user.profilePic = profilePic;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (user.role === 'bidder') {
      user.companyDetails.companyName = companyName || user.companyDetails.companyName;
      user.companyDetails.registrationNumber = registrationNumber || user.companyDetails.registrationNumber;
      user.companyDetails.previousWorks = previousWorks || user.companyDetails.previousWorks;
    }
    await user.save();
    req.flash('success', 'Profile and preferences updated successfully.');
    res.redirect('/settings');
  } catch (err) {
    req.flash('error', 'Failed to update profile.');
    res.redirect('/settings');
  }
});

router.post('/settings/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.flash('error', 'Current password does not match.');
      return res.redirect('/settings');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    req.flash('success', 'Password updated successfully.');
    res.redirect('/settings');
  } catch (err) {
    req.flash('error', 'Failed to change password.');
    res.redirect('/settings');
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  req.flash('info', 'Logged out successfully.');
  res.redirect('/login');
});

module.exports = router;
