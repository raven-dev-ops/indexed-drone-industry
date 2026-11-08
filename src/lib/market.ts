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
