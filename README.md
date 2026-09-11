# Kaytact — Your contact. One tap away.

A premium, mobile-first digital contact / vCard platform built as a **single `index.html` file**. No build step. No framework. Just deploy and go.

**Firebase is already configured** — your `kaytact` project's web config is baked into `index.html`. Deploy and it works.

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

That's it. No `package.json`, no Node, no React. Just push to GitHub and import into Vercel.

---

## Quick deploy to Vercel (5 minutes)

### Option A — GitHub (recommended)

1. **Create a new GitHub repo** (e.g. `kaytact`).
2. **Upload all files in this `kaytact/` folder** to the root of the repo. Don't nest them in a subfolder — they need to live at the repo root.
3. Go to **[vercel.com/new](https://vercel.com/new)**.
4. **Import** your GitHub repo.
5. Vercel auto-detects "Other" framework — that's fine. **No build command, no output directory** — leave both blank.
6. Click **Deploy**. Your Kaytact is live at `your-project.vercel.app`.

### Option B — Vercel CLI

```bash
npm i -g vercel
cd kaytact
vercel              # preview deploy
vercel --prod       # production deploy
```

### Custom domain (kaytact.com)

In Vercel → Project → Settings → Domains → add `kaytact.com` and `www.kaytact.com`. Follow the DNS instructions Vercel shows you.

---

## Firebase — already configured

Your Firebase web app config for the `kaytact` project is already pasted into `index.html`:

```js
const firebaseConfig = {
  apiKey: "AIzaSyDeJULgl0gRPgbThQSXoa-sK_DCvvjj6lk",
  authDomain: "kaytact.firebaseapp.com",
  projectId: "kaytact",
  storageBucket: "kaytact.firebasestorage.app",
  messagingSenderId: "828138537133",
  appId: "1:828138537133:web:61125059f1d9069de40624",
  measurementId: "G-W3NYRVL3JN"
};
```

### Still need to do in Firebase Console:

1. **Enable Authentication**: Build → Authentication → Sign-in method → enable **Email/Password** (and Google if you want).
2. **Create Firestore Database**: Build → Firestore Database → Create database (production mode).
3. **Authorized domains**: Authentication → Settings → Authorized domains → add:
   - `your-project.vercel.app`
   - `kaytact.com` (when you wire the custom domain)

### Lock down Firestore (paste into Rules tab):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Public can read profiles (so /username works without login)
    // Owners can write their own profile.
    match /profiles/{uid} {
      allow read: if resource.data.disabled == false || request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid
                    && request.resource.data.uid == uid;
      allow update: if request.auth.uid == uid
                    && request.resource.data.uid == resource.data.uid;
      allow delete: if false;
    }

    // Username → uid index. Public read, owner write.
    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow update, delete: if request.auth != null
                            && request.resource.data.uid == request.auth.uid;
    }

    // Stats: public read, anyone may increment (visitors aren't logged in)
    match /stats/{username} {
      allow read: if true;
      allow update: if true;  // increments via FieldValue.increment
      allow create: if request.auth != null;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Set admin emails (optional)

Open `index.html` and find this line near the top of `<body>`:

```html
<script>
  window.KAYTACT_ADMIN_EMAILS = window.KAYTACT_ADMIN_EMAILS || "you@example.com";
</script>
```

Replace `you@example.com` with your real admin email(s) — comma-separated. Anyone signed in with one of those emails gets access to `/admin`.

---

## Design system

Kaytact uses a minimal "hacker-lime" aesthetic:

- **Background**: `#070E16` (deep navy, almost black)
- **Foreground**: `#EDF2F8` (off-white)
- **Accent**: `#68E371` (lime green) — used for primary buttons, eyebrows, accent text
- **WhatsApp**: `#25D366` — only on the WhatsApp button (brand exception)
- **Border**: `#1B2530` — always 1px
- **Card**: `#111921` at 60% / 40% opacity with `backdrop-blur(8px)`
- **Fonts**: Space Grotesk (UI) + JetBrains Mono (eyebrows, meta, system text)
- **Eyebrows**: `// code-comment` style — mono, uppercase, wide tracking, lime

---

## How it works (architecture)

Everything is in **one file**: `index.html`. It uses:

- **Vanilla JS** with a tiny path-based SPA router (`/`, `/login`, `/dashboard`, `/awwal` etc.)
- **Firebase Web SDK (modular, ESM via CDN)** for auth + Firestore — called directly from the browser, no proxy APIs
- **`qrcode-generator` library** (vendored locally as `qr-lib.js`) for QR generation
- **Web Share API** for native share menus on iOS / Android
- **vCard 3.0** generated in the browser and downloaded as a real `.vcf` file
- **`vercel.json` rewrites** so `/awwal` etc. resolve to `index.html` (SPA pattern)
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
- [x] Firestore-backed profiles + stats
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

Because it's a single HTML file with module scripts, you need to serve it over HTTP (not `file://`) so ES modules work:

```bash
# Python
python3 -m http.server 8080

# Or Node
npx serve .
```

Open `http://localhost:8080` in your browser.

---

## Tech notes

- **Why no framework?** Per your spec. Vanilla JS keeps the file under 200 KB, loads instantly, has zero build step, and survives any future framework churn.
- **Why Firebase from the browser?** Per your spec. Firebase Web SDK is designed for this — the config keys are public, security is enforced by Firestore Rules + Auth.
- **Image uploads** are stored as base64 data URLs in Firestore (resized to ≤512px client-side). For larger images, swap in Firebase Storage — the rest of the app doesn't care.
- **Stats tracking** uses `FieldValue.increment(1)` so writes are atomic and idempotent enough for production traffic.

---

## License

MIT — use it, fork it, sell it. Build your contact card empire.
