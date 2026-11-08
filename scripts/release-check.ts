import {
  coverage,
  launchThresholds,
  aircraft,
  lookupModel,
  scenarios,
  events,
} from '../src/lib/data.ts';
const missing: string[] = [];
for (const key of Object.keys(
  launchThresholds,
) as (keyof typeof launchThresholds)[]) {
  if (coverage[key] < launchThresholds[key])
    missing.push(`${key}: ${coverage[key]}/${launchThresholds[key]}`);
}
if (
  !aircraft.some(
    (item) =>
      item.id === 'holybro-x500-v2' &&
      lookupModel(item)?.fidelity === 'documented-assembly',
  )
)
  missing.push('Flagship assembly');
if (
  !events.some(
    (event) =>
      event.id === 'skydio-battery-2024' &&
      scenarios.some((scenario) => scenario.id === event.scenarioId),
  )
)
  missing.push('Historical case and simulator');
if (missing.length)
  throw new Error(`Launch criteria incomplete:\n${missing.join('\n')}`);
console.log(
  'All machine-checkable launch coverage criteria met. Complete the manual review in docs/RELEASE.md.',
);
console.table(coverage);
