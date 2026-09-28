// Default pricing & question options for Instant Estimate.
// EVERY number here is a PLACEHOLDER. The contractor replaces them from
// the admin "Estimate Pricing" page (saved to the database) — this file is
// only the starting point for a brand-new install.

module.exports = {
  // $ per square foot, by finish. "enabled: false" hides it from customers.
  finishes: [
    { key: 'broom',     label: 'Broom Finish',            desc: 'Classic, slip-resistant, most budget-friendly.', rate: 12, enabled: true },
    { key: 'aggregate', label: 'Exposed Aggregate',       desc: 'Textured stone surface with a natural look.',   rate: 16, enabled: true },
    { key: 'stamped',   label: 'Stamped Concrete',        desc: 'Patterned to look like stone, slate, or brick.', rate: 19, enabled: true },
    { key: 'stamped_color', label: 'Stamped + Colored',   desc: 'Stamped pattern with integral color & release.', rate: 22, enabled: true }
  ],

  // Removal of an existing patio / slab / pavers, $ per sq ft.
  demoRate: 4,

  // Multipliers applied to the whole job.
  access: [
    { key: 'easy',     label: 'Easy — truck can back up close',        mult: 1.0 },
    { key: 'moderate', label: 'Moderate — some distance / a gate',     mult: 1.1 },
    { key: 'tight',    label: 'Tight — backyard, wheelbarrow or pump', mult: 1.25 }
  ],
  slope: [
    { key: 'flat',   label: 'Mostly flat',           mult: 1.0 },
    { key: 'gentle', label: 'Gentle slope',          mult: 1.08 },
    { key: 'steep',  label: 'Noticeable slope / hill', mult: 1.2 }
  ],

  // Add-ons
  stepRate: 450,       // $ per step
  seatWallRate: 120,   // $ per linear foot
  firePitPad: 900,     // flat $

  minimumJob: 4500,    // no estimate will show below this

  // How wide the ballpark range is around the calculated number.
  rangeLowPct: 10,     // low end  = calculated − 10%
  rangeHighPct: 15,    // high end = calculated + 15%

  // Size guard rails (sq ft)
  minSqft: 50,
  maxSqft: 5000,

  // Optional budget question. Keys are stored; high = top of bracket.
  budgets: [
    { key: 'u5',   label: 'Under $5,000',       high: 5000 },
    { key: '5_10', label: '$5,000 – $10,000',   high: 10000 },
    { key: '10_20',label: '$10,000 – $20,000',  high: 20000 },
    { key: '20p',  label: '$20,000+',           high: Infinity },
    { key: 'unsure', label: 'Not sure yet',     high: null }
  ],

  timelines: [
    { key: 'asap',    label: 'As soon as possible' },
    { key: '1_3',     label: 'Within 1–3 months' },
    { key: 'next',    label: 'Next season' },
    { key: 'explore', label: 'Just exploring' }
  ],

  // Text the customer sees on the result screen & email.
  disclaimer: 'This is a ballpark range based on your answers, not a quote. Every project is priced after a free on-site visit, where we look at soil, drainage, access, and your exact layout.'
};
