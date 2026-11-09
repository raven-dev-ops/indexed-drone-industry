import { z } from 'zod';

export const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const country = z.string().regex(/^[A-Z]{2}$/);
export const date = z.iso.date();
export const segments = {
  camera: 'Consumer imaging',
  fpv: 'FPV',
  enterprise: 'Surveying & inspection',
  agriculture: 'Agriculture',
  delivery: 'Delivery',
  'public-safety': 'Public safety',
  research: 'Education & research',
};
export const forms = {
  quad: 'Quadcopter',
  fpv: 'FPV quad',
  multirotor: 'Multirotor',
  'fixed-wing': 'Fixed wing',
  vtol: 'Hybrid VTOL',
  helicopter: 'Single rotor',
};
export const metrics = {
  mass: 'Aircraft mass',
  mtow: 'Maximum takeoff mass',
  endurance: 'Endurance',
  payload: 'Payload',
  sensors: 'Sensors',
  ecosystem: 'Operating ecosystem',
};
export const evidence = z.object({
  id: id.optional(),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url({ protocol: /^https?$/ }),
  locator: z.string().min(1),
  accessed: date.default('2026-11-08'),
  published: date.optional(),
  rights: z.string().default('Citation only'),
});
const entry = z.object({
  id,
  name: z.string().min(1),
  summary: z.string().min(1),
  source: evidence,
});
const spec = z
  .object({
    key: z.enum(metricsKeys()),
    value: z.union([z.number().nonnegative(), z.string().min(1), z.null()]),
    unit: z.enum(['g', 'kg', 'min']).optional(),
    condition: z.string().optional(),
    source: evidence.optional(),
    observed: date.optional(),
    status: z
      .enum([
        'current',
        'conflicting',
        'superseded',
        'unknown',
        'not-applicable',
      ])
      .default('current'),
  })
  .refine(
    (row) => typeof row.value !== 'number' || Boolean(row.unit),
    'Numeric values need a unit',
  )
  .refine(
    (row) =>
      row.value !== null ||
      row.status === 'unknown' ||
      row.status === 'not-applicable',
    'Null needs an explicit status',
  );
function metricsKeys() {
  return [
    'mass',
    'mtow',
    'endurance',
    'payload',
    'sensors',
    'ecosystem',
  ] as const;
}

export const aircraft = entry.extend({
  maker: z.string().min(1),
  segment: z.enum([
    'camera',
    'fpv',
    'enterprise',
    'agriculture',
    'delivery',
    'public-safety',
    'research',
  ]),
  form: z.enum([
    'quad',
    'fpv',
    'multirotor',
    'fixed-wing',
    'vtol',
    'helicopter',
  ]),
  variant: z.string().min(1),
  specs: z.array(spec).default([]),
  organizationId: id.optional(),
});
export const organization = entry.extend({
  role: z.string().min(1),
  country: country.optional(),
});
export const facility = entry.extend({
  country,
  activity: z.string().min(1),
  status: z.enum(['operating', 'announced', 'closed', 'unknown']),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  precision: z.enum(['site', 'city', 'region']),
  organizationId: id.optional(),
  observed: date.optional(),
  statusReviewed: date.optional(),
  statusSource: evidence.optional(),
});
export const event = entry.extend({
  date,
  type: z.enum(['disruption', 'launch', 'facility', 'policy', 'deployment']),
  effects: z
    .array(
      z.object({
        order: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        text: z.string().min(1),
        source: evidence,
      }),
    )
    .default([]),
  scenarioId: id.optional(),
});
export const endpoint = z.object({
  section: z.enum(['aircraft', 'organizations', 'facilities', 'history', 'regulations', 'parts', 'materials']),
  id,
});
export const evidenceType = z.enum(['documented', 'representative', 'unknown']);
export const relationship = z.object({
  id,
  from: endpoint,
  to: endpoint,
  relation: z.string().min(1),
  summary: z.string().min(1),
  evidenceType,
  source: evidence,
});
export const model = z.object({
  id,
  label: z.string().min(1),
  representative: z.boolean(),
  parts: z.array(id).min(1),
  fidelity: z.string().optional(),
  source: evidence.optional(),
  license: z.string().min(1),
});
export const part = entry.extend({
  materials: z.string().min(1),
  pathway: id.optional(),
  lesson: id.optional(),
});
export const componentClaim = z.object({
  aircraft: id,
  part: id,
  name: z.string().min(1),
  materials: z.string().min(1),
  materialBasis: evidenceType,
  scope: z.string().min(1).optional(),
  source: evidence.required({ id: true }),
});
export const pathwayContext = z.object({
  id,
  aircraft: z.array(z.object({ id, part: id, evidenceType, scope: z.string().min(1).optional() })),
  nodes: z.record(id, z.array(endpoint)),
  events: z.array(id).min(1),
  relationships: z.array(id).optional(),
  atlasLayer: id.optional(),
});
export const material = entry.extend({ pathway: id });
export const lesson = entry.extend({
  body: z.array(z.string().min(1)).min(1),
  part: id.optional(),
});
export const bottleneck = entry.extend({
  pathway: id,
  affects: z.string(),
  mitigation: z.string(),
  parts: z.array(id).optional(),
  segments: z.array(aircraft.shape.segment).optional(),
});
export const regulation = entry.extend({
  jurisdiction: z.string().min(1),
  axis: z.enum(['Equipment', 'Operations', 'Procurement']),
  effective: date.optional(),
});
export const marketKind = z.enum([
  'shipment',
  'sales',
  'share',
  'registration-share',
  'registration',
  'fleet',
  'deployment',
]);
export const marketBasis = z.enum([
  'unit-sales',
  'shipment-units',
  'revenue',
  'registrations',
]);
export const indicator = entry
  .extend({
    kind: marketKind,
    geography: z.string().trim().min(1),
    period: z.string().trim().min(1),
    segment: z.string().trim().min(1),
    subject: z.string().trim().min(1).optional(),
    value: z.number().nonnegative(),
    unit: z.string().trim().min(1),
    basis: marketBasis.optional(),
    denominator: z.string().trim().min(1).optional(),
    method: z.string().trim().min(1).optional(),
    qualifier: z.enum(['over', 'at-least', 'about']).optional(),
    estimate: z.boolean().default(false),
  })
  .refine(
    (row) =>
      !['shipment', 'sales', 'share', 'registration-share'].includes(row.kind) ||
      Boolean(row.method),
    'Shipment, sales, and share records need a methodology',
  )
  .refine(
    (row) => {
      if (row.kind === 'share' || row.kind === 'registration-share') {
        const hasBasis = row.kind === 'share'
          ? row.basis && row.basis !== 'registrations'
          : row.basis === 'registrations';
        return hasBasis && row.denominator && row.unit === '%' && row.value <= 100;
      }
      return row.basis === undefined && row.unit !== '%';
    },
    'Share records need a matching basis, a denominator, and a percentage from 0 to 100',
  );
export type MarketIndicator = z.infer<typeof indicator>;
export const scenario = entry.extend({
  mode: z.enum(['representative', 'case-study']),
  nodes: z
    .array(
      z.object({
        id,
        name: z.string(),
        stage: z.string(),
        source: evidence.optional(),
        unknown: z.boolean().optional(),
      timing: z.string().min(1).optional(),
      }),
    )
    .min(1),
  inputs: z.array(
    z.object({
      target: id,
      alternatives: z.array(id).min(1),
      evidenceType,
      source: evidence,
      leadTimeDays: z.number().positive().optional(),
    }),
  ),
  event: id.optional(),
});
export const observation = z.object({
  country,
  layer: id,
  name: z.string(),
  year: z.string(),
  value: z.number().nonnegative(),
  unit: z.string(),
  source: evidence,
});

export type Evidence = z.infer<typeof evidence>;
export type Aircraft = z.infer<typeof aircraft>;
export type Facility = z.infer<typeof facility>;
export type Event = z.infer<typeof event>;
export type Scenario = z.infer<typeof scenario>;
export type Observation = z.infer<typeof observation>;
