import {
  coverage,
  launchThresholds,
  aircraft,
  lookupModel,
  scenarios,
  events,
  evidenceCoverage,
  pathwayContexts,
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
if ((evidenceCoverage.anatomy['documented-assembly'] ?? 0) < 2)
  missing.push('Two documented assembly layouts');
if (evidenceCoverage.replayableCases < 2)
  missing.push('Two historical replays');
if (scenarios.some((row) => row.mode === 'representative' &&
    !pathwayContexts.some((context) => context.id === row.id && context.aircraft.length > 0)))
  missing.push('Aircraft context for every representative pathway');
if (missing.length)
  throw new Error(`Launch criteria incomplete:\n${missing.join('\n')}`);
console.log(
  'All machine-checkable launch coverage criteria met. Complete the manual review in docs/RELEASE.md.',
);
console.table(coverage);
