# DuoPlan — Our Daily Planner

DuoPlan is a responsive shared productivity workspace for User 1 and User 2. It combines daily tasks, flexible planning dates, a dedicated Study Room, habit tracking, activity history, progress charts, theme preferences, with a local-only workspace mode. Login and registration screens have been removed in this version.

## What is included

- Dashboard with today’s overview, duo progress, upcoming tasks, motivation, and quick actions.
- My Tasks and Duo Tasks with search, filters, priorities, categories, assignees, due dates, edit/delete confirmation, and completion checkboxes.
- Calendar view with real dates and a seven-day planning window. Existing records remain attached to their actual dates.
- Study Room with study sessions, planned vs actual time, completion tracking, shared goals, and a Pomodoro timer that keeps running while navigating between views.
- Habit tracker with individual/duo assignments, daily check-ins, and activity history.
- Progress & Analytics charts based on task and study data. Empty date ranges are treated as 0% rather than producing invalid values.
- Activity Feed and in-app notification drawer.
- Light/dark mode, mobile navigation, keyboard-accessible labels, loading states, empty states, and responsive cards.
- Login and registration screens removed; the planner opens directly to the dashboard.
- User 1 / User 2 profile switching for local use.
- Local browser persistence only; it is not cross-device synchronization.

## Requirements

- Node.js 20+ (verified locally with Node 24.20.0)
- npm
- A Supabase project only if you later choose to restore authenticated cross-device synchronization

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

The app opens directly without login or registration. Tasks, study sessions, habits, theme preferences, and the selected user profile persist in this browser using localStorage. This is suitable for local use on one browser only; it does not provide secure multi-user authentication or cross-device sharing.

## Configure Supabase

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill in `VITE_SUPABASE_URL` and the public `VITE_SUPABASE_ANON_KEY` from Supabase Project Settings → API.
4. Apply all migrations in `supabase/migrations/` in filename order in the Supabase SQL Editor, or with the Supabase CLI:

   ```bash
   supabase db push
   ```

5. In Supabase Auth, configure the site URL and redirect URLs for your local and deployed app (for example `http://localhost:5173`).
6. Create the first account through DuoPlan. The database trigger creates the profile and default settings row.
7. Create a workspace and invite the second authenticated account from Settings. The invitation RPC validates the recipient email, assigns the account to User 2, and the latest migration limits workspaces to two member slots. For a production onboarding flow, keep invitation creation and acceptance server-validated; never put a service-role key in frontend code.
8. Make sure Realtime is enabled for `tasks`, `study_sessions`, and `activity_logs`. The migration adds these tables to `supabase_realtime`.

### Workspace membership

The migrations intentionally protect every workspace table with RLS. A user can only read or change records belonging to a workspace where their Auth user id appears in `workspace_members`. Task and study records are creator-managed; completion rows can only be changed by the authenticated user assigned to that record. The database validates that assignments point to the User 1/User 2 member slots. Do not make the workspace public and do not use the local profile switch as authentication. The local profile switch exists only for offline UI exploration.

The current frontend reads the first workspace membership available to the signed-in user. If a product needs multiple workspaces per account, add a workspace picker and persist the selected workspace id as a user preference.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

The `lint` script currently runs the strict TypeScript project check because this empty project does not yet include an ESLint configuration. `npm test` runs Vitest; the project includes a small pure-function test suite in `src/lib/date.test.ts`.

## Deploy

Build the static app with `npm run build`, then deploy the `dist` folder to Vercel, Netlify, Cloudflare Pages, or another static host. Add the two `VITE_SUPABASE_*` variables in the host’s environment settings and add the deployed URL to Supabase Auth redirect URLs.

For a production invitation flow, deploy a small Supabase Edge Function or trusted server route that creates expiring invitation records and adds the accepting user to `workspace_members`. The frontend never needs a service-role credential.

## Timezone

Date formatting and local-day calculations use `Asia/Kolkata`, as requested. Database timestamps remain UTC (`timestamptz`) and are rendered in the application timezone.
