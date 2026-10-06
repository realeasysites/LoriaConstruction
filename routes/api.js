'use strict';

const express = require('express');
const { stmts } = require('../db');
const { notifyNewLead } = require('../lib/mailer');
const rateLimit = require('../lib/rateLimit');

const router = express.Router();

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

const SERVICES = [
  'Stamped concrete patio', 'Pool deck', 'Driveway / walkway / steps', 'Masonry / stone veneer',
  'Garage or pole barn floor', 'Tile / bathroom', 'Commercial project', 'Something else'
];
const TIMELINES = ['As soon as possible', 'Within 1–3 months', 'Next season', 'Just planning'];

router.post('/contact', rateLimit({ windowMs: 15 * 60 * 1000, max: 8 }), (req, res) => {
  const b = req.body || {};

  // Honeypot: real people never fill the hidden "lc_trap" field.
  // (Named so browsers don't autofill it; a field called "company" got autofilled and real leads were dropped.)
  if (b.lc_trap) return res.json({ ok: true });

  const name = clip(b.name, 100);
  const phone = clip(b.phone, 40);
  const email = clip(b.email, 160);

  const errors = {};
  if (name.length < 2) errors.name = 'Please enter your name.';
  if (phone.replace(/\D/g, '').length < 10) errors.phone = 'Please enter a valid phone number.';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'That email doesn’t look right.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

  const lead = {
    name,
    phone,
    email: email || null,
    town: clip(b.town, 80) || null,
    service: SERVICES.includes(b.service) ? b.service : null,
    timeline: TIMELINES.includes(b.timeline) ? b.timeline : null,
    message: clip(b.message, 2000) || null,
    ip: req.ip
  };

  const info = stmts.insertLead.run(lead);
  lead.id = Number(info.lastInsertRowid);
  notifyNewLead(lead); // fire-and-forget

  res.json({ ok: true, id: lead.id });
});

module.exports = router;
