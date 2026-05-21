'use strict';

const express = require('express');
const { Contact, mongoose } = require('../db/mongo');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email || !b.message) {
    return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(b.email))) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }
  try {
    const doc = await Contact.create({
      name: String(b.name).trim(),
      email: String(b.email).trim(),
      phone: b.phone ? String(b.phone).trim() : null,
      company: b.company ? String(b.company).trim() : null,
      role: b.role ? String(b.role).trim() : null,
      service: b.service ? String(b.service).trim() : null,
      budget: b.budget ? String(b.budget).trim() : null,
      timeline: b.timeline ? String(b.timeline).trim() : null,
      message: String(b.message).trim(),
      how_heard: b.how_heard ? String(b.how_heard).trim() : null,
      newsletter: !!b.newsletter,
      source: ['website-form', 'whatsapp', 'email'].includes(b.source) ? b.source : 'website-form',
    });
    res.json({ success: true, message: "Message received. We'll get back to you soon.", id: String(doc._id) });
  } catch (err) {
    console.error('[contact] insert failed:', err);
    res.status(500).json({ success: false, message: 'Could not save your message. Please try again later.' });
  }
});

router.get('/', requireAuth, async (_req, res) => {
  const rows = await Contact.find().sort({ created_at: -1 });
  res.json({ success: true, data: rows.map(r => r.toJSON()) });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const update = {};
  if (req.body && req.body.is_read !== undefined) {
    update.is_read = !(req.body.is_read === 0 || req.body.is_read === '0' || req.body.is_read === false);
  }
  const doc = await Contact.findByIdAndUpdate(id, update, { new: true });
  if (!doc) return res.status(404).json({ success: false, message: 'Not found.' });
  res.json({ success: true });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const doc = await Contact.findByIdAndDelete(id);
  if (!doc) return res.status(404).json({ success: false, message: 'Not found.' });
  res.json({ success: true });
});

module.exports = router;
