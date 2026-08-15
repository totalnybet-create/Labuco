# Agent Instructions

See [CLAUDE.md](./CLAUDE.md) for full project instructions and conventions.

## Spree-specific agent skills

For deeper Spree-specific guidance (API conventions, the data model, event system,
testing patterns, security, deployment, the 6.0 React dashboard, the Next.js
storefront, etc.), install the official skill set:

```bash
npx skills add spree/agent-skills
```

Works for Claude Code, Codex, Cursor, GitHub Copilot, Cline, Aider, Zed, Windsurf,
and 60+ other agentic CLIs. See https://github.com/spree/agent-skills for the
full skill list.

## LABUCO production operating rules

### Source of truth
- GitHub repository `totalnybet-create/Labuco` is the source of truth for application code.
- Do not make untracked production-only code changes in hosting dashboards.
- Keep backend, storefront, catalog tooling, CI, and deployment configuration versioned here.

### Required change flow
For every user-facing or commerce change:
1. Work on a branch / pull request.
2. Run repository build and automated tests.
3. Run `.github/workflows/labuco-visual-check.yml`.
4. Inspect generated mobile (390x910) and desktop (1440x1000) screenshots.
5. Verify homepage, product links/images, product price, add-to-cart, cart drawer, and guide page.
6. Fix regressions before merging.
7. Merge only a reviewed state to `main`.
8. Production deployment must originate from `main`.

A failed visual check must still preserve screenshots and logs. Never treat a green compiler/build result as proof that the storefront looks correct.

### Environments
- Local/CI: disposable Rails/Spree + PostgreSQL backend and Next.js storefront.
- Preview/staging: public preview tied to the branch/PR, used for real-browser inspection before merge.
- Production: stable public domain connected only to `main`.
- Never use production data or production payment keys in CI visual tests.

### Secrets and personal data
- No API secrets, passwords, webhook secrets, private keys, bank details, or credentials in Git.
- Hosting credentials belong in encrypted environment variables only.
- `.env.example` may contain names/placeholders, never real values.
- Treat the repository as public unless explicitly proven otherwise.

### Storefront release gate
Before production release verify at minimum:
- mobile and desktop layout, with no horizontal overflow;
- navigation and category links;
- product images load;
- prices match catalog source and currency is PLN;
- product page opens;
- add-to-cart works and cart displays the selected product;
- checkout entry point is functional for currently enabled payment methods;
- legal/contact/shipping/returns information is reachable;
- no placeholder, debug, dev-only, or unintended empty-state content is exposed.

### Google readiness gate
Before submitting production to Google Search / Merchant Center verify:
- production HTTPS domain and canonical URL are final;
- `/robots.txt` is crawlable and references production sitemap URLs;
- generated sitemap contains canonical indexable category/product/content URLs;
- account/cart/checkout/filter/sort duplicate URLs stay excluded from indexing;
- product pages expose valid Product/Offer structured data matching visible price and availability;
- every indexable product is reachable by normal `<a href>` navigation and/or sitemap/feed;
- product title, description, image, price, availability, shipping/returns and business/contact information are complete and consistent;
- Search Console ownership is verified and sitemap submitted;
- Merchant Center/feed is enabled only after the live site is fully functional.

### Deployment rule
If a hosting integration is missing, do not improvise another production host silently. Establish one stable preview + production deployment path first, then keep it as the standard path for all future LABUCO changes.
