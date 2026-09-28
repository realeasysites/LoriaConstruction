# Instant Estimate — Real Easy Sites module

A pre-qualifying ballpark estimator for contractor sites. It isn't a quoting tool. The customer answers a few questions, sees an honest price range, and then either requests a free site visit (a 🔥 hot lead) or walks away (price viewed only). The contractor still prices every job in person.

Built for the TBLC template stack: Node/Express + better-sqlite3 + nodemailer.

---

## Install into a client site (about 10 minutes)

**1. Copy the folder** `instant-estimate/` into the site root, next to `server.js`:

```
server.js
db/  lib/  public/  routes/
instant-estimate/     ← here
```

**2. Dependencies:** the template already has `express`, `better-sqlite3`, and `nodemailer`, so there's nothing new to install.

**3. Mount it in `server.js`** after `app` is created and before any 404 handler:

```js
require('./instant-estimate')(app, {
  business: {
    name: 'Loria Construction',
    phone: '(207) 555-0100',
    color: '#1f2937'          // email header color, use the brand color
  },
  requireAdmin,               // the site's existing admin-login middleware
  // sendMail,                // optional: reuse lib/mailer.js's send function
  // db,                      // optional: reuse the site's existing SQLite db
});
```

If you don't pass `requireAdmin`, the dashboard falls back to a browser password prompt that uses `ADMIN_PASSWORD`. If you don't pass `db`, the module keeps its own `instant-estimate/db/instant-estimate.sqlite`.

**4. Environment variables (Render → Environment):**

| Var | What |
|---|---|
| `SITE_URL` | `https://loriaconstruction.com`, used for the links in emails |
| `NOTIFY_EMAIL` | Where the contractor's lead alerts go |
| `SMTP_USER` / `SMTP_PASS` | Gmail address + App Password (same as the contact form) |
| `SMTP_HOST` / `SMTP_PORT` | Optional, for Resend/Postmark etc. instead of Gmail |
| `MAIL_FROM` | Optional "From" line, e.g. `Loria Construction <estimates@…>` |
| `ADMIN_PASSWORD` | Only if you didn't pass `requireAdmin` |

**5. Put the form on the page.** Paste this wherever the "Get an estimate" section lives:

```html
<link rel="stylesheet" href="/instant-estimate/ie.css">
<div id="instant-estimate"></div>
<script src="/instant-estimate/ie.js" defer></script>
```

A standalone page also works out of the box at `/instant-estimate/`. That's where the email "Request my free site visit" link points by default. If you embed the form on another page (for example `/estimate.html`), pass `pagePath: '/estimate.html'` so email links go there.

**6. Brand it** in the site's own CSS:

```css
#instant-estimate {
  --ie-accent: #b45309;      /* buttons, highlights */
  --ie-ink: #1c1917;         /* text */
  --ie-surface: #f5f5f4;     /* soft panels */
  --ie-radius: 10px;
  --ie-font: 'Inter', sans-serif;
}
```

**7. Add links in the main admin dashboard** to `/admin/estimates` (leads) and `/admin/estimate-pricing` (rates).

**8. Before launch:** put the contractor's real numbers into the Pricing page. A yellow "placeholder" warning shows there until they're saved.

---

## How the number is built

```
job   = sq ft × finish rate
      + sq ft × removal rate            (only if replacing)
      + steps + seat wall + fire pit pad
job   = job × access multiplier × slope multiplier
job   = at least the minimum job charge
range = job − low%  to  job + high%    (rounded to $100, never below the minimum)
```

Customers only see the range. The contractor's email and dashboard show the full line-item breakdown.

**Budget gap ⚠️** is flagged when the customer's stated budget ceiling is below the low end of their range.

## What's included

- 7-step mobile-first form with size presets, live sq ft math, and an optional budget/timeline question
- Contact info is collected before the price shows, so walk-aways are still leads
- Customer email with the range, a summary, and a one-click "request site visit" link (the link reopens the estimate, so a walk-away can convert later)
- Contractor emails: "Price viewed" and "🔥 Site visit requested"
- Leads dashboard with tier badges, filters, status tracking, notes, and the breakdown
- Pricing editor with a live "try a sample job" preview, so the contractor can sanity-check numbers before saving
- Spam protection: hidden honeypot field plus a per-IP limit (8 estimates per hour)

## Routes

| Route | |
|---|---|
| `GET /instant-estimate/` | Standalone form page (and static assets) |
| `GET /api/instant-estimate/config` | Question options (labels only, rates stay private) |
| `POST /api/instant-estimate` | Submit answers, returns the range |
| `GET /api/instant-estimate/lead/:token` | Reopen an estimate from the email link |
| `POST /api/instant-estimate/lead/:token/visit` | Request a site visit |
| `GET /admin/estimates`, `/admin/estimate-pricing` | Admin pages (protected) |
| `/admin/api/estimates…`, `/admin/api/estimate-rates…` | Admin API (protected) |

## Reusing for another trade

The questions are patio-specific (finish, access, slope, steps/walls/fire pit), but the plumbing (range, tiers, emails, dashboard, pricing page) is trade-agnostic. For fencing, paving, and similar trades, change `lib/defaults.js`, `lib/pricing.js` `calculate()`, and the step views in `public/ie.js`. Build it for Loria first and make it generic once it's proven.
