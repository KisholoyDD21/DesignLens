# Production Readiness Checklist

Use this checklist after setting the final domain and before opening the service to the public.

- [x] Privacy policy route (`/privacy`) and terms route (`/terms`) added as templates.
- [ ] Replace the legal-template warning with the operator's legal name, monitored contact address, and jurisdiction-specific language.
- [x] Provider API keys remain server-side (`OPENAI_API_KEY` / `LLM_BASE_URL`); the source scan looks for common leaked-key patterns.
- [x] HTTPS redirect middleware, permanent 301 redirects, canonical metadata, and HSTS/security headers added.
- [x] Cookie consent added; Google Analytics only loads after optional analytics consent.
- [x] Titles, descriptions, canonical links, Open Graph and Twitter metadata added.
- [x] Generated 1200×630 social share image and SVG favicon added.
- [x] Generated `/robots.txt` and `/sitemap.xml` added; temporary report paths are noindex/disallowed.
- [x] Current interface uses CSS/SVG illustrations rather than inline raster `<img>` elements; social metadata includes image alt text.
- [x] Analysis screenshots are resized and JPEG-compressed with Sharp.
- [ ] Run Lighthouse against the final production domain and attach reports to the release. No Lighthouse score is claimed by the source package.
- [x] Mobile styles cover the landing page, results workspace, legal pages, and consent banner.
- [x] A static internal-link and anchor checker is available (`npm run check:links`).
- [x] Optional Google Analytics GA4 pageviews and low-cardinality usage events can be enabled by setting the consent-gated measurement ID.
- [x] Primary CTA is the URL analysis action, repeated in the page's clear entry points.
- [x] GitHub issue template, contributing guide, MIT license, security policy, and CI workflow added.
- [x] Custom 404 page added.
- [x] Next.js App Router renders pages on the server; interactivity hydrates as client components.
- [x] Heavy share-card rendering (`html-to-image`) is dynamically imported only when the visitor requests a card. Existing visual graphics are CSS/SVG; screenshot capture is optional and compressed before use.
- [x] Permanent 301 redirects are configured for `/home`, `/index.html`, HTTP requests, and the `www` canonical host where applicable.
- [x] `/sitemap.xml` is generated from `app/sitemap.ts`.

## Must verify in the real deployment

1. Configure `SITE_URL` to the final **HTTPS** canonical origin.
2. Confirm the hosting proxy overwrites `x-forwarded-proto`; test HTTP→HTTPS and `www`→canonical redirects with status 301.
3. Review legal pages with accurate operator/contact details and legal advice appropriate to the business and user regions.
4. If analytics is used, configure `NEXT_PUBLIC_GA_MEASUREMENT_ID` and test that no analytics request occurs before opt-in or after opt-out.
5. Run `npm install`, `npx playwright install chromium`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run lighthouse` against representative desktop/mobile routes.
6. Apply network-level outbound restrictions to the analysis worker. Application-level SSRF filtering alone is not a complete security boundary.
