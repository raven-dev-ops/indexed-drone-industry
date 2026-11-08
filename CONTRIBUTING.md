# Contributing

Use the repository's issue forms for corrections, proposed records, and site bugs. Keep one topic per issue or pull request. For a private staging checkout, use the staging repository and keep its preview and discussions within that repository.

## Data and anatomy

- Include the affected page or stable record ID, proposed change, publisher, direct source URL, and page, table, or section. Include the date, model revision, region, unit, and test conditions where they change the meaning.
- Use manufacturer documentation for the manufacturer's specifications, regulatory records for regulatory status, and dated operator or facility documents for deployment and manufacturing claims. Attribute self-reported claims and distinguish model-specific links from representative pathways.
- Preserve meaningful conflicts, dates, and variants. Leave unknown or withheld values unfilled. Use actual zero only where the source reports zero. Country production and a facility's presence in the atlas do not establish a sourcing relationship.
- Keep record IDs stable. Follow [the data guide](docs/DATA.md) for the schema and imports. For a new model, add an original schematic, evidence for its documented configuration, and an accessible part list. Mark representative models as such.
- Link to third-party manuals, photos, and CAD. When including reusable third-party material, add the source, exact license, attribution, and description of changes.

## Pull requests

Explain the user-visible change and how you checked it. Run `pnpm check`, `pnpm test`, and `pnpm build`. Run `pnpm test:e2e` for browser changes and `pnpm release:check` for release candidates. Keep generated build artifacts out of the change unless the repository tracks the artifact as an input.

Install the pre-push hook and verify committed candidates locally by following the [release guide](docs/RELEASE.md).

By submitting a contribution, you agree to license it under the applicable [code](LICENSE) or [data and content](LICENSE-DATA.md) license. Submit your own work or material you have the right to share under its stated terms.
