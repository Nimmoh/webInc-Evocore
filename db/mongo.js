'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const jsonTransform = {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
};

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password_hash: { type: String, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: jsonTransform });

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, default: null, trim: true },
  company: { type: String, default: null, trim: true },
  role: { type: String, default: null, trim: true },
  service: { type: String, default: null, trim: true },
  budget: { type: String, default: null, trim: true },
  timeline: { type: String, default: null, trim: true },
  message: { type: String, required: true, trim: true },
  how_heard: { type: String, default: null, trim: true },
  newsletter: { type: Boolean, default: false },
  is_read: { type: Boolean, default: false },
  source: { type: String, default: 'website-form', enum: ['website-form', 'whatsapp', 'email'] },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: jsonTransform });

const ServiceSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true },
  icon: { type: String, default: null, trim: true },
  short_description: { type: String, default: null, trim: true },
  description: { type: String, default: null, trim: true },
  features: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  image: { type: String, default: null, trim: true },
  is_published: { type: Boolean, default: true },
  sort_order: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: jsonTransform });

const ProductSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, default: null, trim: true },
  short_description: { type: String, default: null, trim: true },
  description: { type: String, default: null, trim: true },
  features: { type: [String], default: [] },
  price: { type: String, default: null, trim: true },
  image: { type: String, default: null, trim: true },
  is_published: { type: Boolean, default: true },
  sort_order: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, toJSON: jsonTransform });

const AdminUser = mongoose.model('AdminUser', AdminUserSchema);
const Contact = mongoose.model('Contact', ContactSchema);
const Service = mongoose.model('Service', ServiceSchema);
const Product = mongoose.model('Product', ProductSchema);

async function seedAdmin() {
  const count = await AdminUser.countDocuments();
  if (count > 0) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  await AdminUser.create({ username, password_hash: bcrypt.hashSync(password, 10) });
  console.log(`[db] Seeded admin user "${username}".`);
}

async function seedServices() {
  if (await Service.countDocuments() > 0) return;
  await Service.insertMany([
    { slug: 'digital-presence', title: 'Digital Presence & Branding', icon: 'fa-globe',
      short_description: 'Stunning websites, e-commerce, and social media management.',
      description: 'Transform your business with professional, responsive websites and powerful e-commerce platforms, while we manage your social media presence to grow your community.',
      features: ['Responsive websites', 'E-commerce platforms', 'Social media management', 'Brand identity design'],
      tags: ['Web Development', 'Social Media', 'Branding'], image: '/images/digital.jpeg', sort_order: 1 },
    { slug: 'business-automation', title: 'Business Process Automation', icon: 'fa-cogs',
      short_description: 'Automate operations and increase efficiency with custom workflows.',
      description: 'Streamline operations with POS, inventory, HR and payroll systems plus automated invoicing for better cash flow management.',
      features: ['POS & inventory', 'HR & payroll', 'Automated invoicing', 'Custom workflows'],
      tags: ['POS Systems', 'HR Tools', 'Automation'], image: '/images/business_automation.jpg', sort_order: 2 },
    { slug: 'finance-tech', title: 'Finance & Payments Integration', icon: 'fa-wallet',
      short_description: 'Payment gateways, mobile money, invoicing and digital wallets.',
      description: 'Integrate M-Pesa, card payments, invoicing and digital wallets directly into your business systems.',
      features: ['M-Pesa integration', 'Card payment gateways', 'Digital invoicing', 'Wallet integrations'],
      tags: ['M-Pesa', 'Payments', 'Fintech'], image: '/images/payments.jpg', sort_order: 3 },
    { slug: 'custom-software', title: 'Custom Software Development', icon: 'fa-code',
      short_description: 'Tailor-made desktop, mobile, or web applications.',
      description: 'Get tailor-made desktop, mobile, or web applications designed to fit your exact business needs.',
      features: ['Web applications', 'Mobile apps', 'Desktop software', 'API development'],
      tags: ['Web', 'Mobile', 'Desktop'], image: '/images/web.jpeg', sort_order: 4 },
  ]);
  console.log('[db] Seeded 4 services.');
}

async function seedProducts() {
  if (await Product.countDocuments() > 0) return;
  await Product.insertMany([
    { slug: 'evocore-pos', name: 'Evocore POS', category: 'Retail',
      short_description: 'Modern point-of-sale for shops, salons and restaurants.',
      description: 'A complete POS with inventory, receipts, M-Pesa integration and daily sales reports.',
      features: ['Inventory tracking', 'M-Pesa & card payments', 'Daily sales reports', 'Multi-user access'],
      price: 'From KES 25,000', image: '/images/business_automation.jpg', sort_order: 1 },
    { slug: 'evocore-payroll', name: 'Evocore Payroll', category: 'HR',
      short_description: 'Automated payroll with statutory deductions (PAYE, NHIF, NSSF).',
      description: 'Run payroll in minutes with automatic NHIF, NSSF and PAYE calculations, plus payslip emails.',
      features: ['PAYE/NHIF/NSSF', 'Payslip email & PDF', 'Leave tracking', 'Bank export'],
      price: 'From KES 18,000', image: '/images/training.jpg', sort_order: 2 },
    { slug: 'evocore-invoice', name: 'Evocore Invoice', category: 'Finance',
      short_description: 'Send invoices and collect payments via M-Pesa & card.',
      description: 'Professional invoicing with recurring billing, payment reminders and integrated M-Pesa STK Push.',
      features: ['M-Pesa STK Push', 'Recurring invoices', 'Auto reminders', 'PDF export'],
      price: 'From KES 12,000', image: '/images/payments.jpg', sort_order: 3 },
    { slug: 'evocore-site', name: 'Evocore Starter Website', category: 'Web',
      short_description: 'Professional 5-page website with hosting & domain for 1 year.',
      description: 'Get online in 7 days with a responsive website, domain, hosting and basic SEO.',
      features: ['5 pages + contact form', '1-year hosting', 'Free domain', 'Basic SEO'],
      price: 'From KES 35,000', image: '/images/digital.jpeg', sort_order: 4 },
  ]);
  console.log('[db] Seeded 4 products.');
}

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in .env');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || 'evocore',
    serverSelectionTimeoutMS: 15000,
  });
  console.log(`[db] MongoDB connected (db: ${mongoose.connection.name}).`);
  await seedAdmin();
  await seedServices();
  await seedProducts();
}

module.exports = { connect, AdminUser, Contact, Service, Product, mongoose };
