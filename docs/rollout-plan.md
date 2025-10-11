# Rollout Plan

## Goal
Launch the SplitNinja web app to a small production cohort with reliable infrastructure, measured feedback loops, and a clear path to iterate.

## Environments
- **Local (dev):** SQLite, hot reload via `npm run dev`, debug helpers enabled for admin users.
- **Staging:** Mirror production stack (Next.js + PostgreSQL). Used for smoke tests, data migrations, and QA.
- **Production:** Managed hosting (e.g., Vercel) with managed PostgreSQL (Supabase/Neon/Railway) and hardened environment variables.

## Pre-Launch Checklist
1. **Database**
   - Provision PostgreSQL instance.
   - Set `DATABASE_URL` in the hosting platform.
   - Run `npm run db:migrate` locally to generate migrations; deploy with `npm run db:deploy` in staging/production.
   - Enable automated daily backups in the DB provider.
2. **Secrets & Auth**
   - Configure `NEXTAUTH_SECRET`, Google OAuth keys, and `ADMIN_EMAILS` in staging/production.
   - Restrict `ADMIN_EMAILS` to the core team.
3. **App Hosting**
   - Deploy to Vercel (or equivalent) connected to the main branch.
   - Configure preview deployments for pull requests.
4. **Observability**
   - Add error tracking (Sentry) and basic logging.
   - Configure uptime monitoring (e.g., Healthchecks.io, Vercel checks).
5. **QA Pass**
   - Execute full slice walkthrough: sign-in → group creation → member management → expenses → settlements.
   - Validate responsive design on mobile and desktop breakpoints.
   - Confirm admin debug tools are limited to authorized accounts.

## Launch Phases
- **Phase 0:** Internal dogfooding (team-only groups, synthetic data).
- **Phase 1:** Invite-only beta (≤20 users); monitor errors, collect feedback.
- **Phase 2:** Public beta (landing page open, no marketing push yet); refine onboarding, add notifications.
- **Phase 3:** General availability with comms, support docs, and analytics dashboards.

## Post-Launch Maintenance
- Establish weekly triage of user feedback and error logs.
- Schedule monthly dependency upgrades and security audits.
- Plan for follow-up features: notifications/reminders, mobile-first enhancements, settlement exports.
