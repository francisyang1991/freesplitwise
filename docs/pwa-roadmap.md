# Progressive Web App Upgrade Plan

## Why PWA support matters
- Installable surface on iOS/Android and desktop without separate native builds.
- Offline caching for read-only access to prior expenses and comments.
- Better repeat engagement via homescreen icons and push notifications (later phase).

## Current gaps
- No web app manifest (icons, display mode, start URL).
- No service worker or asset caching strategy.
- No HTTPS enforcement / protocol checks (required for PWA install prompts).
- No PWA linting (Lighthouse) or automated checks in CI.

## Implementation to-do list

### 1. Manifest & Icons
- [ ] Create `public/manifest.webmanifest` with name, short_name, start_url, display, theme_color, background_color.
- [ ] Generate favicons + app icons (512, 192, maskable). Add to `public/icons/` and reference in manifest.
- [ ] Link manifest in `src/app/layout.tsx` via `<link rel="manifest" href="/manifest.webmanifest" />` and include `<meta name="theme-color">`.

### 2. Service Worker & Caching
- [ ] Add a service worker build step (e.g., integrate `next-pwa` or custom `sw.ts`).
- [ ] Define caching strategy: precache app shell (layout, static assets) and runtime cache for API responses (expenses, groups) with stale-while-revalidate.
- [ ] Register SW on client (`useEffect` in `_app` equivalent) with graceful failure in non-browser environments.
- [ ] Provide an opt-out reload button when new versions are available (postMessage + UI toast).

### 3. Offline / fallback experience
- [ ] Create fallback page for offline mode (e.g., cached “You’re offline” with last synced data snapshot).
- [ ] Handle API fetch failures gracefully (surface cached data or offline badge).
- [ ] Consider background sync or deferred uploads for expense/comment creation (phase 2).

### 4. Metadata & SEO
- [ ] Ensure `manifest` fields align with marketing copy (description, categories).
- [ ] Add screenshots/banners for store listing in future (optional but recommended).

### 5. HTTPS & Security
- [ ] Confirm deployment targets enforce HTTPS (Vercel does by default). Redirect HTTP → HTTPS in Next config if self-hosting.
- [ ] Review service worker scope and restrict to `/` root.

### 6. Testing & Tooling
- [ ] Run Lighthouse PWA audit locally (`npm run lint:pwa` or `npx lighthouse http://localhost:3000 --view`). Track score > 90.
- [ ] Add automated check (GitHub Action) for manifest + SW presence.
- [ ] Test installability on Chrome, Edge, Safari (iOS 16.4+), Android Chrome.

### 7. Deployment checklist updates
- [ ] Document PWA steps in `docs/deployment-checklist.md` (ensure SW revalidation during deploy).
- [ ] Add instructions for version bumps / SW cache invalidation.

### 8. Nice-to-have post-MVP
- [ ] Push notifications (requires server + Web Push subscription management).
- [ ] Offline expense editing with sync queue.
- [ ] Background sync for comments/expenses processed when connection resumes.

## Dependencies & notes
- Prefer `next-pwa` for minimal configuration—works with Next 15/React 19.
- If ejecting from App Router, ensure `export const viewport` and meta are set for theme colors.
- Coordinate icon design with brand guidelines before generating final assets.
