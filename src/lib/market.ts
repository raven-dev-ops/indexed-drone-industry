import type { MarketIndicator } from './schema';

export function marketMeasure(row: MarketIndicator): string {
  if (row.kind === 'share') {
    if (row.basis === 'unit-sales') return 'Unit-sales share';
    if (row.basis === 'shipment-units') return 'Unit-shipment share';
    return 'Revenue share';
  }
  const labels = {
    shipment: 'Aircraft shipments',
    sales: 'Aircraft sales',
    'registration-share': 'Registration share',
    registration: 'Registrations',
    fleet: 'Fleet size',
    deployment: 'Delivery activity',
  };
  return labels[row.kind];
}

export function marketValue(row: MarketIndicator): string {
  const qualifiers = { over: 'Over ', 'at-least': 'At least ', about: 'About ' };
  const prefix = row.qualifier ? qualifiers[row.qualifier] : '';
  const value = row.value.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return `${prefix}${value}${row.unit === '%' ? '%' : ` ${row.unit}`}`;
}

export function comparableMarketShares(entries: MarketIndicator[]): MarketIndicator[][] {
  const groups = new Map<string, MarketIndicator[]>();
  for (const row of entries) {
    if (
      !['share', 'registration-share'].includes(row.kind) ||
      !row.subject || !row.basis || !row.denominator || !row.method ||
      row.qualifier === 'over' || row.qualifier === 'at-least'
    ) continue;
    const key = JSON.stringify([
      row.kind, row.basis, row.geography, row.segment, row.period, row.denominator,
      row.method, row.source.publisher, row.source.url, row.estimate,
    ]);
    const cohort = groups.get(key) ?? [];
    cohort.push(row);
    groups.set(key, cohort);
  }
  return [...groups.values()]
    .filter(rows => rows.length > 1 &&
      new Set(rows.map(row => row.subject?.toLowerCase())).size === rows.length)
    .map(rows => rows.sort((left, right) => right.value - left.value || left.name.localeCompare(right.name)))
    .sort((left, right) => right[0].period.localeCompare(left[0].period) ||
      left[0].geography.localeCompare(right[0].geography));
}
