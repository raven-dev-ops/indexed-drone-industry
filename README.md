# Indexed Drone Industry

An open field guide to civilian drones, from raw materials and components to aircraft, operators, maintenance, and recycling. Explore aircraft anatomy, compare configurations, trace supply pathways, browse facilities and country data, and work through flight and survey labs.

Start with the Holybro X500 V2 kit, follow its motor to a representative magnet pathway, then look at a documented disruption. Each record links to its evidence. The coverage page shows which segments and regions the index covers.

## Run locally

Use Node.js 24.22.2 from `.node-version` and pnpm 11.28.11 from `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Astro. The development and production builds generate the 3D assets from the repository. The production build also indexes search with Pagefind.

```sh
pnpm check
pnpm test
pnpm build
pnpm preview
```

Install Playwright's Chromium browser with `pnpm exec playwright install chromium`, then run `pnpm test:e2e`. Run `pnpm release:check` after building to check release readiness.

## Work with the data

The versioned JSON, CSV, and GeoJSON downloads are listed on the site's **Open data** page and served under `/data/v1/`. The application builds from the checked-in data. [Data documentation](docs/DATA.md) explains the evidence model, coverage, and source imports.

[Contributing](CONTRIBUTING.md) covers corrections and additions. [Release instructions](docs/RELEASE.md) cover private staging, public release, and rollback.

## Licenses

Code uses [Apache 2.0](LICENSE). Original data, text, illustrations, and 3D models use [CC BY 4.0](LICENSE-DATA.md). The [notices](NOTICE.md) identify third-party sources and their terms.
