# A Convex preview per PR, with a TestUser that production refuses

She co-designs from her phone, so every non-draft PR deploys its own Convex preview (`pr-<n>`), with static hosting and a seeded set of built-in Songs, and posts the link on the PR. End-to-end tests run against that preview on every PR. This follows Lonir's preview pipeline and its ADR-0048, but deploys every PR instead of only labelled ones, and tests per PR instead of nightly. Google forbids wildcard redirect URIs, so previews cannot use Google login. A `TestUser` credentials provider replaces it there: it is registered only when `OPENCHORDS_ALLOW_TEST_SIGNIN=1`, and the auth module throws at load if that flag is set on the production deployment.

## Consequences

- Static hosting uploads into a preview through Lonir's admin-credential swap, because the upload tool cannot target a preview by name. Revisit when `@convex-dev/static-hosting` accepts `--preview-name`.
- Previews expire after 5 days on the Free plan, and each one counts toward the deployment limit.
