# SplitNinja

SplitNinja is an open-source web application that helps friends and groups split expenses fairly without subscription fees. The project now has an early Next.js application scaffold plus Google OAuth wiring in progress; additional context lives in `docs/`.

## Project Snapshot
- **Status:** Slice 5 (polish & docs) in progress
- **Primary goals:** Google-based login, group expense tracking, smart debt simplification, support for multi-payer expenses, and flexible share weighting.
- **Tech stack (current):** Next.js 15 + React 19 + TypeScript, Tailwind CSS, Prisma ORM, SQLite (dev) / PostgreSQL (prod target), NextAuth with Google OAuth.

## Documentation
- `docs/product-plan.md` — product vision, user stories, and functional scope
- `docs/architecture-overview.md` — proposed system architecture and technology choices
- `docs/changelog.md` — running record of major decisions and code changes
- `docs/implementation-plan.md` — slice-by-slice roadmap toward the demo
- `docs/rollout-plan.md` — staging/production rollout strategy and checklist
- `docs/deployment-checklist.md` — repeatable preflight for production deploys

## Local Development
1. Copy `.env.example` to `.env` and populate Google OAuth credentials plus a strong `NEXTAUTH_SECRET`.
   - Add your Google account email to `ADMIN_EMAILS` so you can toggle admin-only tools in the UI.
   - Set `NEXT_PUBLIC_APP_URL` (and optional `APP_DEV_URL` / `APP_PROD_URL` / `APP_STAGING_URL`) so invite links and sharing features resolve correctly. The repo defaults to `http://localhost:3000` for local dev, `https://freesplitwise.vercel.app` for staging, and falls back to `https://splitninja.space` in production if no overrides are provided.
2. Install dependencies with `npm install`.
3. Push the Prisma schema to the dev database with `npm run db:push` (uses SQLite by default).
4. Start the development server via `npm run dev` and visit `http://localhost:3000`.
5. Use `npm run db:studio` to inspect or manually edit the local database when debugging.

### Admin-only Debug Helpers
- When signed in with an email listed in `ADMIN_EMAILS`, you can add placeholder members directly from a group page.
- Leave the email blank in the add-member form to auto-generate a unique placeholder address for quick testing.

## Status Notes
- Slice 0 foundations: ✅ Next.js app scaffold, Tailwind 4, Prisma schema, scripts.
- Slice 1 authentication: ✅ Google OAuth working locally with protected dashboard.
- Slice 2 groups: ✅ Authenticated group creation, listing, and detail pages.
- Slice 3 expenses: ✅ Multi-payer, weighted-share expense entry and history per group.
- Slice 4 settlements: ✅ Ledger math, settlement API, and copyable payment suggestions.
- Slice 5 polish & docs: ⚙️ Responsive audit, error messaging, admin tools, and deployment prep.
- Admin helpers: ✅ One-click seeding of 5 dummy members for rapid QA.
- Expense UX: ✅ Edit existing expenses, see per-person balance summaries, and jump straight to Venmo with suggested settlement actions.

## Demo Workflow
1. `npm run dev` and visit `http://localhost:3000`.
2. Sign in with Google and land on the dashboard.
3. Create a group and click through to its detail page.
4. Add expenses by entering the total, who paid, and custom weightings per member.
5. Review the expense history and settlement suggestions, then copy the payment summary for the group.

## Production Prep
- Configure a managed PostgreSQL instance (e.g., Supabase, Neon, Railway) and set `DATABASE_URL` accordingly.
- Run `npm run db:migrate` locally to generate Prisma migrations, then apply them in production with `npm run db:deploy`.
- Set the production environment variables (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, Google OAuth keys, `ADMIN_EMAILS`, `DATABASE_URL`) in your hosting platform.
- Plan to host the Next.js app on Vercel (or another platform) and point it at the production database before opening access.
