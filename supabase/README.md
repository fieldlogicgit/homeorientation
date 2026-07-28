# Supabase Setup

This folder is the starting point for moving Punch Logic from one shared Netlify login/storage model to a multi-user Supabase model.

## Create Project

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run `migrations/001_field_drive_schema.sql`.
4. In Authentication, create users with email/password.
5. Insert an organization and profile rows for those users, or create the first admin through the deployed admin app flow.

Do not run files from `templates` as migrations unless every placeholder has been replaced. Supabase runs files in `migrations`; template files are only references.

## Frontend Keys

The browser app will need:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

The public key is safe to use in browser code when Row Level Security is enabled.

## Access Model

- `admin` and `manager` can manage all sites, users, contacts, and settings in their organization.
- `site_user` and `trade_user` can only read/update sites they are assigned to through `user_site_access`.
- `sites.fields` stores spreadsheet columns as flexible JSON so future column names can change.

## Next Implementation Step

Wire `index.html` to Supabase Auth, then replace local/Netlify state reads with table calls:

- `sites`
- `punch_items`
- `contacts`
- `location_settings`
- `trade_settings`
- `item_settings`

Then build `admin.html` as the fullscreen companion app for managing users, sites, contacts, and open items.
