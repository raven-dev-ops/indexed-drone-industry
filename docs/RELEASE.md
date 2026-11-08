# Release and rollback

## Prepare in private staging

Develop and review in the private staging repository. Use local builds or access-controlled previews. Build from a clean candidate commit with the pinned Node and pnpm versions. Set `SITE_URL` to the target site origin and `SITE_BASE` to its path prefix when the host serves the site below a subpath.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
pnpm test
pnpm build
pnpm test:e2e
pnpm release:check
```

CI should pass on the candidate commit. Use the production preview to check the X500 teardown and keyboard-accessible part list, comparison conditions, map and table, a supply interruption, search, and downloads. Verify the site works at its planned base path. Compare the coverage page with the release gate and resolve unmet launch criteria before v1.

## Publish v1 from a separate repository

1. Review the full public snapshot, including hidden configuration, repository metadata, assets, data and their licenses. Check evidence, attributions, rights and sensitive material. Confirm that a fresh clone can build and that the public owner, repository name and deployment target are correct.
2. Record the approved staging commit and release checks. Export the approved tracked tree into a new public repository under the approved owner. Use a clean public history. Keep staging access restricted. Enable private vulnerability reports and configure CI and the deployment target.
3. Run the checks against the public candidate. Push tag `v1.0.0` for the approved public commit to trigger the GitHub Pages workflow. That workflow uses the tag as `SNAPSHOT_VERSION` in the static build. Verify core routes and download files on the public URL, then publish the notes and the deployed data files, `release.json`, and `SHA256SUMS.txt` together.
4. Download the release artifacts and verify their SHA-256 hashes against `SHA256SUMS.txt`. For example, compare the hash produced by `Get-FileHash -Algorithm SHA256 <file>` on Windows or `sha256sum <file>` on Linux. Preserve the tagged artifacts and checksum file as a matched set.

Keep every tagged release immutable. A correction gets a new version and a new checksum file. `/data/v1/` identifies the data interface, and a tagged release identifies the exact snapshot.

## Roll back

On a deploy failure, redeploy the last verified release artifact or rebuild the previous good tag with its recorded configuration. Verify the homepage, linked pages, search, and the matching download hashes. Record the incident and mark the affected release in its notes. Keep the release tag and checksum record intact so users can identify files they already downloaded. Fix the problem in staging and ship a new release.

If private material or a credential was exposed, restrict the affected deployment, revoke the credential, and follow [the security policy](../SECURITY.md). Treat already downloaded material as distributed.
