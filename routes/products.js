'use strict';

const express = require('express');
const { Product, mongoose } = require('../db/mongo');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

function parseList(v) {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try { const p = JSON.parse(s); return Array.isArray(p) ? p.map(x => String(x).trim()).filter(Boolean) : []; } catch { /* fallthrough */ }
  }
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function toBool(v, fallback) {
  if (v === undefined) return fallback;
  if (v === false || v === 0 || v === '0' || v === 'false' || v === '') return false;
  return true;
}

router.get('/', async (_req, res) => {
  const rows = await Product.find({ is_published: true }).sort({ sort_order: 1, _id: 1 });
  res.json({ success: true, data: rows.map(r => r.toJSON()) });
});

router.get('/all', requireAuth, async (_req, res) => {
  const rows = await Product.find().sort({ sort_order: 1, _id: 1 });
  res.json({ success: true, data: rows.map(r => r.toJSON()) });
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const row = await Product.findById(id);
  if (!row) return res.status(404).json({ success: false, message: 'Not found.' });
  res.json({ success: true, data: row.toJSON() });
});

router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ success: false, message: 'Name is required.' });
  const image = req.file ? `/uploads/${req.file.filename}` : (b.image || null);
  try {
    const doc = await Product.create({
      slug: b.slug ? slugify(b.slug) : slugify(b.name),
      name: b.name,
      category: b.category || null,
      short_description: b.short_description || null,
      description: b.description || null,
      features: parseList(b.features) || [],
      price: b.price || null,
      image,
      is_published: toBool(b.is_published, true),
      sort_order: Number(b.sort_order) || 0,
    });
    res.json({ success: true, id: String(doc._id) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put('/:id', requireAuth, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const existing = await Product.findById(id);
  if (!existing) return res.status(404).json({ success: false, message: 'Not found.' });
  const b = req.body || {};
  if (b.slug !== undefined) existing.slug = slugify(b.slug) || existing.slug;
  if (b.name !== undefined) existing.name = b.name;
  if (b.category !== undefined) existing.category = b.category;
  if (b.short_description !== undefined) existing.short_description = b.short_description;
  if (b.description !== undefined) existing.description = b.description;
  if (b.features !== undefined) existing.features = parseList(b.features) || [];
  if (b.price !== undefined) existing.price = b.price;
  if (req.file) existing.image = `/uploads/${req.file.filename}`;
  else if (b.image !== undefined) existing.image = b.image || null;
  if (b.is_published !== undefined) existing.is_published = toBool(b.is_published, existing.is_published);
  if (b.sort_order !== undefined) existing.sort_order = Number(b.sort_order) || 0;
  try {
    await existing.save();
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id.' });
  const doc = await Product.findByIdAndDelete(id);
  if (!doc) return res.status(404).json({ success: false, message: 'Not found.' });
  res.json({ success: true });
});

module.exports = router;
