# Next Stage Roadmap

## Summary of Current Build
- **Auth & Roles:** Google OAuth via NextAuth with admin/owner permissions, Supabase PostgreSQL backend.
- **Groups:** Dashboard list with modal creation, settings drawer (invite link, add members, dummy seeding, leave/delete).
- **Expenses:** Modal form with tabbed split options (equal vs weighted), multi-payer support, recent participant chips.
- **Settlements:** Balance overview + Venmo action buttons.
- **Deployment:** Prisma migrations, Supabase setup, deployment checklist & rollout plan.

## Lessons Learned
1. **Modal-first workflows** improve clarity: users focus on lists by default and opt into creation flows.
2. **Role-aware APIs** must respond with JSON-friendly errors; Session leakage surfaced when Supabase creds were wrong.
3. **Split logic** benefits from normalized helpers that decouple parsing (shared between create/update).
4. **Admin utilities** (dummy seeding, invite links) accelerate QA and reduce friction; owners often need these powers too.
5. **Config management**: mirroring values like `NEXT_PUBLIC_APP_URL` locally vs production prevents broken invite links.

## Stage 2 Development Goals
### 1. Expense View & Interaction Polish (Top Priority)
- Break out summary list vs. detail drawer for expenses.
- Show per-person balance (“You owe” / “You lent”) inline.
- Support multi-payer display + quick edit actions from detail view.
- Refine split tabs (equal/weighted) with future tab placeholders.
- Add quick filters/search on expense history.

### 2. Onboarding & Sharing
- Create `/invite/[token]` route: decodes invite, prompts Google sign-in, auto-joins group.
- Generate signed invite links with expiry, optional email share.

### 3. Notifications & Activity (Stage 3)
- Schedule reminders (email/push) for unsettled balances.
- Add activity feed: expense edits, member joins/leaves, settlements recorded.

### 4. Settlement Enhancements (Stage 3+)
- Manual “mark as settled” flow, record payments, and historical ledger.
- Export balances/expenses to CSV/PDF.

### 5. Mobile & UI Polish
- Optimize modal layouts for small screens (bottom sheet on mobile).
- Provide avatar support (upload or generated gradients) for clearer member identity.
- Dark mode adjustments for new components.

### 6. Quality & Observability
- Add unit/integration tests (React Testing Library, Playwright smoke tests).
- Integrate Sentry/Logflare for runtime monitoring.
- Enhance API validation with Zod or TypeScript-driven schemas.

### 7. Future Split Options
- Expand tabs: percentage split, shares by exact amounts, advanced adjustments.
- Persist default split preference per group.

## Immediate Next Steps
1. Implement expense summary/detail split with multi-payer support.
2. Build invite route + token issuance API.
3. Refine mobile layouts for expense and settings modals.
4. Add tests for new modal flows and API permission checks.
