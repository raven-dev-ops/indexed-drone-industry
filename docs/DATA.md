# Data and evidence

The source of truth is the JSON in `data/`. [The schema](../src/lib/schema.ts) checks the record shapes, and the site build checks cross-references. Use stable record IDs to link aircraft, parts, organizations, facilities and pathways.

| Input | Contents |
| --- | --- |
| `catalog.json` | Aircraft, configurations, manufacturers, and sourced specification observations |
| `industry.json` | Organizations, facilities, documented relationships, and dated events with separately cited effects |
| `editorial.json` | Parts, materials, supply pathways, lessons, bottlenecks, regulatory records, and baseline adoption indicators |
| `market.json` | Aircraft shipments and sales, market shares, and supporting adoption evidence |
| `observations.json` | Normalized country indicators from the USGS and Eurostat |

Records carry a publisher, direct URL, locator, access date, and reuse terms. A specification can cite a more specific source. Preserve the source's reported units, variant, test conditions and date. Treat unknown, withheld, and inapplicable values separately from zero. Keep conflicting observations and older variants distinguishable.

Supply pathways label relationships as documented, representative, or unknown. A representative chain explains how a component can be made. A documented supplier relationship requires evidence specific to the relevant product or agreement. The interruption tool models effects on the selected graph and labels branches with insufficient evidence as indeterminate. The history records cite observed effects separately. Facility points reflect the recorded precision and status at the source date.

Original educational anatomy layouts live in `models/airframes.mjs`. The build generates GLB models, PNG posters and hotspot data. Model-specific schematics follow documented configurations within their stated fidelity. Representative geometry applies to an aircraft class. OEM material composition, part suppliers, or internal layouts often remain undisclosed.

## Refresh the atlas

```sh
node scripts/import-observations.mjs --check
node scripts/import-observations.mjs
```

The first command checks the committed snapshot against the pinned series and periods. If the source changes, use the second command to refresh the JSON, then review its diff before merging. Keep the retrieval date, dataset versions, and filters current when changing the snapshot. Normal builds read the committed file and work without retrieving these sources.

- USGS figures use the 2026 release for 2025 lithium, natural graphite and rare-earth mine production and reserves. Commodity-specific mass bases are recorded in the unit. Only reported countries or territories are mapped. Withheld and unavailable values are omitted, and the USGS zero marker is recorded as zero.
- Electricity figures use Eurostat `nrg_pc_205`, second half of 2025, non-household band IC (500–1,999 MWh annual consumption), in EUR/kWh excluding VAT and other recoverable taxes and levies.
- Manufacturing hourly labour costs use Eurostat `lc_lci_lev`, 2025, NACE Rev. 2 section C, in EUR/hour. The series includes compensation plus taxes minus subsidies. Eurostat layers cover reporting EU and EFTA countries, preserve published data flags, and omit unavailable and confidential values.

See [source notices](../NOTICE.md) for attribution and reuse terms. An unshaded country may be outside a dataset's coverage or lack a published figure. These indicators describe geography and time periods. Supplier origin, market share, and global sales require their own evidence.

## Market records

Keep the source's geography, segment, period, and method. `shipment` counts aircraft shipped, and `sales` counts aircraft sold. `share` requires a percentage, a denominator, and a basis (`unit-sales`, `shipment-units`, or `revenue`). Use `registration-share` for a share of registrations. Survey totals, issuer disclosures, and estimates retain their scope and qualifiers. Figures from different samples, periods, or bases cannot be combined into a ranking. The index cites public findings and keeps underlying reports at their source.

## Download interfaces

| Path | Contents |
| --- | --- |
| `/data/v1/index.json` | Structured index and evidence |
| `/data/v1/aircraft.csv` | Aircraft records |
| `/data/v1/observations.csv` | Atlas observations |
| `/data/v1/market.csv` | Market and adoption figures with measurement basis, denominator, and source |
| `/data/v1/facilities.geojson` | Facility points and properties |
| `/data/v1/events.csv` | Historical events |
| `/data/v1/release.json` | Release metadata |
| `/data/v1/SHA256SUMS.txt` | SHA-256 digests for the release artifacts |

Use the JSON for nested fields and relationships. Use release tags and the checksum file to identify the exact data you analyzed. See [release instructions](RELEASE.md) for snapshot versioning.

## Industry source refreshes

See the [industry import guide](INDUSTRY-SOURCES.md) for reviewing updated organization and facility source snapshots.
