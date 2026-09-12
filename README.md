# Kaytact — Your contact. One tap away.

A premium, mobile-first digital contact / vCard platform built as a **single `index.html` file**. Firebase is wired in. Deploy to Vercel and it's a real working product.

Includes a **multi-tenant Contact Collector** for WhatsApp group admins — each admin gets a branded page where members submit contacts, downloadable as a bulk .vcf.

---

## What's in this folder

```
kaytact/
├── index.html          ← The whole app (HTML + CSS + JS in one file)
├── vercel.json         ← SPA rewrites so /awwal and /c/groupA load correctly
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

## ⚡ To make it work, do these 3 things in Firebase

Your Firebase config is already baked into `index.html`. But Firebase starts locked down. You must:

### 1. Enable Email/Password auth
- Firebase Console → **Build → Authentication → Sign-in method**
- Click **Email/Password** → Enable → Save

### 2. Create the Firestore database
- Firebase Console → **Build → Firestore Database → Create database**
- Pick **production mode**
- Pick a region close to your users

### 3. Paste these Firestore rules
- Firebase Console → **Firestore Database → Rules tab**
- Replace everything with the rules below
- Click **Publish**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: is the current user a platform admin?
    // Checks if there's a doc at admins/{uid} matching their auth UID.
    function isAdmin() {
      return request.auth != null
             && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // ===== KAYTACT PERSONAL PROFILES =====
    match /profiles/{uid} {
      // Public can read non-disabled profiles. Owner can read their own.
      // Admins can read ALL profiles (for the /admin panel).
      allow read: if resource.data.disabled == false
                  || request.auth.uid == uid
                  || isAdmin();
      allow create: if request.auth != null && request.auth.uid == uid
                    && request.resource.data.uid == uid;
      allow update: if request.auth.uid == uid
                    && request.resource.data.uid == resource.data.uid;
      allow delete: if isAdmin();
    }

    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.uid == request.auth.uid;
      allow update, delete: if request.auth != null
                            && resource.data.uid == request.auth.uid;
    }

    match /stats/{username} {
      allow read: if true;
      allow update: if true;
      allow create: if request.auth != null;
    }

    // ===== CONTACT COLLECTOR (multi-tenant) =====
    match /slugs/{slug} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.adminId == request.auth.uid;
      allow update, delete: if request.auth != null
                            && resource.data.adminId == request.auth.uid;
    }

    match /tenants/{adminId}/profile {
      allow read, write: if request.auth != null && request.auth.uid == adminId;
    }

    match /tenants/{adminId}/contacts/{contactId} {
      allow read: if request.auth != null && request.auth.uid == adminId;
      allow create: if true;
      allow update, delete: if request.auth != null && request.auth.uid == adminId;
    }

    // ===== PLATFORM ADMINS =====
    // Doc ID = the admin's Firebase Auth UID.
    // Any signed-in user can read (so the app can check isAdmin()).
    // Any signed-in user can create their own entry (the app checks the
    // invite code before calling addFirestoreAdmin).
    match /admins/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4. Add your deployment domain
- Firebase Console → **Authentication → Settings → Authorized domains**
- Add `your-project.vercel.app` (after first deploy)
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

## How the Firestore rules enforce tenant isolation (plain English)

**Core idea:** every tenant's data lives under `tenants/{adminId}/...`, and every rule checks `request.auth.uid == adminId`. Since Admin A's Firebase Auth UID ≠ Admin B's UID, the rules mathematically prevent cross-tenant access.

1. **`slugs/{slug}` — public read, owner write.** Anyone can read (the public page at `/c/groupA` resolves slug → adminId + business name). Only the admin whose UID matches `adminId` can create/modify. A visitor can find adminId from slug, but can't read that admin's contacts (protected by rule #3).

2. **`tenants/{adminId}/profile` — admin-only.** `read, write: if request.auth.uid == adminId`. Only the admin whose UID equals the `adminId` in the path can read or write. **Admin A cannot read Admin B's profile** — Firestore rejects with "permission-denied".

3. **`tenants/{adminId}/contacts/{contactId}` — public create, admin read.** `create: if true` lets any visitor submit (group members aren't logged in). `read: if request.auth.uid == adminId` means only the owning admin can list/read. **Admin A cannot read Admin B's contacts** because Admin A's UID ≠ Admin B's UID.

4. **Default deny.** Anything not explicitly allowed is blocked.

**Isolation is enforced by Firestore, not by the client.** Even if someone opens the browser console and tries `db.collection("tenants/otherAdminId/contacts").get()`, Firestore returns "permission-denied" before any data leaves the server.

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

---

## Routing

| Path | Renders |
|------|---------|
| `/` | Landing page |
| `/login`, `/signup`, `/forgot-password` | Kaytact personal auth |
| `/dashboard` | Personal contact card dashboard |
| `/dashboard/edit` | Edit personal profile |
| `/dashboard/analytics` | Personal profile analytics |
| `/dashboard/qr` | Personal QR code |
| `/admin` | Platform admin panel |
| `/:username` | Public personal profile (e.g. `/awwal`) |
| `/collector` | Contact Collector admin dashboard |
| `/collector/signup` | Create a new collector tenant |
| `/collector/login` | Log in to collector dashboard |
| `/c/:slug` | Public submission page (no login required) |

---

## Contact Collector — data structure

```
slugs/{slug} = {
  adminId: "firebase-auth-uid",
  businessName: "Awwal's WhatsApp Group",
  slug: "groupA",
  createdAt: timestamp
}

tenants/{adminId}/profile = {
  businessName: "Awwal's WhatsApp Group",
  slug: "groupA",
  adminEmail: "admin@example.com",
  createdAt: timestamp,
  updatedAt: timestamp
}

tenants/{adminId}/contacts/{contactId} = {
  firstName: "John",
  lastName: "Doe",
  countryCode: "+234",
  phone: "8012345678",
  fullPhone: "+2348012345678",
  createdAt: timestamp
}
```

The `slugs/{slug}` document stores `businessName` publicly so the submission page can show it without needing to read the protected `tenants/{adminId}/profile` document.

---

## Feature checklist

### Personal contact cards (Kaytact core)
- [x] Firebase Auth: email/password + Google + password reset + persistent session
- [x] Firestore-backed profiles + stats
- [x] Username system with validation + duplicate check
- [x] Public profile card with SAVE CONTACT → real .vcf download
- [x] WhatsApp / Call / Email buttons, social links, custom links
- [x] QR code generation + download
- [x] Analytics: views, saves, clicks
- [x] Admin panel with user management

### Contact Collector (multi-tenant)
- [x] Admin signup with slug picker + business name
- [x] Public submission page at `/c/:slug` (no login required)
- [x] Form: First name*, Last name (optional), Country code (default +234), Phone*
- [x] Success message after submitting
- [x] Admin dashboard: contact list, count, .vcf download, public link, share
- [x] Delete individual contacts
- [x] Multi-tenant isolation enforced by Firestore rules
- [x] Bulk .vcf file with multiple vCard entries (imports all at once)

---

## Tech notes

- **Single `index.html`** — all CSS/JS inline, no build step, no framework
- **Firebase Web SDK** via ESM CDN — called directly from browser, no proxy APIs
- **vCard 3.0** generated client-side — both single-contact and bulk multi-contact
- **QR codes** via vendored `qrcode-generator` library
- **PWA** — installable, offline-capable
- **`vercel.json` rewrites** — all routes serve `index.html` (SPA pattern)

---

## License

MIT — use it, fork it, sell it.
