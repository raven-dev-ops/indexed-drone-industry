import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { airframes } from '../models/airframes.mjs';

// GLTFExporter uses FileReader for browser-side Blob reads. All geometry is
// generated in Node and the exporter requires only this method for GLBs.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((result) => {
        this.result = result;
        this.onloadend();
      }).catch((error) => {
        throw error;
      });
    }
  };
}

const origin = [0, 0, 0];
const materials = new Map();
const geometries = new Map();
const vector = (values) => new THREE.Vector3(...values);

function mesh(parent, geometry, position, color, rotation = origin) {
  if (!materials.has(color)) {
    materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: .08 }));
  }
  const shape = new THREE.Mesh(geometry, materials.get(color));
  shape.position.fromArray(position);
  shape.rotation.set(...rotation);
  parent.add(shape);
  return shape;
}

function sharedGeometry(name, create) {
  if (!geometries.has(name)) geometries.set(name, create());
  return geometries.get(name);
}

function group(parent, position = origin, rotation = origin) {
  const child = new THREE.Group();
  child.position.fromArray(position);
  child.rotation.set(...rotation);
  parent.add(child);
  return child;
}

function kit(scene) {
  let instanceCount = 0;
  const diagramParts = new Map();
  const add = {
    group,
    box(parent, position, size, color, rotation) {
      const geometry = sharedGeometry('box', () => new THREE.BoxGeometry(1, 1, 1));
      mesh(parent, geometry, position, color, rotation).scale.fromArray(size);
    },
    oval(parent, position, size, color, rotation) {
      const geometry = sharedGeometry('oval', () => new THREE.SphereGeometry(1, 14, 8));
      mesh(parent, geometry, position, color, rotation).scale.fromArray(size);
    },
    cylinder(parent, position, radius, height, color, rotation) {
      const geometry = sharedGeometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 16));
      mesh(parent, geometry, position, color, rotation).scale.set(radius, height, radius);
    },
    ring(parent, position, radius, tube, color) {
      const geometry = new THREE.TorusGeometry(radius, tube, 6, 28);
      mesh(parent, geometry, position, color, [Math.PI / 2, 0, 0]);
    },
    plate(parent, outline, y, thickness, color) {
      const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
      mesh(parent, geometry, [0, y - thickness / 2, 0], color, [-Math.PI / 2, 0, 0]);
    },
    beam(parent, start, end, width, color) {
      const geometry = sharedGeometry('box', () => new THREE.BoxGeometry(1, 1, 1));
      span(parent, geometry, start, end, width, color);
    },
    rod(parent, start, end, radius, color) {
      const geometry = sharedGeometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 16));
      span(parent, geometry, start, end, radius, color);
    },
    part(id, explode) {
      const part = group(scene);
      part.name = `part-${id}-${++instanceCount}`;
      part.userData = { partId: id, explode };
      if (!diagramParts.has(id)) diagramParts.set(id, part);
      return { group: (position, rotation) => group(part, position, rotation), add: (...shapes) => part.add(...shapes) };
    },
  };
  return { add, diagramParts };
}

function span(parent, geometry, start, end, width, color) {
  const a = vector(start);
  const b = vector(end);
  const axis = b.clone().sub(a);
  const shape = mesh(parent, geometry, a.lerp(b, .5).toArray(), color);
  shape.scale.set(width, axis.length(), width);
  shape.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
}

function pngChunk(kind, payload) {
  const result = Buffer.alloc(payload.length + 12);
  result.writeUInt32BE(payload.length, 0);
  result.write(kind, 4, 'ascii');
  payload.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
  return result;
}

// Rasterize at twice the output resolution. A depth buffer keeps overlapping
// meshes in the same visible order as the interactive model.
function poster(faces, position, width, height) {
  const stride = width * 2;
  const rows = height * 2;
  const pixels = new Uint32Array(stride * rows);
  const depth = new Float32Array(pixels.length).fill(Infinity);
  for (const { points, color } of faces) {
    const [[ax, ay], [bx, by], [cx, cy]] = points.map((point) => position(point).map((value) => value * 2));
    const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(denominator) < .01) continue;
    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxX = Math.min(stride - 1, Math.ceil(Math.max(ax, bx, cx)));
    const maxY = Math.min(rows - 1, Math.ceil(Math.max(ay, by, cy)));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const relX = x + .5 - cx;
        const relY = y + .5 - cy;
        const a = ((by - cy) * relX + (cx - bx) * relY) / denominator;
        const b = ((cy - ay) * relX + (ax - cx) * relY) / denominator;
        const c = 1 - a - b;
        if (a < 0 || b < 0 || c < 0) continue;
        const sample = y * stride + x;
        const value = a * points[0].z + b * points[1].z + c * points[2].z;
        if (value >= depth[sample]) continue;
        depth[sample] = value;
        pixels[sample] = 0x1000000 + color;
      }
    }
  }

  const lineBytes = width * 4 + 1;
  const scanlines = Buffer.alloc(lineBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = (2 * y) * stride + 2 * x;
      const samples = [pixels[start], pixels[start + 1], pixels[start + stride], pixels[start + stride + 1]].filter(Boolean);
      if (!samples.length) continue;
      const i = y * lineBytes + 1 + x * 4;
      for (const [offset, shift] of [[0, 16], [1, 8], [2, 0]]) {
        scanlines[i + offset] = Math.round(samples.reduce((sum, sample) => sum + ((sample >> shift) & 255), 0) / samples.length);
      }
      scanlines[i + 3] = Math.round(samples.length * 255 / 4);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6; // RGBA, eight bits per channel.
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Use the 3D mesh itself to draw an isometric poster and its part anchors.
function diagram(scene, diagramParts) {
  const width = 760;
  const height = 520;
  const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .01, 50);
  camera.position.set(-5.6, 5.2, -6.9);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const faces = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const project = (point) => point.clone().project(camera);
  const light = new THREE.Vector3(-.45, .8, -.5).normalize();
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!object.isMesh) return;
    const { geometry, material } = object;
    const positions = geometry.getAttribute('position');
    const index = geometry.getIndex();
    const world = Array.from({ length: positions.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld));
    const projected = world.map(project);
    for (const point of projected) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    const count = index ? index.count : positions.count;
    for (let i = 0; i < count; i += 3) {
      const triangle = [i, i + 1, i + 2].map((j) => index ? index.getX(j) : j);
      const [a, b, c] = triangle.map((j) => projected[j]);
      if ((b.x - a.x) * (c.y - a.y) <= (b.y - a.y) * (c.x - a.x) + .000001) continue;
      const [p, q, r] = triangle.map((j) => world[j]);
      const normal = q.clone().sub(p).cross(r.clone().sub(p)).normalize();
      const shade = .63 + Math.round(Math.max(0, normal.dot(light)) * 7) * .06;
      faces.push({ points: [a, b, c], color: material.color.clone().multiplyScalar(shade).getHex() });
    }
  });

  const scale = Math.min(522 / (maxX - minX), 365 / (maxY - minY));
  const centerX = (maxX + minX) / 2;
  const centerY = (maxY + minY) / 2;
  const position = (point) => [width / 2 + (point.x - centerX) * scale, height / 2 - (point.y - centerY) * scale];
  const png = poster(faces, position, width, height);

  const columns = [[], []];
  for (const [id, object] of diagramParts) {
    const [anchorX, anchorY] = position(project(new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()))).map(Math.round);
    columns[anchorX < width / 2 ? 0 : 1].push({ id, anchorX, anchorY });
  }
  if (Math.abs(columns[0].length - columns[1].length) > 2) {
    const [left, right] = columns.flat().sort((a, b) => a.anchorX - b.anchorX).reduce(
      ([a, b], item, index) => {
        (index < Math.ceil(diagramParts.size / 2) ? a : b).push(item);
        return [a, b];
      }, [[], []],
    );
    columns.splice(0, 2, left, right);
  }
  const hotspots = columns.flatMap((column, side) => column.sort((a, b) => a.anchorY - b.anchorY).map((spot, index) => ({
    ...spot,
    x: side === 0 ? 62 : width - 62,
    y: Math.round((index + 1) * height / (column.length + 1)),
  })));
  return { png, hotspots };
}

const output = fileURLToPath(new URL('../public/models/', import.meta.url));
await mkdir(output, { recursive: true });
const exporter = new GLTFExporter();
const manifest = [];
for (const { id, label, build, source, fidelity, representative } of airframes) {
  const scene = new THREE.Scene();
  scene.name = id;
  const { add, diagramParts } = kit(scene);
  build(add);
  const { png, hotspots } = diagram(scene, diagramParts);
  const binary = await exporter.parseAsync(scene, { binary: true });
  await Promise.all([
    writeFile(new URL(`../public/models/${id}.glb`, import.meta.url), Buffer.from(binary)),
    writeFile(new URL(`../public/models/${id}.png`, import.meta.url), png),
    writeFile(new URL(`../public/models/${id}.hotspots.json`, import.meta.url), `${JSON.stringify(hotspots)}\n`),
  ]);
  manifest.push({ id, label, representative, fidelity, parts: [...diagramParts.keys()], source, license: 'CC-BY-4.0' });
}
await writeFile(new URL('../public/models/manifest.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated ${manifest.length} anatomy models.`);
