import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The application builds from the committed snapshot. Run this script to refresh
// it deliberately, then review changes to the upstream figures and flags.
const snapshot = new URL('../data/observations.json', import.meta.url);
const accessed = '2026-11-08';
const mineralPeriod = '2025';
const scienceBaseItem = 'https://www.sciencebase.gov/catalog/item/69837e43b66b01367d7ec7c7?format=json';
const usgsRelease = 'https://www.usgs.gov/data/mineral-commodity-summaries-2026-data-release';
const eurostatApi = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/';

const mineralCountries = {
  Argentina: 'AR', Australia: 'AU', Austria: 'AT', Brazil: 'BR', Burma: 'MM',
  Canada: 'CA', Chile: 'CL', China: 'CN', 'Congo (Kinshasa)': 'CD', Germany: 'DE',
  Greece: 'GR', Greenland: 'GL', Guinea: 'GN', India: 'IN', Indonesia: 'ID',
  Ireland: 'IE', Jamaica: 'JM', Japan: 'JP', Kazakhstan: 'KZ',
  'Korea, North': 'KP', 'Korea, Republic of': 'KR', Madagascar: 'MG', Malaysia: 'MY',
  Mali: 'ML', Mexico: 'MX', Mozambique: 'MZ', Nigeria: 'NG', Norway: 'NO',
  Peru: 'PE', Poland: 'PL', Portugal: 'PT', Russia: 'RU', 'Saudi Arabia': 'SA',
  'South Africa': 'ZA', Spain: 'ES',
  'Sri Lanka': 'LK', Tanzania: 'TZ', Thailand: 'TH', Turkey: 'TR',
  Ukraine: 'UA', 'United Arab Emirates': 'AE', 'United States': 'US',
  Vietnam: 'VN', Zambia: 'ZM', Zimbabwe: 'ZW',
};
const refineries = {
  COPPER: {
    layer: 'copper-refinery-production', name: 'Copper refinery production',
    section: 'World Mine and Refinery Production and Reserves',
    detail: 'Refinery production', sourceUnit: 'thousand metric tons',
    unit: 'thousand metric tons of copper content',
  },
  'BAUXITE AND ALUMINA': {
    layer: 'alumina-refinery-production', name: 'Alumina refinery production',
    section: 'World Alumina Refinery and Bauxite Mine Production and Bauxite Reserves',
    detail: 'Alumina, refinery production', sourceUnit: 'thousand metric dry tons',
    unit: 'thousand metric dry tons, calcined equivalent',
  },
};
const commodities = {
  LITHIUM: { layer: 'lithium', name: 'Lithium', unit: 'metric tons of lithium content' },
  'GRAPHITE (NATURAL)': { layer: 'graphite', name: 'Natural graphite', unit: 'metric tons' },
  'RARE EARTHS': { layer: 'rare-earths', name: 'Rare earths', unit: 'metric tons of rare-earth-oxide equivalent' },
};

// Reuse scope follows the official Eurostat notice. Use the EU and EFTA series
// and discard regional aggregates and reporting countries outside this scope.
const europeanReporters = new Set(
  'AT BE BG CH CY CZ DE DK EE EL ES FI FR HR HU IE IS IT LI LT LU LV MT NL NO PL PT RO SE SI SK'.split(' '),
);

async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error('Upstream HTTP ' + response.status + ' at ' + url);
  return response;
}

function csvRows(text) {
  const rows = [];
  let row = [];
  let consumed = 0;
  // Fields may contain quoted commas, escaped quotes, or embedded newlines.
  for (const match of text.matchAll(/(^|,|\r?\n)(?:"((?:[^"]|"")*)"|([^,"\r\n]*))/g)) {
    if (match.index !== consumed) throw new Error('Malformed USGS CSV near offset ' + consumed);
    consumed += match[0].length;
    if (match[1].includes('\n')) {
      if (row.some(Boolean)) rows.push(row);
      row = [];
    }
    row.push(match[2] === undefined ? match[3] : match[2].replaceAll('""', '"'));
  }
  if (consumed !== text.length) throw new Error('Truncated USGS CSV');
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

async function mineralObservations() {
  const item = await (await request(scienceBaseItem)).json();
  const file = item.files.find(candidate => candidate.name === 'MCS2026_Commodities_Data.csv');
  if (!file) throw new Error('Missing USGS 2026 commodity CSV');
  const bytes = await (await request(file.downloadUri)).arrayBuffer();
  const [header, ...rows] = csvRows(new TextDecoder('windows-1252').decode(bytes));
  if (header.slice(0, 10).join(',') !==
      'MCS chapter,Section,Commodity,Country,Statistics,Statistics_detail,Unit,Year,Value,Notes') {
    throw new Error('Unexpected USGS commodity CSV columns');
  }

  const observations = [];
  for (const [chapter, section, , reporter, statistic, detail, unit, year, raw, notes] of rows) {
    const commodity = section === 'World Mine Production and Reserves' ? commodities[chapter] : undefined;
    const candidate = refineries[chapter];
    const refinery = candidate?.section === section && candidate.detail === detail ? candidate : undefined;
    if ((!commodity && !refinery) || year !== mineralPeriod) continue;
    if (reporter === 'Other countries' || reporter === 'World total') continue;
    if (!mineralCountries[reporter]) throw new Error('Unmapped USGS reporter ' + reporter);
    if (unit !== (refinery?.sourceUnit ?? 'metric tons')) throw new Error('Unexpected USGS unit ' + unit);
    const numeric = raw.replaceAll(',', '').trim();
    // In these USGS chapters an em dash means zero. W, NA, and s denote
    // withheld, unavailable, or unspecified small reserves respectively.
    const isZero = numeric === '—' || numeric === '\u0097';
    if (!isZero && !/^\d+(?:\.\d+)?$/.test(numeric)) continue;
    const suffix = statistic === 'Production' ? 'production' : 'reserves';
    if (statistic !== 'Production' && statistic !== 'Reserves') throw new Error('Unexpected USGS statistic ' + statistic);
    const qualifier = isZero ? 'USGS marks this value as zero.'
      : notes.includes('Estimated') ? 'USGS estimate.' : '';
    const metric = refinery ? 'refinery production' : suffix === 'production' ? 'mine production' : 'reserves';
    observations.push({
      country: mineralCountries[reporter],
      layer: refinery?.layer ?? commodity.layer + '-' + suffix,
      name: refinery?.name ?? commodity.name + ' ' + metric,
      year,
      value: isZero ? 0 : Number(numeric),
      unit: refinery?.unit ?? commodity.unit,
      source: {
        ...(refinery ? { id: 'usgs-mcs-2026' } : {}),
        title: 'Mineral Commodity Summaries 2026 Data Release',
        publisher: 'U.S. Geological Survey',
        url: usgsRelease,
        locator: [file.name, chapter, section, reporter, year + ' ' + metric, qualifier].filter(Boolean).join(' / '),
        accessed,
        rights: 'USGS data release marked CC0 1.0 Universal.',
      },
    });
  }
  return observations;
}

async function europeanObservations({ table, period, filters, layer, name, unit, method }) {
  const query = new URLSearchParams({ lang: 'en', time: period, ...filters });
  const data = await (await request(eurostatApi + table + '?' + query)).json();
  const geoPosition = data.id.indexOf('geo');
  if (geoPosition === -1 || data.size.some((size, index) => index !== geoPosition && size !== 1)) {
    throw new Error('Unexpected Eurostat series dimensions for ' + table);
  }

  const observations = [];
  for (const [reporter, position] of Object.entries(data.dimension.geo.category.index)) {
    if (!europeanReporters.has(reporter)) continue;
    const value = data.value?.[position];
    const flag = data.status?.[position];
    if (!Number.isFinite(value) || flag?.includes('C')) continue;
    const qualifier = flag ? 'Eurostat observation flag: ' + (data.extension.status?.label?.[flag] ?? flag) + '.' : '';
    observations.push({
      country: reporter === 'EL' ? 'GR' : reporter,
      layer,
      name,
      year: period,
      value,
      unit,
      source: {
        title: data.label,
        publisher: 'Eurostat',
        url: 'https://ec.europa.eu/eurostat/databrowser/view/' + table + '/default/table',
        locator: [table, reporter, period, method, qualifier].filter(Boolean).join(' / '),
        accessed,
        rights: 'Eurostat statistical data reused with attribution. Filtered to EU and EFTA reporters and normalized by Indexed Drone Industry. Eurostat is not responsible for this adaptation.',
      },
    });
  }
  return observations;
}

const groups = await Promise.all([
  mineralObservations(),
  europeanObservations({
    table: 'nrg_pc_205',
    period: '2025-S2',
    filters: { nrg_cons: 'MWH500-1999', unit: 'KWH', tax: 'X_VAT', currency: 'EUR' },
    layer: 'electricity',
    name: 'Non-household electricity price',
    unit: 'EUR/kWh',
    method: 'Annual consumption band IC (500–1,999 MWh); excluding VAT and other recoverable taxes and levies',
  }),
  europeanObservations({
    table: 'lc_lci_lev',
    period: '2025',
    filters: { nace_r2: 'C', unit: 'EUR', lcstruct: 'D1_D4_MD5' },
    layer: 'labour',
    name: 'Manufacturing hourly labour cost',
    unit: 'EUR/hour',
    method: 'NACE Rev. 2 section C, compensation of employees plus taxes minus subsidies',
  }),
]);
const rows = groups.flat().sort((left, right) =>
  left.layer.localeCompare(right.layer) || left.country.localeCompare(right.country),
);
const counts = Object.groupBy(rows, row => row.layer);
const keys = new Set(rows.map(row => row.layer + '/' + row.country));
if (Object.keys(counts).length !== 10 || keys.size !== rows.length ||
    rows.some(row => !Number.isFinite(row.value) || row.value < 0)) {
  throw new Error('Invalid country observations: check layer coverage, values and duplicate reporting countries');
}

const json = JSON.stringify(rows, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (await readFile(snapshot, 'utf8') !== json) {
    throw new Error('Upstream snapshot differs from data/observations.json. Review before refreshing.');
  }
} else {
  await writeFile(snapshot, json);
}
console.log(Object.fromEntries(Object.entries(counts).map(([layer, values]) => [layer, values.length])));
console.log(rows.length + ' observations: ' + fileURLToPath(snapshot));
