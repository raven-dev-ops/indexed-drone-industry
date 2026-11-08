import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import * as schema from './schema.ts';
import { evaluateScenario } from './simulation.ts';

function read(path: string, fallback?: unknown): unknown {
  if (fallback !== undefined && !existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

const industrySchema = z.object({
  organizations: z.array(schema.organization),
  facilities: z.array(schema.facility),
  events: z.array(schema.event),
  relationships: z.array(schema.relationship).default([]),
});
const editorialSchema = z.object({
  parts: z.array(schema.part),
  materials: z.array(schema.material),
  scenarios: z.array(schema.scenario),
  lessons: z.array(schema.lesson),
  bottlenecks: z.array(schema.bottleneck),
  regulations: z.array(schema.regulation),
  indicators: z.array(schema.indicator),
});

export const aircraft = z
  .array(schema.aircraft)
  .parse(read('data/catalog.json', []))
  .map((row) => ({
    ...row,
    specs: row.specs.map((spec) => {
      const source = spec.source ?? row.source;
      return { ...spec, source, observed: spec.observed ?? source.accessed };
    }),
  }));
export const { organizations, facilities, events, relationships } =
  industrySchema.parse(
    read('data/industry.json', {
      organizations: [],
      facilities: [],
      events: [],
    }),
  );
export const {
  parts,
  materials,
  scenarios,
  lessons,
  bottlenecks,
  regulations,
  indicators,
} = editorialSchema.parse(read('data/editorial.json'));
export const observations = z
  .array(schema.observation)
  .parse(read('data/observations.json', []));
export const models = z
  .array(schema.model)
  .parse(read('public/models/manifest.json', []));

export const collections = {
  aircraft,
  parts,
  materials,
  organizations,
  facilities,
  history: events,
  supply: scenarios,
  learn: lessons,
  bottlenecks,
  regulations,
  market: indicators,
};
export type Section = keyof typeof collections;
export type RecordEntry = (typeof collections)[Section][number];

export function lookupModel(aircraft: schema.Aircraft) {
  return (
    models.find((model) => model.id === aircraft.id) ??
    models.find((model) => model.id === `class-${aircraft.form}`)
  );
}

function verifyReferences() {
  for (const [section, entries] of Object.entries(collections)) {
    if (new Set(entries.map((entry) => entry.id)).size !== entries.length)
      throw new Error(`Duplicate ID in ${section}`);
  }
  const knownParts = new Set(parts.map((part) => part.id));
  const knownLessons = new Set(lessons.map((lesson) => lesson.id));
  const knownScenarios = new Set(scenarios.map((scenario) => scenario.id));
  const knownEvents = new Set(events.map((event) => event.id));
  const knownOrganizations = new Set(
    organizations.map((organization) => organization.id),
  );
  if (new Set(models.map((model) => model.id)).size !== models.length)
    throw new Error('Duplicate model ID');
  for (const model of models) {
    if (model.parts.some((part) => !knownParts.has(part)))
      throw new Error(`Unknown part in model ${model.id}`);
  }
  for (const row of [...aircraft, ...facilities]) {
    if (row.organizationId && !knownOrganizations.has(row.organizationId))
      throw new Error(`Unknown organization in ${row.id}`);
  }
  if (new Set(relationships.map((row) => row.id)).size !== relationships.length)
    throw new Error('Duplicate relationship ID');
  for (const row of relationships)
    for (const endpoint of [row.from, row.to]) {
      if (
        !collections[endpoint.section].some((entry) => entry.id === endpoint.id)
      )
        throw new Error(`Unknown endpoint in ${row.id}`);
    }
  for (const row of [...materials, ...parts, ...bottlenecks]) {
    if (row.pathway && !knownScenarios.has(row.pathway))
      throw new Error(`Unknown supply pathway in ${row.id}`);
  }
  for (const part of parts)
    if (part.lesson && !knownLessons.has(part.lesson))
      throw new Error(`Unknown lesson in ${part.id}`);
  for (const lesson of lessons)
    if (lesson.part && !knownParts.has(lesson.part))
      throw new Error(`Unknown part in ${lesson.id}`);
  for (const event of events)
    if (event.scenarioId && !knownScenarios.has(event.scenarioId))
      throw new Error(`Unknown scenario in ${event.id}`);
  for (const scenario of scenarios) {
    if (scenario.event && events.length && !knownEvents.has(scenario.event))
      throw new Error(`Unknown event in ${scenario.id}`);
    evaluateScenario(scenario, new Set());
  }
}
verifyReferences();

export const coverage = {
  aircraft: aircraft.length,
  modeledAircraft: aircraft.filter((row) => lookupModel(row)).length,
  specificLayouts: aircraft.filter(
    (row) => lookupModel(row)?.representative === false,
  ).length,
  segments: new Set(aircraft.map((row) => row.segment)).size,
  pathways: scenarios.filter((row) => row.mode === 'representative').length,
  organizations: organizations.length,
  facilities: facilities.length,
  countries: new Set(facilities.map((row) => row.country)).size,
  disruptions: events.filter((row) => row.type === 'disruption').length,
  labs: 2,
  lessons: lessons.length,
};
export const launchThresholds = {
  aircraft: 40,
  modeledAircraft: 40,
  specificLayouts: 8,
  segments: 7,
  pathways: 6,
  organizations: 100,
  facilities: 100,
  countries: 15,
  disruptions: 20,
  labs: 2,
  lessons: 8,
} satisfies typeof coverage;
