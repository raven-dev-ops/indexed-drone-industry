# Release and rollback

## Set up a clone

Run the installer once after cloning, and again when the release workflow files change.

```sh
node scripts/release-workflow/install.mjs
```

The installer adds `git verify-release` and a pre-push hook to this clone and its linked worktrees. It keeps previous verification results and stops if an unrelated hook, alias, or custom hooks path is already configured. Review that configuration before installing. GitHub's CI and branch rules still apply to remote changes.

## Develop and verify locally

Start from the synced `main` and develop on a local branch. Preview with `pnpm dev`. Commit the candidate, then run `git verify-release` from a clean checkout before pushing. For a planned release, use `git verify-release v1.2.0`, substituting the actual version.

The command uses the pinned Node and pnpm versions to install dependencies, check types, run unit and Chromium tests, build with the production site prefix, and check release readiness. A pass records the exact Git tree tested. The hook checks that record before any branch or release tag push. A new public release tag also needs a pass for its version and must point to the current public `main` commit.

## Promote and publish

Contributors using a public clone can push a verified branch to their normal PR remote. The following steps are for maintainers promoting changes from private staging.

1. Push the locally verified branch to private staging and wait for CI. In the staging checkout, `origin` points to private staging. In a clone of the public repository, `origin` points to the public repository and the hook recognizes it by URL.
2. From a staging checkout, add the public remote if needed with `git remote add public https://github.com/raven-dev-ops/indexed-drone-industry.git`. Fetch `public main` and create a clean branch based on `public/main` in a separate worktree. Apply the approved changes there as a patch or cherry-pick. Compare its Git tree with the verified staging tree and run local verification if the files differ. The hook protects the public repository from private ancestry. Review evidence, licenses, and the public diff before pushing the PR.
3. Wait for public PR checks and review, then merge. Fetch public `main` again. Confirm the merge contains the files verified for the release version, then create and push the new tag from that commit. GitHub Pages builds and deploys the tag using its version as `SNAPSHOT_VERSION`.
4. Verify the live site and download files. Publish release notes and the deployed assets, including `release.json` and `SHA256SUMS.txt`. Download the release assets and verify their SHA-256 hashes with `Get-FileHash -Algorithm SHA256 <file>` on Windows or `sha256sum <file>` on Linux. Sync the published files back to local and private staging `main` so the next update starts from the release.

Keep every tagged release immutable. A correction gets a new version and a new checksum file. `/data/v1/` identifies the data interface, and a tagged release identifies the exact snapshot.

## Roll back

On a deploy failure, redeploy the last verified release artifact or rebuild the previous good tag with its recorded configuration. Verify the homepage, linked pages, search, and the matching download hashes. Record the incident and mark the affected release in its notes. Keep the release tag and checksum record intact so users can identify files they already downloaded. Fix the problem in staging and ship a new release.

If private material or a credential was exposed, restrict the affected deployment, revoke the credential, and follow [the security policy](../SECURITY.md). Treat already downloaded material as distributed.
