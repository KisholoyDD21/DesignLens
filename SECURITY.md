# Security Policy

## Supported versions

Security fixes are applied to the current default branch. Self-hosters should keep dependencies patched and redeploy promptly.

## Reporting a vulnerability

Please do not open a public issue for a suspected exploitable vulnerability. Use GitHub's **Report a vulnerability** / private Security Advisory workflow for this repository. Include affected version or commit, reproduction steps, expected impact, and any mitigations. Do not include real credentials, personal data, or third-party secrets.

## Deployment guidance

- Keep `OPENAI_API_KEY` and other provider credentials in server-side environment variables only. Never prefix secrets with `NEXT_PUBLIC_`.
- Set `SITE_URL` to the production HTTPS origin and ensure the reverse proxy overwrites `x-forwarded-proto`.
- Apply network egress controls to the scraping worker; application SSRF checks alone are not a complete network boundary.
- Replace process-local rate limiting with a shared store and a trusted client IP identity for multi-instance deployments.
- Review legal operator/contact details and analytics consent before public launch.
