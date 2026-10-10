# Loria Construction: Website

Stamped concrete and masonry site for **Loria Construction LLC** (East Rochester, NY), with the **Instant Estimate** pre-qualifier and lead backend built in. Built by Real Easy Sites.

## What's inside

- **Marketing site** (`public/`)
  - Hero: "Concrete *Character*." over a looping walk-around patio video (`video/hero-walk.mp4`, a 540×960 version for phones), with the night walkway photo as the poster and fallback
  - "Loria Signature" stamped-concrete section (patterns, borders, medallions)
  - **Four finishes**: stamped, traditional brushed, brushed with a stamped border, finished floors (pole barns and garages)
  - **How we build it**: the owner's process video, featured large (plays when scrolled into view, with a Sound on button), next to a cross-section of the build: excavate and haul away, crushed-stone base, 2′×2′ rebar grid, 4"+ of 4,000 PSI concrete, hand-finished surface. Plus expansion joints along all masonry and multi-pour stoops and larger patios
  - Services (no chimney work is advertised anywhere, per the owner's insurance)
  - Homepage gallery with **job-type tabs** (Patios, Walkways, Pool Decks, Driveways, Stone, Tile, Detail, Commercial, Crew). "All" shows 12 hand-picked shots; each tab shows 8 from that category and links to the full set
  - Full gallery page (`/gallery`) with 154 photos, filter tabs and a lightbox; `/gallery#pool` etc. opens on that tab
  - Instant Estimate, how-it-works, and 9 real Google and Facebook reviews
  - Social section: live Facebook Page feed, Instagram post embeds, Messenger button
  - About the Lorias, service area, FAQ, contact form
  - Mobile Call / Message / Estimate bar, and LocalBusiness schema for SEO
- **Instant Estimate = CreteQuote.** Per the owner, the estimate section embeds his existing CreteQuote form (`public/crete-quote.html`, same account `data-id` as the old Wix site). Its leads land in his CreteQuote account. The built-in `instant-estimate/` module is kept but switched off (`INSTANT_ESTIMATE=on` in the environment re-enables it).
- **Admin** (`/admin`, password protected)
  - Contact-form lead pipeline: New → Contacted → Visit scheduled → Quoted → Won / Lost, with notes, tap-to-call/text and CSV export
  - Instant Estimates panel linking to the estimate leads and pricing pages
- **One SMTP setup** powers both the contact form and the estimate emails.
- **Website traffic** (`site-analytics/`): visitors, page views, traffic sources, devices and call/text taps at the top of `/admin`, next to the leads. Cookieless, skips bots and the owner's own admin visits. See `site-analytics/README.md`.

```
server.js              thin entry point
db/index.js            SQLite schema + prepared statements (estimate tables are added by the module)
lib/auth.js            admin sessions (+ page guard for estimate pages)
lib/mailer.js          contact-lead email + shared sendMail
lib/rateLimit.js       spam/abuse protection
routes/api.js          POST /api/contact
routes/admin.js        /admin page + /api/admin/*
admin/                 dashboard UI
instant-estimate/      drop-in estimate module (off)
site-analytics/        drop-in traffic tracking + dashboard panel
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

`public/img/*-sm.jpg` are 800px versions used for thumbnails; the full-size versions open in the lightbox. Gallery photos and captions live in `public/js/gallery-data.js` (one line per photo, with a category).

## Videos

- `public/video/hero-walk.mp4` (1280×720) and `hero-walk-sm.mp4` (540×960): silent walk-around loop for the hero
- `public/video/how-we-build.mp4`: the owner's process video, with audio, in "How we build it"
To swap a video, replace the file with the same name (H.264 MP4, keep it under ~5 MB).

## Before launch
- [x] **Persistent disk**: 1 GB at `/var/data` (added Oct 10). `db/index.js` uses `/var/data/loria.sqlite` automatically when the disk is mounted; the deploy log prints which path is in use.

- [ ] After the domain moves, run one CreteQuote estimate on the live site and confirm it shows up in his CreteQuote account.
- [ ] `ADMIN_PASSWORD` set.
- [ ] SMTP (Gmail app password) set, and confirm `NOTIFY_EMAIL` is the inbox he actually checks.
- [ ] Domain: `loriaconstruction.com` is currently on Wix. Point DNS at Render when ready; canonical, sitemap, OG and schema URLs already use `https://www.loriaconstruction.com`.
- [ ] Confirm the service-area town list (it's based on the stated ~30-mile radius).
- [ ] Confirm what the second number, (585) 727-7356, is for (shown as secondary on Contact).
- [ ] After launch, run a real estimate and a contact message to verify both emails arrive.
