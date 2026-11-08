import { expect, it } from 'vitest';
import { comparableMarketShares } from '../../src/lib/market';
import type { MarketIndicator } from '../../src/lib/schema';

const first: MarketIndicator = {
  id: 'first',
  name: 'First vendor',
  summary: 'A reported unit share',
  kind: 'share',
  basis: 'unit-sales',
  geography: 'Japan',
  period: '2025',
  segment: 'Industrial drones',
  subject: 'First',
  value: 20,
  unit: '%',
  denominator: '100 reported sales',
  method: 'Manufacturer survey',
  estimate: false,
  source: {
    title: 'Survey', publisher: 'Association', url: 'https://example.com/survey',
    locator: 'Table 1', accessed: '2026-11-08', rights: 'Citation only',
  },
};
const second = { ...first, id: 'second', name: 'Second vendor', subject: 'Second', value: 43 };

it('orders only named shares from one source and measurement cohort', () => {
  const incompatible: MarketIndicator[] = [
    { ...second, period: '2024' },
    { ...second, geography: 'Global' },
    { ...second, segment: 'Consumer drones' },
    { ...second, basis: 'revenue' },
    { ...second, kind: 'registration-share', basis: 'registrations' },
    { ...second, denominator: '90 observed units' },
    { ...second, method: 'Retail tracking' },
    { ...second, source: { ...second.source, url: 'https://example.com/another-survey' } },
    { ...second, subject: undefined },
    { ...second, qualifier: 'at-least' },
  ];
  expect(comparableMarketShares([first, ...incompatible])).toEqual([]);
  expect(comparableMarketShares([first, second, ...incompatible])).toEqual([[second, first]]);
  expect(comparableMarketShares([first, second, { ...second, id: 'duplicate', value: 45 }])).toEqual([]);
});
