# Deployment Checklist

Use this checklist each time you publish an update to production.

## Preflight Tests
- `npm run lint`
- `npm run build`
- Manual QA: sign in → create group → seed dummy members → add & edit expenses → verify balance overview and Venmo links.
- Confirm Supabase connection (`npm run db:push` should noop).

## Database
- Generate migrations locally: `npm run db:migrate -- --name <change>`.
- Review `prisma/migrations/<timestamp>_<change>/migration.sql` into git.
- Apply in production: `npm run db:deploy` (or `npx prisma migrate deploy`).
- Check Supabase dashboard → confirm tables updated and backups enabled.

## Secrets & Config
- Update hosting platform env vars: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `ADMIN_EMAILS`.
- For staging (`freesplitwise.vercel.app`), use staging credentials and a separate Supabase database/schema.
- For preview environments, use staging credentials and a separate Supabase database/schema.
- Set `APP_STAGING_URL=https://freesplitwise.vercel.app` for staging deployments.

## Build & Release
- Trigger Vercel (or chosen host) deploy from main branch.
- Watch deployment logs for Next.js build success.
- Post-deploy smoke test: open production URL, walk through core flows, confirm balances and settlements render.

## Post-Release
- Monitor Supabase metrics and application logs for 24h.
- Triage new feedback, log issues, and schedule next iteration cycle.
