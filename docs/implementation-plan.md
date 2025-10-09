# Implementation Plan – Option 1 (Vertical Slices)

## Goal
Ship a functional web demo by end of day featuring Google sign-in, basic group creation, expense entry with multi-payer support and weighted shares, and a first-pass debt simplification view.

## Guiding Principles
- Deliver end-to-end slices that users can click through.
- Keep scope tight; defer advanced polish until after demo works.
- Instrument decisions and changes in `docs/changelog.md`.

## Slice Breakdown

### Slice 0 – Project Foundations (1.5h)
**Status:** ✅ Completed (2025-10-07)
- Scaffold Next.js 14 app with TypeScript, Tailwind CSS, ESLint, Prettier.
- Configure absolute imports and shared UI primitives.
- Add Prisma + PostgreSQL schema boilerplate; run initial migration.
- Set up `.env.example`, project scripts (`dev`, `build`, `lint`, `db:push`).

### Slice 1 – Authentication (1.5h)
**Status:** ✅ Completed (Google sign-in verified end-to-end on localhost)
- Integrate NextAuth with Google OAuth provider.
- Build sign-in page + protected route guard.
- Persist user profiles in Postgres via Prisma adapter.
- Add basic header with user info and sign-out.

### Slice 2 – Groups (2h)
**Status:** ✅ Completed (dashboard group CRUD live)
- Design `Group` and `Membership` models with Prisma.
- Implement API routes for create/list groups (authenticated).
- Build dashboard view listing user groups; enable new group creation form.
- Seed demo data helper for quick local testing. *(deferred)*

### Slice 3 – Expenses (2.5h)
**Status:** ✅ Completed (multi-payer weighted expenses live)
- Extend schema for `Expense`, `ExpensePayer`, `ExpenseShare`.
- Implement API for creating expense with multi-payer inputs and weighted shares logic.
- Create form with dynamic payer inputs and participant weight controls.
- Display expense list per group with per-user balances.

### Slice 4 – Debt Simplification (2h)
**Status:** ✅ Completed (settlement engine + UI shipped)
- Implement service to compute net balances and reduce transfers via greedy settlement.
- Expose endpoint + UI widget showing suggested settlements.
- Add quick copy/share action for settlement summary.

### Slice 5 – Polish for Demo (1h)
**Status:** ✅ Completed (responsive tweaks, docs, and smoke checks)
- Ensure responsive layout (mobile-first) for dashboard and expense forms.
- Add loading/error states and minimal toasts.
- Smoke test flow: sign-in → create group → add expense → view settlements.
- Document demo instructions in README.
- Add admin-only tooling for quick QA (member creation, env scaffolding).

## Today’s Immediate Tasks
1. Complete Slice 0 foundations. ✅
2. Finish Slice 1 authentication. ✅
3. Ship Slice 2 group listing & creation. ✅
4. Finish Slice 3 expenses workflow. ✅
5. Finalize Slice 4 settlements & polish. ✅
6. Close out Slice 5 polish/doc updates. ✅

## Post-Demo Follow-Ups
- Harden data validation and access control.
- Add reminders/notifications and advanced debt heuristics.
- Expand provider options after feedback.
- Promote database provider to PostgreSQL and capture structured migrations for production.
- Design refreshed landing/dashboard layout to highlight group list with modal-first creation flow. ✅
- Introduce modular expense split engine with tabbed UI for equal, weighted, and (future) custom modes. ✅
- Add owner/admin tooling in group settings (invite link, add members, seed dummy data, leave/delete actions). ✅
- **Next**: build invite onboarding flow, notification system, mobile-first adjustments, and settlement export options.
