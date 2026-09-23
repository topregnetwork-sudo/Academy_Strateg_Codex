# Academy Core — Vercel staging API

This is an intentionally isolated staging service. It never reads Google
Sheets, calls n8n, or sends Telegram messages. Until its environment is
configured, the business-test ingress rejects requests safely.

Required server-side environment variable names:

- `DATABASE_URL` — Neon pooled connection string, staging project only.
- `BUSINESS_TEST_WEBHOOK_SECRET` — introduced only when the test platform
  provides a signed webhook contract.

## Project Control owner access

The Project Control panel at `/` uses Vercel's OAuth / OpenID Connect identity
provider. It is deliberately locked until all five server-side variables below
are configured in the `academy-core-staging` project:

- `VERCEL_APP_CLIENT_ID` and `VERCEL_APP_CLIENT_SECRET` — issued by the Vercel
  Integration Console for this panel only.
- `CONTROL_OWNER_EMAIL` — the one Vercel account allowed to create or change
  task metadata.
- `CONTROL_SESSION_SECRET` — random server-side value used to sign the short
  owner session cookie.
- `CONTROL_APP_ORIGIN` — canonical staging origin. It must match the callback
  URL registered in the Vercel Integration Console.

The callback URL is `${CONTROL_APP_ORIGIN}/api/auth/callback`; for this
staging project it is `https://academy-core-staging.vercel.app/api/auth/callback`.
No OAuth access token, refresh token, personal data, applicant record, Telegram
data, payment data or credential is written to Neon. The panel stores only
project/task metadata and immutable task revisions.

No value belongs in this repository or in a `NEXT_PUBLIC_*` variable.
