import { createHash } from 'node:crypto';
import type { APIRoute } from 'astro';
import {
  aircraft,
  collections,
  coverage,
  events,
  facilities,
  models,
  observations,
  relationships,
} from '../../../lib/data';
import type { Evidence } from '../../../lib/schema';

const schemaVersion = '1.1.0';
const snapshot = process.env.SNAPSHOT_VERSION || 'development';
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
type Cell = string | number | null | undefined;
function csv(rows: Cell[][]) {
  return (
    rows
      .map((row) =>
        row
          .map((value) => {
            if (value === null || value === undefined) return '';
            const str =
              typeof value === 'string' && /^[=+@\-\t\r]/.test(value)
                ? `'${value}`
                : String(value);
            return `"${str.replaceAll('"', '""')}"`;
          })
          .join(','),
      )
      .join('\n') + '\n'
  );
}
const evidenceHeaders = [
  'source_title',
  'publisher',
  'source_url',
  'source_locator',
  'source_accessed',
  'source_rights',
];
const evidence = (source: Evidence) => [
  source.title,
  source.publisher,
  source.url,
  source.locator,
  source.accessed,
  source.rights,
];
const attribution = [
  {
    work: 'Original index content, original 3D models, and teaching material',
    license: 'CC BY 4.0',
    url: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    work: 'USGS Mineral Commodity Summaries 2026',
    license: 'CC0 1.0',
    url: 'https://doi.org/10.5066/P1WKQ63T',
  },
  {
    work: 'Adapted Eurostat statistical data',
    license: 'Eurostat reuse terms',
    url: 'https://ec.europa.eu/eurostat/help/copyright-notice',
    notice:
      'Eurostat data filtered and normalized by Indexed Drone Industry. Eurostat is not responsible for this adaptation.',
  },
  {
    work: 'Drone Authority FAA Remote ID declarations snapshot, adapted',
    license: 'CC BY 4.0',
    url: 'https://droneauthority.org/data/faa-remote-id-declarations',
  },
  {
    work: 'USGS mineral facilities, Latin America and the Caribbean',
    license: 'Public domain',
    url: 'https://doi.org/10.5066/F7MG7MM6',
  },
  {
    work: 'USGS mineral facilities, Africa',
    license: 'CC0 1.0',
    url: 'https://doi.org/10.5066/P97EQWXP',
  },
  {
    work: 'Natural Earth country boundaries 5.1.2, distributed with site',
    license: 'Public domain',
    url: 'https://www.naturalearthdata.com/about/terms-of-use/',
  },
];
const datasets: Record<string, string> = {
  'index.json': json({
    schemaVersion,
    snapshot,
    coverage,
    ...collections,
    models,
    observations,
    relationships,
    attribution,
  }),
  'aircraft.csv': csv([
    [
      'id',
      'name',
      'maker',
      'segment',
      'form',
      'variant',
      'metric',
      'value',
      'unit',
      'condition',
      'status',
      'observed',
      ...evidenceHeaders,
    ],
    ...aircraft.flatMap((row) =>
      row.specs.length
        ? row.specs.map((spec) => [
            row.id,
            row.name,
            row.maker,
            row.segment,
            row.form,
            row.variant,
            spec.key,
            spec.value,
            spec.unit,
            spec.condition,
            spec.status,
            spec.observed,
            ...evidence(spec.source ?? row.source),
          ])
        : [
            [
              row.id,
              row.name,
              row.maker,
              row.segment,
              row.form,
              row.variant,
              null,
              null,
              null,
              null,
              'unknown',
              null,
              ...evidence(row.source),
            ],
          ],
    ),
  ]),
  'facilities.geojson': json({
    type: 'FeatureCollection',
    schemaVersion,
    features: facilities.map(({ lat, lon, ...row }) => ({
      type: 'Feature',
      id: row.id,
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: row,
    })),
  }),
  'observations.csv': csv([
    [
      'country',
      'layer',
      'metric',
      'period',
      'value',
      'unit',
      ...evidenceHeaders,
    ],
    ...observations.map((row) => [
      row.country,
      row.layer,
      row.name,
      row.year,
      row.value,
      row.unit,
      ...evidence(row.source),
    ]),
  ]),
  'market.csv': csv([
    [
      'id', 'name', 'subject', 'kind', 'basis', 'geography', 'segment', 'period',
      'value', 'unit', 'qualifier', 'estimate', 'denominator', 'method', 'summary',
      'source_published', ...evidenceHeaders,
    ],
    ...collections.market.map((row) => [
      row.id, row.name, row.subject, row.kind, row.basis, row.geography, row.segment,
      row.period, row.value, row.unit, row.qualifier, String(row.estimate),
      row.denominator, row.method, row.summary, row.source.published, ...evidence(row.source),
    ]),
  ]),
  'events.csv': csv([
    [
      'id',
      'name',
      'date',
      'type',
      'summary',
      'consequence_order',
      'consequence',
      ...evidenceHeaders,
    ],
    ...events.flatMap<Cell[]>((row) =>
      row.effects.length
        ? row.effects.map((effect) => [
            row.id,
            row.name,
            row.date,
            row.type,
            row.summary,
            effect.order,
            effect.text,
            ...evidence(effect.source),
          ])
        : [
            [
              row.id,
              row.name,
              row.date,
              row.type,
              row.summary,
              null,
              null,
              ...evidence(row.source),
            ],
          ],
    ),
  ]),
};
datasets['release.json'] = json({
  schemaVersion,
  snapshot,
  coverage,
  attribution,
  files: Object.fromEntries(
    Object.entries(datasets).map(([name, body]) => [
      name,
      { sha256: digest(body), bytes: Buffer.byteLength(body) },
    ]),
  ),
});
datasets['SHA256SUMS.txt'] =
  Object.entries(datasets)
    .map(([name, body]) => `${digest(body)}  ${name}`)
    .join('\n') + '\n';

export function getStaticPaths() {
  return Object.keys(datasets).map((file) => ({
    params: { file },
    props: { body: datasets[file] },
  }));
}

export const GET: APIRoute = ({ params, props }) => {
  const file = params.file ?? '';
  const type = file.endsWith('.csv')
    ? 'text/csv'
    : file.endsWith('.geojson')
      ? 'application/geo+json'
      : file.endsWith('.json')
        ? 'application/json'
        : 'text/plain';
  return new Response(props.body, {
    headers: { 'Content-Type': `${type}; charset=utf-8` },
  });
};
