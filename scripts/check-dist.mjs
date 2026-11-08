import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

async function totalSize(directory) {
  const files = await readdir(directory, { withFileTypes: true });
  const sizes = await Promise.all(
    files.map((file) =>
      file.isDirectory()
        ? totalSize(join(directory, file.name))
        : stat(join(directory, file.name)).then((info) => info.size),
    ),
  );
  return sizes.reduce((total, size) => total + size, 0);
}
const size = await totalSize('dist');
if (size >= 250_000_000)
  throw new Error(`dist is ${size} bytes; cap is 250 MB.`);
const models = JSON.parse(await readFile('dist/models/manifest.json', 'utf8'));
for (const model of models) {
  const glb = await readFile(`dist/models/${model.id}.glb`);
  if (glb.length > 4_000_000)
    throw new Error(`${model.id} exceeds the 4 MB budget`);
  if (glb.toString('ascii', 0, 4) !== 'glTF')
    throw new Error(`${model.id} has an invalid GLB header`);
  const scene = JSON.parse(glb.toString('utf8', 20, 20 + glb.readUInt32LE(12)));
  const groups = scene.nodes.filter((node) => node.extras?.partId);
  const groupIds = new Set(groups.map((node) => node.extras.partId));
  if (
    groupIds.size !== model.parts.length ||
    model.parts.some((id) => !groupIds.has(id)) ||
    groups.some(
      (node) =>
        node.extras.explode?.length !== 3 ||
        !node.extras.explode.every(Number.isFinite),
    )
  ) {
    throw new Error(`${model.id} has mismatched GLB part groups`);
  }
  const hotspots = JSON.parse(
    await readFile(`dist/models/${model.id}.hotspots.json`, 'utf8'),
  );
  if (
    hotspots.length !== model.parts.length ||
    model.parts.some((id) => !hotspots.some((hotspot) => hotspot.id === id))
  ) {
    throw new Error(`${model.id} has mismatched part hotspots`);
  }
}
const root = 'dist/data/v1';
const sums = (await readFile(`${root}/SHA256SUMS.txt`, 'utf8'))
  .trim()
  .split('\n');
for (const line of sums) {
  const [expected, file] = line.split('  ');
  const actual = createHash('sha256')
    .update(await readFile(`${root}/${file}`))
    .digest('hex');
  if (actual !== expected) throw new Error(`Invalid SHA-256 for ${file}`);
}
console.log(
  `Checked ${models.length} models, ${sums.length} snapshot checksums, ${(size / 1_000_000).toFixed(2)} MB build.`,
);
