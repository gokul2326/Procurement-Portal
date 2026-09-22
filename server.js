const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'tender_session_key',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// Global flash & user state middleware
app.use(async (req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  res.locals.currentUser = null;

  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tender_jwt_secret');
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
      }
    } catch (e) {
      res.clearCookie('token');
    }
  }
  next();
});

// Routes
app.use('/', require('./routes/publicRoutes'));
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/tenderRoutes'));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/procurement_db';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB');
    app.listen(PORT, () => console.log(`Procurement Portal running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
