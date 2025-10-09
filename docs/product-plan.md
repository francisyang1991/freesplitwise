# FreeSplitwise Product Plan

## Vision
Empower small groups to split and settle shared expenses without subscriptions by providing a simple, transparent, and automation-driven web experience.

## Success Metrics
- Users can create an account via Google OAuth and land in their personal workspace within 5 seconds.
- Groups can add expenses with multiple payers and custom weightings in under 30 seconds.
- Debt simplification reduces the number of settlements by at least 50% compared to the naive approach.
- MVP launch collects feedback from at least 20 unique users within the first month.

## Personas & Needs
- **Social Organiser (Sonia):** Manages shared trips; wants quick setup and intuitive tracking.
- **Budget-Conscious Roommate (Rahul):** Shares household expenses; needs transparency and fairness.
- **Occasional Participant (Mina):** Rarely adds expenses; relies on reminders and clarity on what is owed.

## Core User Stories
1. As a user, I can sign in with Google so that I do not need to manage another password.
2. As a user, I can create and manage multiple groups to track different sets of shared expenses.
3. As a group member, I can add an expense where multiple people contribute to the payment.
4. As a group member, I can specify custom weightings for each participant per expense.
5. As a group member, I can view individual and net balances with simplified settlement suggestions.
6. As a group member, I can edit or delete expenses to correct mistakes.
7. As a group participant, I receive notifications or prompts when new expenses or settlements occur. *(post-MVP)*

## Functional Scope (MVP)
- **Authentication:** Google OAuth 2.0 sign-in only at launch for simplicity and security; evaluate additional providers post-MVP.
- **Group Management:** Create, edit, archive groups; invite participants via shareable link; role-based permissions (owner vs. member).
- **Expense Entry:** Support multiple payers, weighted shares, attachments (receipts), tagging.
- **Debt Simplification:** Graph-based algorithm to minimize settlement transactions; show suggested payments.
- **Activity Feed:** Timeline of expense additions, edits, settlements.
- **Settings & Preferences:** Currency selection, default share weighting mode, notification preferences including weekly reminder cadence.

## Non-Functional Requirements
- **Security:** OAuth best practices, encrypted secrets, least-privilege data access.
- **Performance:** Responsive, mobile-friendly UI; API endpoints respond within 300ms under normal load.
- **Scalability:** Architecture supports future mobile clients; database structured for multi-tenancy.
- **Reliability:** Automated tests for core flows; instrumentation for error tracking.

## Release Milestones
1. **M0 – Documentation & Planning (current):** Finalize scope, architecture, and roadmap.
2. **M1 – Foundations:** Scaffold frontend and backend, configure OAuth, set up database schema.
3. **M2 – Core Expenses:** Implement group management, expense entry with multi-payer + weighting logic.
4. **M3 – Debt Simplification:** Build and expose settlement algorithm with UI visualization.
5. **M4 – Polish & Launch:** Validation, testing, UI refinement, deployment automation.

## Decisions (2025-10-07)
- **Auth scope:** Stick with Google OAuth only for MVP to reduce complexity and leverage Google’s hardened security posture; queue other providers for a later milestone.
- **Reminder cadence:** Send weekly reminders for pending settlements (week 1, week 2, week 3, etc.) with user-configurable opt-out in settings.
- **Responsiveness:** Deliver mobile-friendly layouts as part of the MVP to ensure usability on phones during trips.
