# Punch Logic Home Acceptance — New Project Setup

This app is intentionally separate from the existing Punch Logic apps.

## 1. Create a new Supabase project

1. Create a blank Supabase project for Home Acceptance.
2. Apply the SQL files in `supabase/migrations` in filename order.
3. Create the first administrator by following `supabase/README.md`.
4. In Supabase Project Settings → API, copy the project URL and publishable key.
5. Put only those new-project values in `supabase-config.js`.

Do not copy the URL or key from an existing Punch Logic project.

## 2. Create a new Netlify project

1. Create a new Netlify site whose base directory is `homeowner-starter`.
2. Use `.` as the publish directory. No build command is required.
3. Add the server-side environment values described in `SECURITY-SETUP.md`, using credentials from the new Supabase project only.
4. Deploy the site.
5. Add the final Netlify URL to the new Supabase project's allowed redirect URLs.

## 3. Verify separation

- The Netlify site is linked to its own site ID.
- `supabase-config.js` names only the new Supabase project.
- Netlify environment variables name only the new Supabase project.
- A test home created here does not appear in any existing Punch Logic app.
