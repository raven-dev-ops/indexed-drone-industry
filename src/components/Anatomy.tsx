import { useEffect, useId, useRef, useState } from 'react';
import type { Material, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import type { Evidence } from '../lib/schema';
import './anatomy.css';

type Part = {
  id: string; name: string; href: string; note?: string;
  component?: { name: string; materials: string; materialBasis: string; scope?: string; source: Evidence };
  supply?: { name: string; href: string }[];
};
type Hotspot = { id: string; x: number; y: number; anchorX: number; anchorY: number };
type ViewAction = 'left' | 'right' | 'closer' | 'farther' | 'reset';

interface Props {
  model: string;
  label: string;
  representative: boolean;
  fidelity?: string;
  parts: Part[];
  modelUrl?: string;
}

interface SceneActions {
  update: (selected: string | undefined, explode: number) => void;
  view: (action: ViewAction) => void;
}

function releaseScene(root: Object3D) {
  const materials = new Set<Material>();
  const geometries = new Set<Mesh['geometry']>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
}

export default function Anatomy(props: Props) {
  return <AnatomyViewer key={props.model} {...props} />;
}

function AnatomyViewer({ model, label, representative, fidelity, parts, modelUrl }: Props) {
  const [selected, setSelected] = useState<string | undefined>(parts[0]?.id);
  const [explode, setExplode] = useState(0);
  const [mode, setMode] = useState<'3d' | '2d'>('3d');
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const controls = useRef<SceneActions | null>(null);
  const canvas = useRef<HTMLDivElement | null>(null);
  const initialState = useRef({ selected, explode });
  const partIds = useRef(new Set(parts.map((part) => part.id)));
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('part');
    if (requested && partIds.current.has(requested)) setSelected(requested);
  }, []);
  const sliderId = useId();
  const headingId = useId();
  const root = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/models/${model}`;
  const glb = modelUrl ?? `${root}.glb`;
  const show3d = mode === '3d' && status === 'ready';

  useEffect(() => {
    initialState.current = { selected, explode };
    controls.current?.update(selected, explode);
  }, [selected, explode]);

  useEffect(() => {
    const abort = new AbortController();
    fetch(`${root}.hotspots.json`, { signal: abort.signal })
      .then((response) => response.ok ? response.json() as Promise<Hotspot[]> : [])
      .then((items) => { if (!abort.signal.aborted) setHotspots(items); })
      .catch(() => { /* The image and part list remain available. */ });
    return () => abort.abort();
  }, [root]);

  useEffect(() => {
    const mount = canvas.current;
    if (mode !== '3d' || !mount) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function start(host: HTMLDivElement) {
      if (!window.WebGL2RenderingContext) throw new Error('WebGL 2 unavailable');
      const [THREE, { OrbitControls }, { GLTFLoader }] = await Promise.all([
        import('three'),
        import('three/addons/controls/OrbitControls.js'),
        import('three/addons/loaders/GLTFLoader.js'),
      ]);
      if (cancelled) return;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.setAttribute('aria-hidden', 'true');
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, .05, 120);
      const orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enablePan = false;
      orbit.maxPolarAngle = Math.PI * .87;
      orbit.minPolarAngle = .08;
      const ambient = new THREE.HemisphereLight(0xf4fcff, 0x597077, 2.45);
      const key = new THREE.DirectionalLight(0xfff0db, 2.6);
      key.position.set(-5, 8, -6);
      const fill = new THREE.DirectionalLight(0x95d5ff, 1.2);
      fill.position.set(4, 2, 5);
      scene.add(ambient, key, fill);

      const hitTest = new THREE.Raycaster();
      const cursor = new THREE.Vector2();
      const render = () => renderer.render(scene, camera);
      const resize = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        render();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      orbit.addEventListener('change', render);

      const pickable: Mesh[] = [];
      let startPoint: [number, number] | undefined;
      const press = (event: PointerEvent) => {
        if (event.isPrimary) startPoint = [event.clientX, event.clientY];
      };
      const pick = (event: PointerEvent) => {
        if (!event.isPrimary || !startPoint) return;
        const [x, y] = startPoint;
        startPoint = undefined;
        if (Math.hypot(event.clientX - x, event.clientY - y) > 7) return;
        const rect = renderer.domElement.getBoundingClientRect();
        cursor.set(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height);
        hitTest.setFromCamera(cursor, camera);
        const id = hitTest.intersectObjects(pickable, false)[0]?.object.userData.partId as string | undefined;
        if (id) setSelected(id);
      };
      const loseContext = (event: Event) => {
        event.preventDefault();
        if (!cancelled) setStatus('unavailable');
      };
      const element = renderer.domElement;
      element.addEventListener('pointerdown', press);
      element.addEventListener('pointerup', pick);
      element.addEventListener('webglcontextlost', loseContext);

      cleanup = () => {
        controls.current = null;
        observer.disconnect();
        orbit.removeEventListener('change', render);
        orbit.dispose();
        element.removeEventListener('pointerdown', press);
        element.removeEventListener('pointerup', pick);
        element.removeEventListener('webglcontextlost', loseContext);
        releaseScene(scene);
        renderer.dispose();
        renderer.forceContextLoss();
        element.remove();
      };

      const { scene: aircraft } = await new GLTFLoader().loadAsync(glb);
      if (cancelled) {
        releaseScene(aircraft);
        return;
      }
      scene.add(aircraft);

      const instances: { object: Object3D; rest: Vector3; offset: Vector3 }[] = [];
      const tint: { material: MeshStandardMaterial; id: string }[] = [];
      const clones = new Map<Material, Map<string, MeshStandardMaterial>>();
      aircraft.traverse((object) => {
        const { partId, explode: separation } = object.userData as { partId?: string; explode?: number[] };
        if (!partId || !partIds.current.has(partId) || !Array.isArray(separation) || separation.length !== 3) return;
        instances.push({ object, rest: object.position.clone(), offset: new THREE.Vector3().fromArray(separation) });
        object.traverse((child) => {
          const mesh = child as Mesh;
          if (!mesh.isMesh) return;
          mesh.userData.partId = partId;
          const changeMaterial = (material: Material) => {
            let byPart = clones.get(material);
            if (!byPart) {
              byPart = new Map();
              clones.set(material, byPart);
            }
            const cached = byPart.get(partId);
            if (cached) return cached;
            const copy = material.clone() as MeshStandardMaterial;
            byPart.set(partId, copy);
            tint.push({ material: copy, id: partId });
            return copy;
          };
          mesh.material = Array.isArray(mesh.material) ? mesh.material.map(changeMaterial) : changeMaterial(mesh.material);
          pickable.push(mesh);
        });
      });
      for (const material of clones.keys()) material.dispose();
      if (!pickable.length) throw new Error('The aircraft has no matching part IDs');

      const sphere = new THREE.Box3().setFromObject(aircraft).getBoundingSphere(new THREE.Sphere());
      orbit.target.copy(sphere.center);
      orbit.minDistance = sphere.radius * 1.32;
      orbit.maxDistance = sphere.radius * 6.4;
      const reset = () => {
        const distance = sphere.radius * (host.clientWidth < 480 ? 3.7 : 2.95);
        camera.position.copy(sphere.center).add(new THREE.Vector3(-.58, .56, -.74).normalize().multiplyScalar(distance));
        orbit.update();
      };
      reset();
      controls.current = {
        update(id, amount) {
          for (const { object, rest, offset } of instances) object.position.copy(rest).addScaledVector(offset, amount / 100);
          for (const { material, id: partId } of tint) {
            material.emissive?.setHex(partId === id ? 0x66dac7 : 0x000000);
            material.emissiveIntensity = .38;
          }
          render();
        },
        view(action) {
          if (action === 'reset') {
            reset();
          } else {
            const delta = camera.position.clone().sub(orbit.target);
            const polar = new THREE.Spherical().setFromVector3(delta);
            if (action === 'left' || action === 'right') polar.theta += (action === 'left' ? -.33 : .33);
            if (action === 'closer' || action === 'farther') {
              polar.radius = THREE.MathUtils.clamp(polar.radius * (action === 'closer' ? .84 : 1.19), orbit.minDistance, orbit.maxDistance);
            }
            camera.position.copy(orbit.target).add(new THREE.Vector3().setFromSpherical(polar));
            orbit.update();
          }
          render();
        },
      };
      const state = initialState.current;
      controls.current.update(state.selected, state.explode);
      resize();
      setStatus('ready');
    }

    start(mount).catch(() => {
      if (!cancelled) {
        cleanup?.();
        cleanup = undefined;
        setStatus('unavailable');
      }
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [mode, glb]);

  const active = parts.find(({ id }) => id === selected);
  const activeSpot = hotspots.find(({ id }) => id === selected);
  const fidelityLabel = representative ? 'Representative class diagram' : fidelity === 'documented-assembly' ? 'Schematic of documented assembly' : 'Exterior schematic';
  const switchMode = (next: '3d' | '2d') => {
    if (next === mode) return;
    if (next === '3d') setStatus('loading');
    setMode(next);
  };

  return (
    <section className="anatomy" aria-labelledby={headingId} data-model={model} data-model-ready={show3d}>
      <div className="anatomy-toolbar">
        <div>
          <p className="anatomy-caption">{fidelityLabel}</p>
          <h2 id={headingId}>{label}</h2>
        </div>
        <div className="anatomy-toggle" role="group" aria-label="Anatomy view">
          <button type="button" aria-pressed={mode === '3d'} onClick={() => switchMode('3d')}>3D model</button>
          <button type="button" aria-pressed={mode === '2d'} onClick={() => switchMode('2d')}>2D diagram</button>
        </div>
      </div>

      <div className="anatomy-layout">
        <div className="anatomy-visual">
          <div className="anatomy-stage">
            <div className="anatomy-canvas" ref={canvas} data-active={show3d} aria-hidden="true" />
            {!show3d && (
              <div className="anatomy-diagram">
                <img src={`${root}.png`} width="760" height="520" alt={`Isometric schematic of ${label}`} decoding="async" />
                {activeSpot && (
                  <svg viewBox="0 0 760 520" aria-hidden="true">
                    <path d={`M${activeSpot.x} ${activeSpot.y}L${activeSpot.anchorX} ${activeSpot.anchorY}`} />
                    <circle cx={activeSpot.anchorX} cy={activeSpot.anchorY} r="5" />
                  </svg>
                )}
                {hotspots.map((spot) => {
                  const index = parts.findIndex(({ id }) => id === spot.id);
                  if (index === -1) return null;
                  return (
                    <button
                      type="button"
                      key={spot.id}
                      className="anatomy-hotspot"
                      style={{ left: `${spot.x / 7.6}%`, top: `${spot.y / 5.2}%` }}
                      aria-label={`Locate ${parts[index].name}`}
                      aria-pressed={selected === spot.id}
                      onClick={() => setSelected(spot.id)}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            )}
            {mode === '3d' && status === 'loading' && <p className="anatomy-stage-note" role="status">Loading the 3D model…</p>}
            {mode === '3d' && status === 'unavailable' && <p className="anatomy-stage-note" role="status">The 3D view is unavailable. Select parts in the diagram or list.</p>}
            {show3d && <p className="anatomy-stage-note">Drag to rotate · Scroll or pinch to zoom · Select a part</p>}
          </div>

          {show3d && (
            <div className="anatomy-controls">
              <div className="anatomy-slider">
                <label htmlFor={sliderId}>Explode view</label>
                <input id={sliderId} type="range" min="0" max="100" value={explode} onChange={(event) => setExplode(event.currentTarget.valueAsNumber)} />
                <output htmlFor={sliderId}>{explode}%</output>
              </div>
              <div className="anatomy-camera-controls" role="group" aria-label="Model camera">
                <button type="button" aria-label="Rotate left" onClick={() => controls.current?.view('left')}>↶</button>
                <button type="button" aria-label="Rotate right" onClick={() => controls.current?.view('right')}>↷</button>
                <button type="button" aria-label="Zoom in" onClick={() => controls.current?.view('closer')}>+</button>
                <button type="button" aria-label="Zoom out" onClick={() => controls.current?.view('farther')}>−</button>
                <button type="button" onClick={() => { setExplode(0); controls.current?.view('reset'); }}>Reset</button>
              </div>
            </div>
          )}
        </div>

        <div className="anatomy-inspector">
          <p className="anatomy-caption">PARTS · {parts.length}</p>
          <ul className="anatomy-parts" aria-label="Aircraft parts">
            {parts.map((part, index) => (
              <li key={part.id}>
                <button type="button" aria-pressed={selected === part.id} onClick={() => setSelected(part.id)}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  {part.name}
                </button>
              </li>
            ))}
          </ul>
          {active && (
            <div className="anatomy-detail" aria-live="polite">
              <h3>{active.name}</h3>
              {active.component && <>
                <p><strong>{active.component.name}</strong></p>
                {active.component.scope && <p>{active.component.scope}</p>}
                <p><strong>Material evidence ({active.component.materialBasis})</strong> {active.component.materials}</p>
                <p><a href={active.component.source.url}>{active.component.source.publisher} · {active.component.source.locator}</a></p>
              </>}
              {active.note && <p>{active.note}</p>}
              <a href={active.href}>Explore this part <span aria-hidden="true">↗</span></a>
              {active.supply?.map((link) => <p key={link.href}><a href={link.href}>{link.name}</a></p>)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
