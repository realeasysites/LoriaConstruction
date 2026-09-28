# Loria Construction: Website

Stamped concrete and masonry site for **Loria Construction LLC** (East Rochester, NY), with the **Instant Estimate** pre-qualifier and lead backend built in. Built by Real Easy Sites.

## What's inside

- **Marketing site** (`public/`)
  - Night-lit stamped walkway hero with Google and Facebook proof
  - "Loria Signature" stamped-concrete section (patterns, borders, medallions)
  - Six services, with real photos for each
  - Filterable gallery of 37 real project photos (patios, walkways, pool decks, driveways, medallions, tile) with a lightbox
  - Instant Estimate, how-it-works, and 9 real Google and Facebook reviews
  - Social section: live Facebook Page feed, Instagram post embeds, Messenger button
  - About the Lorias, service area, FAQ (from their own site), contact form
  - Mobile Call / Message / Estimate bar, and LocalBusiness schema for SEO
- **Instant Estimate** (`instant-estimate/`): the customer sees an honest ballpark, then requests a free site visit (🔥 hot lead) or walks away (price viewed only). The owner gets emails for both and edits his own rates at `/admin/estimate-pricing`. See `instant-estimate/README.md`.
- **Admin** (`/admin`, password protected)
  - Contact-form lead pipeline: New → Contacted → Visit scheduled → Quoted → Won / Lost, with notes, tap-to-call/text and CSV export
  - Instant Estimates panel linking to the estimate leads and pricing pages
- **One SMTP setup** powers both the contact form and the estimate emails.

```
server.js              thin entry point
db/index.js            SQLite schema + prepared statements (estimate tables are added by the module)
lib/auth.js            admin sessions (+ page guard for estimate pages)
lib/mailer.js          contact-lead email + shared sendMail
lib/rateLimit.js       spam/abuse protection
routes/api.js          POST /api/contact
routes/admin.js        /admin page + /api/admin/*
admin/                 dashboard UI
instant-estimate/      drop-in estimate module
public/                the website
```

## Run it

Requires **Node 20.x** (better-sqlite3 has no prebuilt binaries for newer versions). `.node-version` and `engines` are already pinned.

```bash
npm install
cp .env.example .env    # then fill it in
npm start               # http://localhost:3000   admin: /admin
```

On Render, set the same variables from `.env.example` in Environment. Don't upload `.env`.

## Photos

All photos are Loria's own, from the owner's folder. Two privacy edits were made:
- the house number on the night porch (hero) is blurred
- a vehicle's license plate in the waterfront medallion shot is blurred

`public/img/*-sm.jpg` are 800px versions used for thumbnails; the full-size versions open in the lightbox.

## Before launch

- [ ] **Real pricing.** The estimate uses placeholder rates until Loria saves his own at `/admin/estimate-pricing`. A yellow warning shows there until then. Send him `instant-estimate/CONTRACTOR-CHECKLIST.md`.
- [ ] `ADMIN_PASSWORD` set.
- [ ] SMTP (Gmail app password) set, and confirm `NOTIFY_EMAIL` is the inbox he actually checks.
- [ ] Domain: `loriaconstruction.com` is currently on Wix. Point DNS at Render when ready; canonical, sitemap, OG and schema URLs already use `https://www.loriaconstruction.com`.
- [ ] Update the **Links** on his Facebook page: it still points to cretequote.com. Point it to `loriaconstruction.com/#estimate`.
- [ ] Confirm the service-area town list (it's based on the stated ~30-mile radius).
- [ ] Confirm what the second number, (585) 727-7356, is for (shown as secondary on Contact).
- [ ] After launch, run a real estimate and a contact message to verify both emails arrive.
