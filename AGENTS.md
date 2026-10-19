# Shopify app development

This app is scaffolded from a Shopify app template. See the README for framework-specific details.

Use the [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit) for all Shopify API and platform work. If missing, install it in the agent host per that page (or `npx skills add Shopify/shopify-ai-toolkit --list` for skill-compatible hosts) — do not add tooling to this repo.

## About this app

Order Tagger is a proof of concept that tags new orders automatically. A merchant creates rules, each with one condition and one tag (for example, order total > 100 → `high-value`). When an order is created, the app checks it against the shop's rules and adds the tags from every rule that matches.

Rule conditions in v1 use three order fields only: order total, product tag, and discount code used.

The work is planned in the [Order Tagger Roadmap](https://github.com/users/fayzandotcom/projects/2) project, split into three milestones and tracked as GitHub issues.

## Project rules

### Shopify API

- Use Admin API version **2026-10** everywhere: `apiVersion` in `app/shopify.server.ts` and `[webhooks] api_version` in both app configs must match. Change them together or not at all.
- Use the **GraphQL** Admin API only. Do not use the REST Admin API.
- Request the fewest access scopes the app needs, and declare them in the app configs.

### App configs

- There are two Shopify apps, each with its own config file:
  - `shopify.app.toml`: **production** (`order-tagger`, shown as "Order Tagger"). Used for `shopify app deploy` and the App Store.
  - `shopify.app.dev.toml`: **development** (`order-tagger-dev`, shown as "Order Tagger Dev"). Used by `npm run dev`.
- Never run `shopify app dev` against the production config. It repoints the production app at a local tunnel. `npm run dev` always passes `--config dev`.
- Keep scopes, webhook subscriptions and `api_version` the same in both files. Only `client_id`, `name` and URLs differ.

### Customer data

- Use order data only (totals, line items, product tags, discount codes). The app uses Level 1 protected customer data only, which excludes names, addresses, emails and phone numbers.
- Do not query, log or store customer personal data. Activity records keep the order ID, order name, tags added and matched rule only.

### UI

- Use Polaris web components (`<s-page>`, `<s-table>` and so on), loaded by the template from Shopify's CDN. Don't add Polaris React (`@shopify/polaris`), which Shopify is phasing out.
- The app is on React 18, which doesn't support controlled Polaris fields. Use uncontrolled fields in a native form (or a React Router `<Form>`), with a `name` on every field, and read the values from the form data on the server.

### Data

- Use PostgreSQL through Prisma, in development and production. Prisma reads the connection string from `DATABASE_URL`.
- For local development, use a locally installed PostgreSQL. Copy `.env.example` to `.env` and set `DATABASE_URL` to the local database. Never commit `.env`.
- Every schema change goes in a Prisma migration committed with the code.

### Tests

- Use Vitest for unit tests.
- Keep business logic, such as rule evaluation, in pure functions that can be tested without Shopify or the database.

### Git workflow

- One issue per branch, named `issue-<number>-<short-words>` (for example, `issue-4-orders-webhook`).
- Branch from `main` and open a pull request back into `main`.
- PR descriptions include `Closes #<number>` so merging closes the issue.
