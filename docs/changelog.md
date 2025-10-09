# Changelog

## 2025-10-07
- Initialized FreeSplitwise repository documentation.
- Added product plan outlining vision, scope, and milestones.
- Documented architecture proposal covering frontend, backend, and infrastructure.
- Recorded decisions on auth scope, reminder cadence, and mobile responsiveness for MVP.
- Created Option 1 vertical-slice implementation plan targeting end-of-day demo.
- Completed Slice 0 foundations: Next.js scaffold, Tailwind, Prisma schema, scripts, and dev DB.
- Completed Slice 1 authentication: NextAuth with Google provider, session handling, UI, and successful local sign-in test.
- Completed Slice 2 groups: group APIs, dashboard creation form, and group detail page scaffolding.
- Completed Slice 3 expenses: expense APIs, weighted split form, and listing UI on group detail.
- Completed Slice 4 settlements: ledger calculation service, settlement API/refresh, UI summary with copy-to-clipboard.
- Completed Slice 5 polish: responsive tweaks, error handling refinement, README/demo docs, and build validation.
- Added user role support with admin-only member creation UI and API.
- Introduced deployment helpers (admin env var, Prisma migrate scripts) and documented production rollout plan.
- Added admin batch seeding for dummy members, expense editing workflow, balance overview UI, and Venmo payment shortcuts.
- Introduced modal-based group creation and expense entry workflows with split tabs and improved payer selection.
- Added group settings drawer featuring invite link copy, add-member toggle, dummy seeding, and leave/delete controls.
- Hardened dynamic routes to await params and broadened member management permissions to owners.
