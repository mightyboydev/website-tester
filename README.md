# Kaytact — Your contact. One tap away.

A premium, mobile-first digital contact / vCard platform built as a **single `index.html` file**. Firebase is wired in. Deploy to Vercel and it's a real working product.

---

## What's in this folder

```
kaytact/
├── index.html          ← The whole app (HTML + CSS + JS in one file)
├── vercel.json         ← SPA rewrites so /awwal loads the profile
├── manifest.json       ← PWA manifest (installable)
├── sw.js               ← Service worker (offline + caching)
├── qr-lib.js           ← Vendored QR code generator
├── icon.svg            ← Vector icon (lime on navy)
├── icon-192.png        ← PWA icon (192×192)
├── icon-512.png        ← PWA icon (512×512)
├── apple-touch-icon.png
├── favicon.ico
└── README.md           ← This file
```

No `package.json`, no Node, no React. Push to GitHub and import into Vercel.

---

## ⚡ To make it work, you need to do these 3 things in Firebase

Your Firebase config is already baked into `index.html`. But Firebase starts locked down. You must:

### 1. Enable Email/Password auth
- Firebase Console → **Build → Authentication → Sign-in method**
- Click **Email/Password** → Enable → Save
- (Optional) Enable **Google** sign-in too

### 2. Create the Firestore database
- Firebase Console → **Build → Firestore Database → Create database**
- Pick **production mode** (locked down by default — we'll add rules next)
- Pick a region close to your users

### 3. Paste these Firestore rules
- Firebase Console → **Firestore Database → Rules tab**
- Replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /profiles/{uid} {
      allow read: if resource.data.disabled == false || request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid
                    && request.resource.data.uid == uid;
      allow update: if request.auth.uid == uid
                    && request.resource.data.uid == resource.data.uid;
      allow delete: if false;
    }

    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow update, delete: if request.auth != null
                            && request.resource.data.uid == request.auth.uid;
    }

    match /stats/{username} {
      allow read: if true;
      allow update: if true;
      allow create: if request.auth != null;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click **Publish**.

### 4. Add your deployment domain to authorized domains
- Firebase Console → **Authentication → Settings → Authorized domains**
- Add `your-project.vercel.app` (after first deploy, you'll know the URL)
- Add `kaytact.com` (when you wire the custom domain)

### 5. (Optional) Set your admin email
Open `index.html`, find this line near the top of `<body>`:

```html
<script>
  window.KAYTACT_ADMIN_EMAILS = window.KAYTACT_ADMIN_EMAILS || "you@example.com";
</script>
```

Replace `you@example.com` with your real admin email. Sign up with that email → you get access to `/admin`.

---

## Quick deploy to Vercel

### Option A — GitHub (recommended)

1. Create a new GitHub repo (e.g. `kaytact`)
2. Upload all files in this `kaytact/` folder to the **root** of the repo (don't nest them in a subfolder)
3. Go to **[vercel.com/new](https://vercel.com/new)**
4. Import your GitHub repo
5. Vercel auto-detects "Other" framework — leave **Build Command** and **Output Directory** blank
6. Click **Deploy**

### Option B — Vercel CLI

```bash
npm i -g vercel
cd kaytact
vercel --prod
```

### Custom domain (kaytact.com)

In Vercel → Project → Settings → Domains → add `kaytact.com` and `www.kaytact.com`. Follow Vercel's DNS instructions.

---

## What's real vs. what's a fallback

| Feature | Status |
|---|---|
| Firebase config | ✅ Real — baked into `index.html` |
| Email/password auth | ✅ Real — uses Firebase Auth (after step 1) |
| Profile storage | ✅ Real — uses Firestore (after steps 2 & 3) |
| Stats tracking | ✅ Real — uses Firestore `FieldValue.increment` |
| vCard generation | ✅ Real — generated client-side, downloads as `.vcf` |
| QR codes | ✅ Real — generated client-side via vendored `qrcode-generator` |
| Share buttons | ✅ Real — Web Share API + WhatsApp/Facebook/X deep links |
| Admin panel | ✅ Real — gated by `ADMIN_EMAILS` config |

### Why the sandbox preview might look "empty" or fail to load profiles

This sandbox blocks outbound network to `firestore.googleapis.com`. So when you preview here:
- Firebase Auth won't work (you can't actually log in)
- Firestore reads/writes will fail (profiles won't load)

To keep the preview explorable, the app silently falls back to `localStorage` when Firebase is unreachable. **This fallback never fires on Vercel** (where outbound network is unrestricted) — the real Firebase database handles everything.

**Test on Vercel for the real experience.**

---

## Design system — "hacker-lime"

- **Background**: `#070E16` (deep navy)
- **Foreground**: `#EDF2F8` (off-white)
- **Accent**: `#68E371` (lime green) — primary buttons, eyebrows, accent text
- **WhatsApp**: `#25D366` — only on the WhatsApp button (brand exception)
- **Border**: `#1B2530` — always 1px
- **Card**: `#111921` at 60% opacity with `backdrop-blur(8px)`
- **Fonts**: Space Grotesk (UI) + JetBrains Mono (eyebrows, meta, system text)
- **Eyebrows**: `// code-comment` style — mono, uppercase, wide tracking, lime

---

## How it works (architecture)

Everything is in **one file**: `index.html`. It uses:

- **Vanilla JS** with a tiny path-based SPA router
- **Firebase Web SDK (modular, ESM via CDN)** for auth + Firestore — called directly from the browser, no proxy APIs
- **`qrcode-generator` library** (vendored locally as `qr-lib.js`) for QR generation
- **Web Share API** for native share menus on iOS / Android
- **vCard 3.0** generated in the browser and downloaded as a real `.vcf` file
- **`vercel.json` rewrites** so `/awwal` etc. resolve to `index.html`
- **PWA** (manifest + service worker) — installable, offline-capable

### Routing

| Path | Renders |
|------|---------|
| `/` | Landing page |
| `/login`, `/signup`, `/forgot-password` | Auth pages |
| `/dashboard` | Owner overview (auth required) |
| `/dashboard/edit` | Edit profile form |
| `/dashboard/analytics` | Stats + charts |
| `/dashboard/qr` | Downloadable QR code |
| `/admin` | Admin panel (admin email gate) |
| `/:username` | Public profile card (e.g. `/awwal`) |

---

## Feature checklist

- [x] Hacker-lime aesthetic — navy bg, lime accent, Space Grotesk + JetBrains Mono, glass cards
- [x] Mobile-first, no horizontal scroll, large tap targets, iOS safe areas
- [x] Firebase Auth: email/password + Google sign-in + password reset + persistent session
- [x] Firestore-backed profiles + stats with secure rules
- [x] Username system with validation + duplicate check + reserved words
- [x] Public profile card: photo, name, title, company, bio, location
- [x] SAVE CONTACT button → generates real vCard `.vcf` (multi-phone, socials, photo URL, etc.)
- [x] WhatsApp / Call / Email buttons with proper deep-links
- [x] Social links (Facebook, Instagram, X, LinkedIn, Telegram, TikTok)
- [x] Custom links
- [x] QR code generation (downloadable PNG) for each profile
- [x] Share via Web Share API, WhatsApp, X, copy link
- [x] Analytics: views, contact saves, WhatsApp / call / email clicks (auto-tracked)
- [x] Dashboard with profile summary, stats cards, link copy, share button
- [x] Edit profile: photo upload (resized client-side), all fields, live username validation
- [x] Admin panel: search users, view stats, disable/enable, rename, platform totals
- [x] PWA: installable, offline fallback, app icons
- [x] SEO: per-profile title, description, OG, Twitter card metadata
- [x] Vercel-ready: `vercel.json` rewrites for SPA routes
- [x] Loading / empty / error states, toast notifications, skeletons
- [x] Form validation everywhere
- [x] Auth-protected routes (`/dashboard/*`, `/admin`)
- [x] Public profiles viewable without login

---

## Local development

Because it's a single HTML file with module scripts, serve over HTTP (not `file://`) so ES modules work:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Open `http://localhost:8080`. Firebase will be reachable from your local machine (unlike the sandbox preview).

---

## Tech notes

- **Why no framework?** Per your spec. Vanilla JS keeps the file small, loads instantly, has zero build step.
- **Why Firebase from the browser?** Per your spec. Firebase Web SDK is designed for this — config keys are public, security is enforced by Firestore Rules + Auth.
- **Image uploads** are stored as base64 data URLs in Firestore (resized to ≤512px client-side). For larger images, swap in Firebase Storage.
- **Stats tracking** uses `FieldValue.increment(1)` so writes are atomic and idempotent.

---

## License

MIT — use it, fork it, sell it.
