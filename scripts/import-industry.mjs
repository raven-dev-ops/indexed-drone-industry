import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  faa: { type: 'string' }, lac: { type: 'string' }, africa: { type: 'string' },
  china: { type: 'string' }, help: { type: 'boolean' },
} });

if (values.help || !Object.keys(values).length) {
  console.log('Usage: node scripts/import-industry.mjs [--faa snapshot.json] [--lac MINFAC_LAC.csv] [--africa facilities.csv] [--china table5.csv]');
  console.log('Compares source snapshots to data/industry.json and emits a JSON review report. No files are written.');
  process.exit(0);
}

const industry = JSON.parse(await readFile(new URL('../data/industry.json', import.meta.url), 'utf8'));
const text = value => String(value ?? '').trim();
const lookupName = value => text(value).normalize('NFKC').toLowerCase();

function readCsv(input, required) {
  const rows = [];
  let row = [];
  let consumed = 0;
  // Keep quoted commas, doubled quotes and embedded newlines intact.
  const csv = input.replace(/^\uFEFF/, '');
  for (const match of csv.matchAll(/(^|,|\r?\n)(?:"((?:[^"]|"")*)"|([^,"\r\n]*))/g)) {
    if (match.index !== consumed) throw new Error('Malformed CSV near offset ' + consumed);
    consumed += match[0].length;
    if (match[1].includes('\n')) {
      if (row.some(Boolean)) rows.push(row);
      row = [];
    }
    row.push((match[2] ?? match[3]).replaceAll('""', '"'));
  }
  if (consumed !== csv.length) throw new Error('Truncated CSV');
  if (row.some(Boolean)) rows.push(row);
  const header = rows.shift()?.map(text) ?? [];
  if (new Set(header).size !== header.length || required.some(key => !header.includes(key))) {
    throw new Error('Expected distinct CSV columns: ' + required.join(', '));
  }
  return rows.map((values, index) => {
    if (values.length !== header.length) throw new Error('Unexpected column count in data record ' + (index + 1));
    return Object.fromEntries(header.map((key, i) => [key, text(values[i])]));
  });
}

function compare(current, proposed, upstream) {
  const changes = Object.fromEntries(Object.entries(proposed).filter(([key, value]) => current[key] !== value)
    .map(([key, after]) => [key, { before: current[key], after }]));
  return { id: current.id, changes, upstream };
}

function inspectFaa(bytes) {
  const snapshot = JSON.parse(new TextDecoder().decode(bytes));
  if (snapshot.publisher !== 'Drone Authority' || !Array.isArray(snapshot.records) ||
    snapshot.license?.url?.replace(/\/$/, '') !== 'https://creativecommons.org/licenses/by/4.0') {
    throw new Error('Expected the Drone Authority FAA Remote ID snapshot marked CC BY 4.0');
  }
  const rows = snapshot.records;
  for (const row of rows) {
    if (!/^RID\d+$/.test(row.tracking_number) || !['aircraft', 'module'].includes(row.kind) || !text(row.make)) {
      throw new Error('Invalid declaration record: ' + text(row.tracking_number));
    }
  }
  const known = industry.organizations.filter(row => row.source.url === snapshot.url);
  if (!known.length) throw new Error('The snapshot URL does not match any imported organizations');
  const byTracking = new Map(rows.map(row => [row.tracking_number, row]));
  const recordedMakes = new Set(industry.organizations.map(row => lookupName(row.name)));
  const review = [];
  let unchanged = 0;
  for (const organization of known) {
    const tracking = organization.source.locator.match(/\bRID\d+\b/)?.[0];
    const row = byTracking.get(tracking);
    if (!row) {
      const alternatives = rows.filter(row => lookupName(row.make) === lookupName(organization.name))
        .map(row => ({ tracking: row.tracking_number, model: row.model }));
      review.push({ id: organization.id, issue: 'Published tracking number absent from supplied snapshot', tracking, alternatives });
      continue;
    }
    const kind = row.kind === 'aircraft' ? 'aircraft' : 'Remote ID module';
    const summary = 'Declared make for the ' + text(row.model) + ' ' + kind + ' in a published FAA Remote ID record.';
    const role = row.kind === 'aircraft' ? 'Declared aircraft make' : 'Remote ID equipment';
    const result = compare(organization, { name: text(row.make), role, summary },
      { tracking, model: row.model, revision: row.revision, updated: row.updated, faaUrl: row.faa_url });
    if (Object.keys(result.changes).length) review.push(result);
    else unchanged++;
  }
  const unreviewedMakes = [...new Map(rows.filter(row => !recordedMakes.has(lookupName(row.make)))
    .map(row => [lookupName(row.make), { name: text(row.make), sampleTracking: row.tracking_number }])).values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  return { upstreamDate: snapshot.dateModified, inputRows: rows.length, selected: known.length, unchanged, review, unreviewedMakes };
}

function coordinate(value, max) {
  const numeric = Number(value);
  if (value === '' || !Number.isFinite(numeric) || Math.abs(numeric) > max) throw new Error('Invalid coordinate: ' + value);
  return Number(numeric.toFixed(4));
}

const facilitySources = {
  lac: {
    encoding: 'windows-1252',
    url: 'https://doi.org/10.5066/F7MG7MM6',
    columns: ['ROWID', 'FACID', 'LOCNAME', 'ISO_CC', 'DDLAT', 'DDLONG', 'LOCACC', 'STATUS', 'COMMODITY', 'FACTYPE'],
    key: row => row.ROWID,
    keyForRecord: row => row.source.locator.match(/\brow (\d+)\b/)?.[1],
    name: 'LOCNAME', lat: 'DDLAT', lon: 'DDLONG',
    evidence: row => ({ facilityKey: row.FACID, country: row.ISO_CC, commodity: row.COMMODITY, facilityType: row.FACTYPE, locationAccuracy: row.LOCACC, reportedStatus: row.STATUS }),
  },
  africa: {
    url: 'https://doi.org/10.5066/P97EQWXP',
    columns: ['FeatureUID', 'FeatureNam', 'Country', 'Latitude', 'Longitude', 'LocConfid', 'LocOpStat', 'FeatureTyp', 'DsgAttr02'],
    key: row => row.FeatureUID,
    keyForRecord: row => row.source.locator.match(/\b[A-Z]{3}\d+\b/)?.[0],
    name: 'FeatureNam', lat: 'Latitude', lon: 'Longitude',
    evidence: row => ({ country: row.Country, commodity: row.DsgAttr02, facilityType: row.FeatureTyp, locationAccuracy: row.LocConfid, reportedStatus: row.LocOpStat }),
  },
  china: {
    url: 'https://pubs.usgs.gov/publication/ofr20261018/full#ofr20261018-t05',
    columns: ['name', 'commodity', 'province', 'lat', 'lon'],
    key: row => lookupName(row.name),
    keyForRecord: row => lookupName(row.name),
    name: 'name', lat: 'lat', lon: 'lon',
    evidence: row => ({ commodity: row.commodity, province: row.province }),
  },
};

function inspectFacilities(bytes, config) {
  const rows = readCsv(new TextDecoder(config.encoding).decode(bytes), config.columns);
  const selected = industry.facilities.filter(row => row.source.url === config.url);
  const byKey = new Map();
  for (const row of rows) {
    const key = config.key(row);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }
  const review = [];
  let unchanged = 0;
  for (const facility of selected) {
    const key = config.keyForRecord(facility);
    const candidates = byKey.get(key) ?? [];
    const sameName = candidates.filter(row => lookupName(row[config.name]) === lookupName(facility.name));
    const sameLocation = sameName.filter(row => coordinate(row[config.lat], 90) === facility.lat && coordinate(row[config.lon], 180) === facility.lon);
    const row = sameLocation[0] ?? (sameName.length === 1 ? sameName[0] : undefined) ?? (candidates.length === 1 ? candidates[0] : undefined);
    if (!row) {
      review.push({ id: facility.id, issue: candidates.length ? 'Ambiguous source rows' : 'Published source row absent', key, candidateCount: candidates.length });
      continue;
    }
    const result = compare(facility, {
      name: row[config.name], lat: coordinate(row[config.lat], 90), lon: coordinate(row[config.lon], 180),
    }, { key, ...config.evidence(row) });
    if (Object.keys(result.changes).length) review.push(result);
    else unchanged++;
  }
  return { inputRows: rows.length, selected: selected.length, unchanged, review };
}

const report = {};
for (const [key, filename] of Object.entries(values)) {
  if (key === 'help') continue;
  const bytes = await readFile(filename);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const result = key === 'faa' ? inspectFaa(bytes) : inspectFacilities(bytes, facilitySources[key]);
  report[key] = { sha256, ...result };
}
console.log(JSON.stringify(report, null, 2));
