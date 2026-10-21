# Contributing

Contributions that improve extraction quality, accessibility, performance, security, documentation, or test coverage are welcome.

## Development

1. Use Node.js 20.9+ (Node 22 recommended).
2. Copy `.env.example` to `.env.local` and keep real credentials out of Git.
3. Run `npm install`, `npx playwright install chromium`, then `npm run dev`.
4. Before submitting, run `npm run verify:source`, `npm run check:links`, `npm run typecheck`, and `npm run lint`.
5. Run `npm run build` and test URL analysis, screenshot-only mode, export, keyboard navigation, reduced-motion, light/dark themes, consent rejection/acceptance, and a narrow viewport.

## Pull requests

- Explain the user problem and observable outcome.
- Include reproduction steps and screenshots for visual changes.
- Add regression tests where practical.
- Do not add CAPTCHA bypass, credential collection, private-network access, or scraping behavior that ignores a site's access policy.
- Never commit keys, private URLs, downloaded source sites, or user-generated reports.
