'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AdminUser, Contact, Service, Product } = require('../db/mongo');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }
  const user = await AdminUser.findOne({ username: String(username).trim() });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  if (!bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }
  const token = jwt.sign(
    { sub: String(user._id), username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );
  res.json({ success: true, token, user: { id: String(user._id), username: user.username } });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, message: 'Current and new password are required.' });
  }
  if (String(new_password).length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }
  const user = await AdminUser.findById(req.user.sub);
  if (!user || !bcrypt.compareSync(String(current_password), user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }
  user.password_hash = bcrypt.hashSync(String(new_password), 10);
  await user.save();
  res.json({ success: true, message: 'Password updated.' });
});

router.get('/stats', requireAuth, async (_req, res) => {
  const [contacts_total, contacts_unread, services_total, products_total] = await Promise.all([
    Contact.countDocuments(),
    Contact.countDocuments({ is_read: false }),
    Service.countDocuments(),
    Product.countDocuments(),
  ]);

  const bySource = await Contact.aggregate([
    { $group: { _id: '$source', count: { $sum: 1 } } }
  ]);

  const sourceBreakdown = {};
  bySource.forEach(s => { sourceBreakdown[s._id || 'website-form'] = s.count; });

  res.json({ success: true, data: { contacts_total, contacts_unread, services_total, products_total, sourceBreakdown } });
});

module.exports = router;
