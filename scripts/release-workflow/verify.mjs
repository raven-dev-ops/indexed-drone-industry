import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function requireCleanCheckout() {
  if (git('status', '--porcelain=v1', '--untracked-files=all')) {
    throw new Error('Commit or set aside working tree changes before verifying a release candidate.');
  }
}

const snapshot = process.argv[2] ?? 'development';
if (process.argv.length > 3 || !/^(development|v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?)$/.test(snapshot)) {
  throw new Error('Usage: git verify-release [vMAJOR.MINOR.PATCH]');
}
requireCleanCheckout();
const tree = git('rev-parse', 'HEAD^{tree}');
const gitDir = git('rev-parse', '--path-format=absolute', '--git-common-dir');
const receipts = join(gitDir, 'release-workflow', 'verified');
const receipt = join(receipts, tree);
const versionReceipt = join(receipts, `${tree}.${snapshot}`);
mkdirSync(receipts, { recursive: true });
rmSync(receipt, { force: true });
rmSync(versionReceipt, { force: true });

const env = {
  ...process.env,
  CI: '1',
  SITE_URL: 'https://raven-dev-ops.github.io',
  SITE_BASE: '/indexed-drone-industry',
  SNAPSHOT_VERSION: snapshot,
  ASTRO_TELEMETRY_DISABLED: '1',
};
for (const command of [
  'pnpm install --frozen-lockfile',
  'pnpm check',
  'pnpm test',
  'pnpm build',
  'pnpm exec playwright install chromium',
  'pnpm test:e2e',
  'pnpm release:check',
]) {
  console.log(`\n> ${command}`);
  execSync(command, { env, stdio: 'inherit' });
}

requireCleanCheckout();
if (git('rev-parse', 'HEAD^{tree}') !== tree) {
  throw new Error('The checkout changed while tests ran. Verify the intended candidate again.');
}
const result = `${tree}\n${snapshot}\n${new Date().toISOString()}\n`;
writeFileSync(versionReceipt, result);
writeFileSync(receipt, result);
console.log(`\nVerified source tree ${tree} locally.`);
