# Daymark — Shared Friend Progress Dashboard

A React + TypeScript + Vite dashboard for Aaryan and Surbhi, with daily checklists, date filtering, per-person progress, task creation, Supabase Auth and PostgreSQL persistence.

## 1. Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vite. Without Supabase environment variables, the UI runs in preview mode with sample tasks; changes are local only and are not persisted across refreshes.

## 2. Configure Supabase securely

1. Create a project at https://supabase.com/dashboard.
2. In **SQL Editor**, run `supabase/schema.sql`.
3. In **Project Settings → API**, copy the Project URL and the publishable key (or legacy anon key) into `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

4. Start the app and create accounts for both people from the sign-up screen. Confirm emails if email confirmation is enabled.
5. In **Authentication → Users**, copy both user UUIDs. Run the final `INSERT` statement in `supabase/schema.sql` after replacing the two placeholders. This explicitly adds both people to the shared workspace. Until they are added, RLS denies task access.
6. Restart Vite after editing `.env.local`.

## Security notes

- The browser uses only the Supabase publishable/anon key; this key is designed for client apps when Row Level Security is enabled.
- **Never put the `service_role` / secret key in `VITE_*` variables or frontend code.**
- RLS is enabled for both tables. Tasks are readable/writable only by authenticated users explicitly listed in `workspace_members`.
- For production, enable email confirmation, use strong passwords, configure allowed redirect URLs, and consider restricting which member can edit/delete tasks or adding audit history.
- The UI labels each task as Aaryan or Surbhi; workspace membership is the access boundary. It is not identity proof that a person only edits their own named tasks.

## Build

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to Vercel, Netlify, or another static hosting provider after setting the same environment variables in the host dashboard.
