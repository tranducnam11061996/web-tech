# Production Ready Checklist

This is a preparation checklist only. Do not deploy until every relevant local stability item has passed.

## Access and secrets

- Rotate all database, SMTP, NextAuth, and third-party credentials that have ever appeared in source control or screenshots.
- Use production-only environment variables managed outside Git. Confirm `.env` and `.env.local` are ignored.
- Add real authentication, authorization, and audit logging for every admin write route before exposing `web-admin` publicly.
- Replace permissive CORS with an explicit storefront origin list, and add rate limits for public search, cart quote, and order APIs.

## Database and application

- Back up the database and practice restoring it to a separate environment.
- Apply and validate application-owned indexes with an online-safe migration process appropriate for the production MySQL version.
- Add monitoring for API latency, 4xx/5xx rates, MySQL slow queries, connection-pool usage, disk, memory, and backup success.
- Move in-memory response/search caches to shared infrastructure before horizontally scaling beyond one application process.

## Release gate

- Build both applications from a clean dependency install and run the local healthcheck against a staging-like environment.
- Run load testing with representative catalogue/search traffic and checkout safeguards before opening the site to users.
- Set a rollback owner, rollback command, and release verification checklist before each production release.
