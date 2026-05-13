# Where Images Come From & Where They Are Stored

## Current setup (development & production)

- **Source:** Images are loaded from **Unsplash** (external CDN) via direct URLs in the code.
- **Storage:** They are **not stored in your project**. The frontend requests them at runtime from:
  - `https://images.unsplash.com/photo-...` (Unsplash’s CDN)

## Where each image is used

| Page / Section   | Purpose        | URL (in code) |
|------------------|----------------|----------------|
| Landing – Hero   | Background     | `photo-1461749280684-dccba630e2f6` (code on screen) |
| Landing – “Three ways” | Decorative  | `photo-1522071820081-009f0129c71c` (collaboration) |
| Landing – CTA    | Background     | `photo-1498050108023-c5249f4df085` (laptop workspace) |
| Login – Left panel | Background   | `photo-1555066931-4365d14bab8c` (coding) |
| Register – Left panel | Background | `photo-1517694712202-14dd9538aa97` (coding) |

Files to search in: `frontend/src/pages/Landing.jsx`, `Login.jsx`, `Register.jsx`.

## Optional: store images in the project (for offline / no external deps)

To **store** images in the repo and stop using Unsplash:

1. Create folder: `frontend/public/images/`
2. Add your own image files, e.g.:
   - `hero.jpg`
   - `collaboration.jpg`
   - `cta.jpg`
   - `login-bg.jpg`
   - `register-bg.jpg`
3. In the code, replace each Unsplash URL with:
   - `/images/hero.jpg`
   - `/images/collaboration.jpg`
   - etc.

Example for the hero on the landing page:

```jsx
// Before (Unsplash)
src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80"

// After (local, stored in project)
src="/images/hero.jpg"
```

**Summary:** Right now images **come from** Unsplash and are **not stored** in the project. To store them, put files in `frontend/public/images/` and switch the `src` values as above.
