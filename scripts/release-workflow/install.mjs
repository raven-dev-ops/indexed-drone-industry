import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { chmodSync, lstatSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const marker = '# indexed-drone-industry release workflow';
const legacyHook = 'ae337818f3f5eced3da6e0c583c674daa59c4f1fceef17ba102e73e4cc185a3c';
const alias = '!sh "$(git rev-parse --path-format=absolute --git-common-dir)/release-workflow/verify"';

function git(args, optional = false) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (optional && result.status === 1) return null;
  if (result.status !== 0) throw new Error(result.stderr.trim() || `git ${args[0]} failed.`);
  return result.stdout.replace(/\r?\n$/, '');
}

function statIfPresent(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function existingFile(path) {
  const stat = statIfPresent(path);
  if (!stat) return null;
  if (!stat.isFile()) throw new Error(`Expected a regular file at ${path}.`);
  return readFileSync(path);
}

function installFile(path, contents, mode) {
  const current = existingFile(path);
  if (current?.equals(contents)) {
    chmodSync(path, mode);
    return;
  }
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, contents, { flag: 'wx', mode });
    chmodSync(temporary, mode);
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function install() {
  git(['rev-parse', '--show-toplevel']);
  const common = git(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  const hooks = resolve(common, 'hooks');
  const support = resolve(common, 'release-workflow');
  const configuredHooks = git(['config', '--type=path', '--get', 'core.hooksPath'], true);
  if (configuredHooks !== null && (!isAbsolute(configuredHooks) || resolve(configuredHooks) !== hooks)) {
    throw new Error('A custom core.hooksPath is active. This installer requires the default Git hooks path.');
  }

  const aliases = git(['config', '--null', '--get-all', 'alias.verify-release'], true);
  if (aliases !== null && aliases.split('\0').slice(0, -1).some(value => value !== alias)) {
    throw new Error('The git verify-release alias is already configured for another command.');
  }

  for (const directory of [hooks, support]) {
    const stat = statIfPresent(directory);
    if (stat && !stat.isDirectory()) throw new Error(`Expected a regular directory at ${directory}.`);
  }
  const files = [
    { name: 'verify', path: join(support, 'verify'), mode: 0o755 },
    { name: 'verify.mjs', path: join(support, 'verify.mjs'), mode: 0o644 },
    { name: 'pre-push', path: join(hooks, 'pre-push'), mode: 0o755 },
  ].map(file => ({
    ...file,
    contents: Buffer.from(readFileSync(new URL(file.name, import.meta.url), 'utf8').replace(/\r\n/g, '\n')),
    current: existingFile(file.path),
  }));

  const hook = files[2].current;
  const managed = hook && (hook.toString('utf8').split(/\r?\n/, 4).includes(marker)
    || createHash('sha256').update(hook).digest('hex') === legacyHook);
  if (hook && !managed) throw new Error(`An existing pre-push hook at ${files[2].path} was left in place.`);
  for (const file of files.slice(0, 2)) {
    if (!managed && file.current && !file.current.equals(file.contents)) {
      throw new Error(`An existing release workflow file at ${file.path} was left in place.`);
    }
  }

  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    installFile(file.path, file.contents, file.mode);
  }
  git(['config', '--local', '--replace-all', 'alias.verify-release', alias]);
  console.log('Installed git verify-release and the pre-push guard for this checkout and its worktrees.');
}

try {
  install();
} catch (error) {
  console.error(`Release workflow installation stopped. ${error.message}`);
  process.exitCode = 1;
}
