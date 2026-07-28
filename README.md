# Punch Logic Starter

This is a clean starter copy of the Punch Logic app. The original source app folder was left untouched.

## What Is Included

- Main app: `index.html`, `styles.css`, `app.js`
- Report pages: `home-report.html`, `trade-report.html`, `all-trade-report.html`
- Report scripts and print styles
- Starter data files for sites, site info, and contacts
- Supabase Auth for email/password login
- Netlify functions for photos and shared reports
- Local no-cache server: `server.js`

## Start Locally

Run the lightweight local preview:

```powershell
npm run preview
```

If PowerShell says running scripts are disabled, use the Windows launcher instead:

```text
start-preview.bat
```

Then open:

```text
http://127.0.0.1:4173
```

For Netlify function testing, use:

```powershell
npm install
npm start
```

## Login

The app uses Supabase email/password login. Create users in Supabase under:

```text
Authentication -> Users
```

The browser config lives in:

```text
supabase-config.js
```

For deployed report and photo functions, add these Netlify environment variables:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Only the URL and publishable key belong in `supabase-config.js`. Keep `SUPABASE_SERVICE_ROLE_KEY` in Netlify environment variables only. The old Netlify username/password endpoints and their `APP_USERNAME`, `APP_PASSWORD_HASH`, and `SESSION_SECRET` variables have been removed.

Before production launch, complete `SECURITY-SETUP.md`.

## Rename Checklist

- Update the app title in `index.html`
- Update default project/site starter data in `app.js` and `homesites-data.js`
- Keep visible wording as Project, Site, Location, and Trade unless the new project needs different terms
- If deploying separately, create a new Netlify site instead of linking this folder to an existing Punch Logic deployment
