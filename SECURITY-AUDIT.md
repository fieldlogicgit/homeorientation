# Punch Logic Security Audit

Audit date: 2026-07-22

## Scope

- Field App and admin dashboard authentication and browser storage
- Netlify Functions authorization, report links, uploads, and rate limiting
- Supabase multi-organization RLS, helper functions, RPCs, and Storage policies
- Browser security headers, third-party scripts, secret exposure, and regression tests
- Client updater coverage for newly added security files

## Remediated Findings

### High: Cross-organization admin access

The original permissive admin policies checked only whether the current user was an admin. They did not consistently require the target row to belong to that admin's organization. Migration `022_multitenant_security_hardening.sql` now:

- Binds project and site access helpers to the current organization before evaluating role or assignment.
- Replaces broad profile, project, site, assignment, settings, contact, item, and photo policies with organization-scoped policies.
- Validates both sides of project/site user assignments.
- Verifies crew-specific item settings reference a crew in the same organization.
- Restricts helper function execution to authenticated users and the service role.
- Recreates private item-photo Storage policies for authenticated, assigned users only.

### High: Private photos readable by path

The photo proxy previously used the Supabase service role for any GET request containing a Storage path. It also allowed one-year browser caching. It now:

- Rejects path-only anonymous requests.
- Rechecks signed-in users through Supabase item RLS.
- Validates public report tokens, organization, site, crew, and allowed-site scope.
- Uses short-lived signed Storage URLs in the Field App and dashboard.
- Returns `Cache-Control: private, no-store` from the proxy.
- Verifies item access before accepting a signed-in photo upload.

### High: Report scope expansion

All-sites reports previously refreshed through the service role without retaining the creator's assigned-site scope. Report update tokens also did not recheck that an item belonged to the report. Reports now:

- Validate every requested site through the creator's Supabase session and RLS.
- Persist the report's allowed site IDs.
- Restrict live refreshes, photo reads, notes, completion changes, and uploads to that scope and crew.
- Allow report revocation only by an admin or the report creator.
- Refuse a missing all-sites report instead of rebuilding an organization-wide result from a token alone.

### High: Organization-wide legacy state exposed to field users

The legacy app-state function could return an entire organization's fallback snapshot to any active member. It is now admin-only, same-origin, rate limited, no-store, JSON validated, and limited to 2 MB.

### Medium: Stored HTML injection

A user-controlled crew name was inserted with `innerHTML` in the report-email form. It now uses `textContent`.

### Medium: Mutable browser dependencies

Supabase was loaded from a floating major version and Lucide from `latest`. External scripts are now pinned to exact versions and protected with SHA-384 Subresource Integrity. The QR generator is bundled locally; the prior QR CDN URL returned HTTP 404.

### Low: Local Supabase metadata

`supabase/.temp/` is now ignored in the core starter. No service-role key or database password was found in browser files. Service-role access remains limited to Netlify environment variables.

### Medium: Privileged functions exposed as RPCs

Supabase Security Advisor reported nine `SECURITY DEFINER` functions in the exposed `public` schema. Migration `023_security_definer_api_isolation.sql` now:

- Moves the privileged implementations into a non-exposed `private` schema.
- Leaves security-invoker wrappers at the existing public RPC names so Field App, dashboard, RLS, and offline-sync behavior remains compatible.
- Revokes anonymous execution from both private implementations and public wrappers.
- Grants only authenticated users and the service role the minimum execution permissions required by the application.

### Informational: RLS enabled without policies

Security Advisor reported `report_access_tokens`, `server_rate_limits`, `server_state`, and `sync_mutations` because they intentionally had RLS enabled with no browser policies. Their browser table privileges were already revoked, so this represented deny-by-default behavior rather than exposed data. Migration `024_server_only_table_policies.sql` adds explicit deny-all policies for `anon` and `authenticated`; service-role Netlify functions and controlled sync RPCs remain unchanged.

### Performance Advisor remediation

Migration `025_performance_advisor_remediation.sql` addresses every actionable Performance Advisor result without changing application permissions:

- Adds 15 covering indexes for reported foreign keys.
- Wraps the three reported `auth.uid()` policy calls in scalar selects so PostgreSQL can use initialization plans.
- Replaces eight overlapping permissive `FOR ALL` management policies with equivalent INSERT, UPDATE, and DELETE policies, leaving one SELECT policy per table.
- Retains the three reported unused indexes until representative production traffic exists; new databases do not have meaningful usage history yet.
- Leaves Auth connection allocation as a Supabase dashboard setting rather than a SQL migration.

## Verification Completed

- JavaScript syntax checks passed for all changed app, report, and Netlify Function files.
- Security and offline-sync regression tests passed.
- Production dependency audit: `npm audit --omit=dev` reported zero vulnerabilities.
- Migration `022` passed the Setup Utility dry-run safety scan.
- Migration `022` was executed against development inside a transaction and fully rolled back; PostgreSQL accepted every function and policy statement.
- Migrations `023` and `024` are installed in development and production.
- Migration `025` passed the Setup Utility safety scan, focused regression tests, and a rollback-only PostgreSQL validation against development.
- Migration `025` produced all 15 expected indexes, zero overlapping `FOR ALL` policies, three cached Auth checks, and one SELECT policy on each affected table; development remained unchanged after rollback.
- Client updater dry run for `dev2` includes `_authorization.js`, `vendor/qrcode.js`, and every changed shared file.
- Local preview returned HTTP 200 for the Field App, dashboard, all report pages, and the local QR bundle.
- Browser smoke tests loaded the Field App and dashboard with no console warnings or errors.

## Deployment Gate

Migrations `022` through `024` are installed in development and production. Migration `025` is ready but has not been pushed. Use this order:

1. In Setup Utility, run **SB Push to Dev**.
2. Run **Dev Client Update** and test admin plus foreman accounts.
3. Verify login/session checks, settings edits, assignment changes, photo uploads, and offline item/document edits.
4. Run **SB Promote Prod**.
5. Run **Update Clients**.

No client-code deployment is required solely for migrations `023` through `025`.

## Remaining Operational Controls

- MFA remains disabled by product decision. Enable it for company admins before handling sensitive customer data.
- Report credentials remain in share URLs and expire after 90 days. Treat them like private links and revoke them when no longer needed.
- Enable Supabase Auth leaked-password protection. This is a dashboard Auth setting and is not controlled by a SQL migration; the app currently enforces a minimum of eight characters.
- Run the two-organization access test after every RLS migration. Static tests cannot replace a deployed test using real users from separate organizations.
- The Netlify CLI is a development-only dependency and has transitive audit findings; it is not shipped to browsers or Functions. Schedule a separate CLI upgrade test before changing its major version.
- The older UI regression files are not yet a clean all-tests suite: several contain stale asset-version/style expectations, and `notifications.test.cjs` has an isolated test-harness dependency error. The focused security/offline suite is green; clean up those older tests before using the full folder as a release gate.
