# Punch Logic Production Security Setup

## Required migrations

Push these to development Supabase first, test them, and then promote them with the setup utility:

- `014_auth_access_controls.sql`
- `015_report_access_tokens.sql`
- `016_upload_security.sql`

## Supabase Auth

1. In Authentication > URL Configuration, set the Site URL to the client Netlify URL.
2. Add the client root URL and `admin.html` URL to Redirect URLs. Password reset emails return to the page where the request started.
3. Configure custom SMTP before production. Supabase's trial sender is best-effort and limited to two emails per hour.
4. In Authentication > Rate Limits, keep the password-reset per-user cooldown at 60 seconds or longer. Review the project-wide email limit after SMTP is configured.
5. Keep email/password authentication enabled. Do not re-enable the retired Netlify password functions.

Supabase references:

- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/rate-limits

## Netlify secrets

Set these separately on every client Netlify site:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ORGANIZATION_ID
```

Never put the service-role key in `supabase-config.js`, GitHub, browser code, or support logs.

## Report links

- New report links contain 256-bit access tokens.
- View-only and editable links use different tokens.
- Links expire after 90 days.
- Existing legacy links receive a 14-day transition window after the updated app refreshes the report.
- Report reads are limited to 120 requests per minute per client address.
- Report updates are limited to 30 requests per minute; completion photo uploads are limited to 10.

Use the eye button to copy a view-only link. Use regenerate or revoke when a link was sent to the wrong person.

## Uploads

- Site documents: PDF, DOCX, XLSX, CSV, JPG, PNG, or WebP; 25 MB maximum.
- Stored item and completion photos: JPG, PNG, or WebP; 5 MB maximum.
- The browser checks file signatures before upload, Supabase enforces bucket type and size restrictions, and Netlify verifies report/photo bytes again.
- Both storage buckets remain private and organization-scoped through RLS.

For high-risk customers, add commercial malware scanning before accepting arbitrary Office documents from outside their company.
