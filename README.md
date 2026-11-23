# @neton/application-front-infra

Canonical front infra module (extracted from neton-application-front, same form as front-member).
Pages keyed by backend system_menus.component; assembled by a shell via front.modules.ts.

The file storage page edits typed Local/S3-compatible settings, references server-side credential environment variables, probes storage with POST, and supports safe primary selection. Deploy together with the matching module-infra and apply its V003 migration first. Unsupported legacy configurations are shown as needing repair, not silently treated as working providers.

Checks: `pnpm typecheck`, `pnpm test`. With the canonical front host's dependencies and Playwright browser installed, `pnpm test:browser` runs the real page headlessly against a disposable HTTP fixture (UI acceptance, not a real S3/backend test). The backend's `scripts/test-file-storage-postgres.sh` separately verifies real PostgreSQL and local-file routing/history/rollback.
